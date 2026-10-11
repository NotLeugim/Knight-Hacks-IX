"""
backend/app/services/summary.py

Service layer for generating end-of-mission shift summaries (issue #15 / AI-2).
Builds mission facts, enforces all-clear rule, invokes Gemini with strict
guidelines and fallback to deterministic templates, caches summaries in memory,
and processes MISSION_COMPLETED replay events.
"""

import asyncio
from collections import Counter
import json
import logging
import os
from pathlib import Path
from typing import Any

import pandas as pd
from sqlalchemy import text

from app.db.database import engine
from app.services.analytics import get_mission_confidence, load_raw_data
from app.services.gemini import get_client

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "data" / "SPOT_KnightHacks_Challenge_Kit Part One" / "02_DATA"

SEVERITY_RANK: dict[str, int] = {
    "CRITICAL": 4,
    "HIGH": 3,
    "MEDIUM": 2,
    "LOW": 1,
}

# In-memory summary cache
_summary_cache: dict[str, dict[str, Any]] = {}
_cached_locations_assets: tuple[dict[str, str], dict[str, str]] | None = None


def clear_summary_cache() -> None:
    """Clears the in-memory mission summary cache."""
    global _summary_cache, _cached_locations_assets
    _summary_cache.clear()
    _cached_locations_assets = None


def load_locations_and_assets() -> tuple[dict[str, str], dict[str, str]]:
    """
    Loads location and asset names from the database or CSV files.
    Returns (locations_map, assets_map) where keys are IDs and values are human-readable names.
    """
    global _cached_locations_assets
    if _cached_locations_assets is not None:
        return _cached_locations_assets

    force_csv = os.getenv("ANALYTICS_FORCE_CSV") == "1"
    locations_df = None
    assets_df = None

    if not force_csv and engine is not None:
        try:
            with engine.connect() as conn:
                locations_df = pd.read_sql(text("SELECT * FROM locations"), conn)
                assets_df = pd.read_sql(text("SELECT * FROM assets"), conn)
            if locations_df.empty or assets_df.empty:
                logger.warning("Locations/Assets tables in DB are empty; falling back to CSV.")
                locations_df = None
                assets_df = None
        except Exception as exc:
            logger.warning("Failed to load locations/assets from DB (%s); falling back to CSV.", exc)
            locations_df = None
            assets_df = None

    if locations_df is None or assets_df is None:
        locations_csv = DATA_DIR / "locations.csv"
        assets_csv = DATA_DIR / "assets.csv"
        if not (locations_csv.exists() and assets_csv.exists()):
            msg = f"Locations/Assets CSV files not found in {DATA_DIR}"
            logger.error(msg)
            raise FileNotFoundError(msg)
        locations_df = pd.read_csv(locations_csv)
        assets_df = pd.read_csv(assets_csv)

    loc_map: dict[str, str] = dict(zip(locations_df["location_id"], locations_df["location_name"]))
    asset_map: dict[str, str] = dict(zip(assets_df["asset_id"], assets_df["asset_name"]))

    _cached_locations_assets = (loc_map, asset_map)
    return _cached_locations_assets


def build_mission_facts(mission_id: str) -> dict[str, Any] | None:
    """
    Assembles comprehensive structured facts for a mission.
    Returns None if mission_id is unknown.
    """
    missions_df, actions_df, anomalies_df, _ = load_raw_data()
    matched_mission = missions_df[missions_df["mission_id"] == mission_id]
    if matched_mission.empty:
        return None

    m_row = matched_mission.iloc[0]
    loc_map, asset_map = load_locations_and_assets()

    m_actions = actions_df[actions_df["mission_id"] == mission_id].sort_values(by="sequence")
    total_actions = int(len(m_actions))

    failed_actions_list: list[dict[str, Any]] = []
    for _, a_row in m_actions[m_actions["status"] != "SUCCESS"].iterrows():
        loc_id = str(a_row["location_id"])
        failure_type = a_row.get("failure_type")
        if pd.isna(failure_type) or failure_type == "":
            failure_type = None

        failed_actions_list.append({
            "actionId": str(a_row["action_id"]),
            "sequence": int(a_row["sequence"]),
            "timestamp": str(a_row["timestamp"]),
            "locationId": loc_id,
            "locationName": loc_map.get(loc_id, loc_id),
            "actionType": str(a_row["action_type"]),
            "failureType": failure_type,
            "batteryPct": int(a_row["battery_pct"]),
        })

    m_anomalies = anomalies_df[anomalies_df["mission_id"] == mission_id]
    anomalies_list: list[dict[str, Any]] = []
    for _, anom_row in m_anomalies.iterrows():
        a_id = str(anom_row["asset_id"])
        l_id = str(anom_row["location_id"])
        anomalies_list.append({
            "anomalyId": str(anom_row["anomaly_id"]),
            "actionId": str(anom_row["action_id"]),
            "severity": str(anom_row["severity"]),
            "anomalyType": str(anom_row["anomaly_type"]),
            "operatorReviewRequired": bool(anom_row["operator_review_required"]),
            "assetId": a_id,
            "assetName": asset_map.get(a_id, a_id),
            "locationName": loc_map.get(l_id, l_id),
            "description": str(anom_row["description"]),
        })

    confidence = get_mission_confidence(mission_id)

    return {
        "missionId": mission_id,
        "reportedStatus": str(m_row["mission_status"]),
        "config": str(m_row["configuration_version"]),
        "startTime": str(m_row["start_time"]),
        "endTime": str(m_row["end_time"]),
        "totalActions": total_actions,
        "failedActions": failed_actions_list,
        "anomalies": anomalies_list,
        "confidence": confidence,
    }


def get_anomaly_next_step(anomaly_type: str) -> str:
    """Returns a deterministic plain-language next step recommendation."""
    t = anomaly_type.lower()
    if "vibration" in t:
        return "Schedule a vibration check."
    if "temperature" in t or "thermal" in t:
        return "Have a technician check for overheating."
    if "gauge" in t or "reading" in t:
        return "Verify the gauge by hand."
    if "visual" in t or "defect" in t:
        return "Inspect it in person."
    if "nav" in t or "obstruction" in t or "signal" in t or "degradation" in t:
        return "Check the route, markers, and signal in that area."
    return "Perform a manual inspection."


FAILURE_TYPE_MAP: dict[str, str] = {
    "LOCALIZATION_FAILURE": "lost localization",
    "SENSOR_TIMEOUT": "sensor timeout",
    "SIGNAL_NOISE": "signal noise",
    "READING_UNRELIABLE": "unreliable reading",
    "TARGET_NOT_DETECTED": "target not detected",
    "COMMUNICATION_LOSS": "communication loss",
    "PATH_BLOCKED": "path blocked",
    "OBSTACLE_DETECTION": "obstacle detected",
}


def format_failure_type(ft: str | None) -> str:
    if not ft:
        return "action failure"
    return FAILURE_TYPE_MAP.get(str(ft).upper(), str(ft).replace("_", " ").lower())


def build_template_summary(facts: dict[str, Any]) -> list[str]:
    """
    Constructs a deterministic, operator-friendly 3-bullet summary from mission facts.
    Used when Gemini is unavailable, errors, or fails output validation.
    """
    total_actions = facts["totalActions"]
    failed_actions = facts["failedActions"]
    anomalies = facts["anomalies"]
    confidence_score = facts["confidence"]["score"] if facts.get("confidence") else 100
    reported_status = facts["reportedStatus"]

    sorted_anomalies: list[dict[str, Any]] = []
    # Bullet 1: Most severe anomaly (operator review required first)
    if anomalies:
        sorted_anomalies = sorted(
            anomalies,
            key=lambda a: (
                1 if a["operatorReviewRequired"] else 0,
                SEVERITY_RANK.get(a["severity"], 0),
            ),
            reverse=True,
        )
        top = sorted_anomalies[0]
        sev = top["severity"]
        plain_type = top["anomalyType"].replace("_", " ").lower()
        asset = top["assetName"]
        loc = top["locationName"]
        step = get_anomaly_next_step(top["anomalyType"])
        review_note = " requiring operator review" if top["operatorReviewRequired"] else ""
        bullet_1 = f"- {sev} {plain_type} detected on {asset} in {loc}{review_note}. {step}"
    else:
        # No anomalies: describe failed actions
        if failed_actions:
            first_fail = failed_actions[0]
            ft = format_failure_type(first_fail.get("failureType"))
            loc = first_fail["locationName"]
            bullet_1 = f"- Action failure ({ft}) occurred in {loc}; check route and sensor conditions."
        else:
            bullet_1 = "- All clear, no anomalies detected."

    # Bullet 2: Failed actions & reported status comparison
    if failed_actions:
        types = [
            a["failureType"].upper() if a.get("failureType") else a["actionType"].upper()
            for a in failed_actions
        ]
        counts = Counter(types)
        top_type, top_count = counts.most_common(1)[0]

        if top_count > 1:
            # Only say "most common" when one failure type occurs more than once
            top_locs = [
                a["locationName"]
                for a in failed_actions
                if (a.get("failureType") and a["failureType"].upper() == top_type)
                or (not a.get("failureType") and a["actionType"].upper() == top_type)
            ]
            common_loc = Counter(top_locs).most_common(1)[0][0]
            plain_type = format_failure_type(top_type)
            fail_clause = f"most common: {plain_type} at {common_loc}"
        else:
            # If every failure type is different, list them in plain words with locations
            items = [
                f"{format_failure_type(a.get('failureType'))} at {a['locationName']}"
                for a in failed_actions
            ]
            fail_clause = ", ".join(items)

        fail_info = f"{len(failed_actions)} of {total_actions} actions failed ({fail_clause})"
        if reported_status == "COMPLETED":
            bullet_2 = f"- {fail_info}, even though the mission reported COMPLETED."
        else:
            bullet_2 = f"- {fail_info}; mission reported FAILED."
    else:
        bullet_2 = f"- All {total_actions} actions completed successfully."

    # Bullet 3: Remaining anomalies & confidence score
    if not anomalies or len(anomalies) <= 1:
        bullet_3 = f"- No other anomalies. Mission confidence score: {confidence_score}/100."
    else:
        other_anomalies_count = len(anomalies) - 1
        other_review_count = sum(1 for a in sorted_anomalies[1:] if a["operatorReviewRequired"])
        plural = "anomaly remains" if other_anomalies_count == 1 else "anomalies remain"

        if other_review_count > 0:
            review_phrase = (
                f" ({other_review_count} needs operator review)"
                if other_review_count == 1
                else f" ({other_review_count} need operator review)"
            )
        else:
            review_phrase = ""

        bullet_3 = (
            f"- {other_anomalies_count} other {plural}{review_phrase}. "
            f"Mission confidence score: {confidence_score}/100."
        )

    return [bullet_1, bullet_2, bullet_3]


def parse_and_validate_bullets(text: str) -> list[str] | None:
    """
    Validates Gemini output.
    Extracts lines starting with '- ' or '* ', normalizes to '- ',
    and checks that there are exactly 3 non-empty bullets.
    """
    bullets = []
    for line in text.strip().splitlines():
        line = line.strip()
        if line.startswith(("- ", "* ")):
            cleaned = "- " + line[2:].strip()
            if len(cleaned) > 2:
                bullets.append(cleaned)
    if len(bullets) == 3:
        return bullets
    return None


async def call_gemini_for_summary(facts: dict[str, Any]) -> str:
    """
    Calls the Gemini API with structured facts and instructions.
    Protected by a 15-second timeout.
    """
    client = get_client()

    prompt = (
        "You are an operational diagnostic assistant for plant operators. "
        "Review the following mission telemetry facts and output EXACTLY 3 markdown bullets. "
        "Rules:\n"
        "- Return ONLY the 3 bullets, each starting with '- '.\n"
        "- Each bullet must be under 35 words, written in plain language for non-technical operators.\n"
        "- Do not include headers, introductions, or closing remarks.\n"
        "- Priority order: (1) Most severe unresolved anomalies (CRITICAL/HIGH, review required first) with asset, location, and concrete next step; "
        "(2) Failed actions, noting explicitly if the mission reported COMPLETED; "
        "(3) Remaining anomalies and overall confidence score.\n"
        "- Ground all facts in the JSON data; do not invent assets, locations, or numbers.\n\n"
        f"Mission Facts JSON:\n{json.dumps(facts, indent=2)}"
    )

    response = await asyncio.wait_for(
        client.aio.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt,
        ),
        timeout=15.0,
    )
    return response.text


async def generate_mission_summary_async(
    mission_id: str, regenerate: bool = False
) -> dict[str, Any]:
    """
    Generates a shift summary for the specified mission.
    Uses in-memory cache unless regenerate=True.
    """
    global _summary_cache
    if not regenerate and mission_id in _summary_cache:
        return _summary_cache[mission_id]

    facts = build_mission_facts(mission_id)
    if facts is None:
        raise KeyError(f"Mission '{mission_id}' not found")

    total_actions = facts["totalActions"]
    failed_actions = facts["failedActions"]
    anomalies = facts["anomalies"]
    confidence_score = facts["confidence"]["score"] if facts.get("confidence") else 100
    reported_status = facts["reportedStatus"]

    # ALL CLEAR rule: ONLY if zero failed actions AND zero anomalies
    if len(failed_actions) == 0 and len(anomalies) == 0:
        bullets = [
            "- All clear, no anomalies detected.",
            f"- All {total_actions} actions completed successfully.",
            "- No operator follow-up needed for this mission.",
        ]
        result = {
            "missionId": mission_id,
            "reportedStatus": reported_status,
            "status": "all_clear",
            "bullets": bullets,
            "summaryMarkdown": "\n".join(bullets),
            "generatedBy": "rule",
            "confidence": confidence_score,
            "facts": facts,
        }
        _summary_cache[mission_id] = result
        return result

    # Try Gemini generation
    gemini_bullets = None
    if os.environ.get("GEMINI_API_KEY"):
        try:
            raw_text = await call_gemini_for_summary(facts)
            gemini_bullets = parse_and_validate_bullets(raw_text)
            if not gemini_bullets:
                logger.warning(
                    "Gemini returned invalid bullet structure for %s. Falling back to template.",
                    mission_id,
                )
        except Exception as exc:
            logger.warning(
                "Gemini summary generation failed or timed out for %s (%s). Falling back to template.",
                mission_id,
                exc,
            )

    if gemini_bullets:
        bullets = gemini_bullets
        generated_by = "gemini"
    else:
        bullets = build_template_summary(facts)
        generated_by = "template"

    result = {
        "missionId": mission_id,
        "reportedStatus": reported_status,
        "status": "issues",
        "bullets": bullets,
        "summaryMarkdown": "\n".join(bullets),
        "generatedBy": generated_by,
        "confidence": confidence_score,
        "facts": facts,
    }
    _summary_cache[mission_id] = result
    return result


def generate_mission_summary_sync(mission_id: str, regenerate: bool = False) -> dict[str, Any]:
    """Synchronous wrapper for generate_mission_summary_async."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        # If running inside an existing loop (e.g. FastAPI async thread)
        import nest_asyncio  # noqa: F401 - if available
        # or create task
        # Typically called from async endpoints via generate_mission_summary_async
        return asyncio.run(generate_mission_summary_async(mission_id, regenerate))
    else:
        return asyncio.run(generate_mission_summary_async(mission_id, regenerate))


async def handle_replay_event(event: dict[str, Any]) -> dict[str, Any] | None:
    """
    Processes a replay telemetry event.
    If event_type == 'MISSION_COMPLETED', generates or returns the cached summary
    for event['mission_id'], including details.status as reportedStatusAtEnd.
    For any other event type, returns None.
    """
    if event.get("event_type") != "MISSION_COMPLETED":
        return None

    mission_id = event.get("mission_id")
    if not mission_id:
        return None

    summary = await generate_mission_summary_async(mission_id)
    summary_copy = dict(summary)
    reported_status_at_end = event.get("details", {}).get("status")
    summary_copy["reportedStatusAtEnd"] = reported_status_at_end
    return summary_copy


async def get_shift_handoff_summaries(limit: int = 3) -> list[dict[str, Any]]:
    """
    Returns shift summary objects for the most recent missions by end time (newest first).
    """
    missions_df, _, _, _ = load_raw_data()
    missions_copy = missions_df.copy()
    missions_copy["end_time"] = pd.to_datetime(missions_copy["end_time"])
    sorted_missions = missions_copy.sort_values(by="end_time", ascending=False)

    recent_ids = sorted_missions["mission_id"].head(limit).tolist()
    summaries = []
    for m_id in recent_ids:
        s = await generate_mission_summary_async(str(m_id))
        summaries.append(s)

    return summaries
