"""
backend/app/services/analytics.py

Service layer for computing fleet analytics and mission confidence scores (issue #3 / DATA-2).
Computes:
1. Battery reliability curves across 7 half-open battery percentage bands.
2. Mission paradox: reported completion vs. actual action failures.
3. Configuration comparison: V1 vs. V2 fleet performance and equal-battery analysis.
4. Confidence scores per mission and fleet average.
"""

import logging
import os
from pathlib import Path
from typing import Any

import pandas as pd
from sqlalchemy import text

from app.db.database import engine

logger = logging.getLogger(__name__)

# Repository data directory resolution (matches seed_db.py)
REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "data" / "SPOT_KnightHacks_Challenge_Kit Part One" / "02_DATA"

# 7 half-open battery bands: minPct <= battery_pct < maxPct
BATTERY_BANDS: list[dict[str, Any]] = [
    {"band": "<20%", "minPct": 0, "maxPct": 20},
    {"band": "20-30%", "minPct": 20, "maxPct": 30},
    {"band": "30-40%", "minPct": 30, "maxPct": 40},
    {"band": "40-50%", "minPct": 40, "maxPct": 50},
    {"band": "50-60%", "minPct": 50, "maxPct": 60},
    {"band": "60-70%", "minPct": 60, "maxPct": 70},
    {"band": "70%+", "minPct": 70, "maxPct": 101},
]

# Configurable confidence score deduction weights
ANOMALY_WEIGHTS: dict[str, int] = {
    "CRITICAL": 15,
    "HIGH": 10,
    "MEDIUM": 5,
    "LOW": 2,
}
FAILED_ACTION_WEIGHT: int = 10
STARTING_CONFIDENCE: int = 100
MIN_CONFIDENCE: int = 0
MAX_CONFIDENCE: int = 100

# Module-level cache
_cached_analytics: dict[str, Any] | None = None
_cached_data_frames: tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, str] | None = None


def clear_analytics_cache() -> None:
    """Clears the cached analytics payloads and dataframes."""
    global _cached_analytics, _cached_data_frames
    _cached_analytics = None
    _cached_data_frames = None


def load_raw_data() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, str]:
    """
    Loads missions, actions, and anomalies from either the database or CSVs.

    1. If app.db.database.engine is not None and ANALYTICS_FORCE_CSV is not "1",
       reads tables with pandas.read_sql. If that fails or returns empty tables,
       logs a warning and falls back to step 2.
    2. Otherwise reads the CSVs from data/SPOT_KnightHacks_Challenge_Kit Part One/02_DATA/.
    """
    force_csv = os.getenv("ANALYTICS_FORCE_CSV") == "1"

    if not force_csv and engine is not None:
        try:
            with engine.connect() as conn:
                missions_df = pd.read_sql(text("SELECT * FROM missions"), conn)
                actions_df = pd.read_sql(text("SELECT * FROM actions"), conn)
                anomalies_df = pd.read_sql(text("SELECT * FROM anomalies"), conn)

            if missions_df.empty or actions_df.empty:
                logger.warning("Database tables are empty; falling back to CSV files.")
            else:
                return missions_df, actions_df, anomalies_df, "database"
        except Exception as exc:
            logger.warning(
                "Failed to read analytics from database (%s); falling back to CSV files.",
                exc,
            )

    # Fall back to CSV files
    missions_csv = DATA_DIR / "missions.csv"
    actions_csv = DATA_DIR / "actions.csv"
    anomalies_csv = DATA_DIR / "anomalies.csv"

    if not (missions_csv.exists() and actions_csv.exists() and anomalies_csv.exists()):
        msg = f"Analytics CSV files not found in {DATA_DIR}"
        logger.error(msg)
        raise FileNotFoundError(msg)

    missions_df = pd.read_csv(missions_csv)
    actions_df = pd.read_csv(actions_csv)
    anomalies_df = pd.read_csv(anomalies_csv)

    return missions_df, actions_df, anomalies_df, "csv"


def compute_battery_reliability(actions_df: pd.DataFrame) -> list[dict[str, Any]]:
    """
    Calculates total actions, failed actions, and failure rate percentage across
    seven half-open battery percentage bands (minPct <= battery_pct < maxPct).
    Failure is defined as status != 'SUCCESS'.
    """
    df = actions_df.copy()
    df["battery_pct"] = pd.to_numeric(df["battery_pct"], errors="coerce")

    reliability_list = []
    for band_info in BATTERY_BANDS:
        band = band_info["band"]
        min_pct = band_info["minPct"]
        max_pct = band_info["maxPct"]

        sub = df[(df["battery_pct"] >= min_pct) & (df["battery_pct"] < max_pct)]
        total = int(len(sub))
        failed = int(len(sub[sub["status"] != "SUCCESS"]))
        rate = round((failed / total) * 100, 1) if total > 0 else 0.0

        reliability_list.append({
            "band": band,
            "minPct": min_pct,
            "maxPct": max_pct,
            "actions": total,
            "failed": failed,
            "failureRatePct": rate,
        })

    return reliability_list


def compute_mission_paradox(
    missions_df: pd.DataFrame, actions_df: pd.DataFrame
) -> dict[str, Any]:
    """
    Identifies missions reported as COMPLETED despite containing failed actions.
    """
    missions_list = []
    reported_completed = 0
    completed_with_failures = 0
    completed_clean = 0
    reported_failed = 0

    for _, row in missions_df.iterrows():
        m_id = str(row["mission_id"])
        reported_status = str(row["mission_status"])
        config = str(row["configuration_version"])

        m_actions = actions_df[actions_df["mission_id"] == m_id]
        succeeded = int(len(m_actions[m_actions["status"] == "SUCCESS"]))
        failed = int(len(m_actions[m_actions["status"] != "SUCCESS"]))

        missions_list.append({
            "missionId": m_id,
            "reportedStatus": reported_status,
            "config": config,
            "actionsSucceeded": succeeded,
            "actionsFailed": failed,
        })

        if reported_status == "COMPLETED":
            reported_completed += 1
            if failed > 0:
                completed_with_failures += 1
            else:
                completed_clean += 1
        elif reported_status == "FAILED":
            reported_failed += 1

    return {
        "summary": {
            "reportedCompleted": reported_completed,
            "completedWithFailures": completed_with_failures,
            "completedClean": completed_clean,
            "reportedFailed": reported_failed,
        },
        "missions": missions_list,
    }


def compute_config_comparison(
    missions_df: pd.DataFrame, actions_df: pd.DataFrame
) -> dict[str, Any]:
    """
    Compares baseline (V1) and improved (V2) hardware and software configurations.
    Includes equal-battery comparison (>50% battery) and context note.
    """
    actions_copy = actions_df.copy()
    actions_copy["battery_pct"] = pd.to_numeric(
        actions_copy["battery_pct"], errors="coerce"
    )

    comparison: dict[str, Any] = {}

    for v in ["V1", "V2"]:
        v_missions = missions_df[missions_df["configuration_version"] == v]
        v_actions = actions_copy[actions_copy["configuration_version"] == v]

        m_total = int(len(v_missions))
        m_comp = int(len(v_missions[v_missions["mission_status"] == "COMPLETED"]))
        m_pct = round((m_comp / m_total) * 100, 1) if m_total > 0 else 0.0

        a_total = int(len(v_actions))
        a_succ = int(len(v_actions[v_actions["status"] == "SUCCESS"]))
        a_pct = round((a_succ / a_total) * 100, 1) if a_total > 0 else 0.0

        min_bat = int(v_actions["battery_pct"].min()) if not v_actions.empty else 0

        comparison[v] = {
            "missions": m_total,
            "missionCompletionPct": m_pct,
            "actions": a_total,
            "actionSuccessPct": a_pct,
            "minBatteryPct": min_bat,
        }

    # equalBattery: only actions where battery_pct > 50
    eq_v1 = actions_copy[
        (actions_copy["configuration_version"] == "V1")
        & (actions_copy["battery_pct"] > 50)
    ]
    eq_v2 = actions_copy[
        (actions_copy["configuration_version"] == "V2")
        & (actions_copy["battery_pct"] > 50)
    ]

    eq_v1_total = int(len(eq_v1))
    eq_v1_succ = int(len(eq_v1[eq_v1["status"] == "SUCCESS"]))
    eq_v1_pct = round((eq_v1_succ / eq_v1_total) * 100, 1) if eq_v1_total > 0 else 0.0

    eq_v2_total = int(len(eq_v2))
    eq_v2_succ = int(len(eq_v2[eq_v2["status"] == "SUCCESS"]))
    eq_v2_pct = round((eq_v2_succ / eq_v2_total) * 100, 1) if eq_v2_total > 0 else 0.0

    comparison["equalBattery"] = {
        "aboveBatteryPct": 50,
        "V1": {
            "actions": eq_v1_total,
            "actionSuccessPct": eq_v1_pct,
        },
        "V2": {
            "actions": eq_v2_total,
            "actionSuccessPct": eq_v2_pct,
        },
    }
    comparison["note"] = (
        "V2 missions never ran below 50% battery, so part of V2's higher success "
        "rate reflects battery level, not only the configuration."
    )

    return comparison


def compute_confidence(
    missions_df: pd.DataFrame, actions_df: pd.DataFrame, anomalies_df: pd.DataFrame
) -> dict[str, Any]:
    """
    Computes confidence score per mission:
      score = 100 - (10 * failed_actions) - sum(anomaly_weights), clamped 0..100 integer.
    Also computes fleetAverage (1 decimal place).
    """
    all_scores: list[int] = []
    missions_confidence: list[dict[str, Any]] = []

    for _, row in missions_df.iterrows():
        m_id = str(row["mission_id"])
        m_actions = actions_df[actions_df["mission_id"] == m_id]
        failed_count = int(len(m_actions[m_actions["status"] != "SUCCESS"]))

        m_anomalies = anomalies_df[anomalies_df["mission_id"] == m_id]
        anomaly_count = int(len(m_anomalies))
        anomaly_deduction = int(
            sum(
                ANOMALY_WEIGHTS.get(str(sev).upper(), 0)
                for sev in m_anomalies["severity"]
            )
        )

        raw_score = (
            STARTING_CONFIDENCE
            - (FAILED_ACTION_WEIGHT * failed_count)
            - anomaly_deduction
        )
        score = max(MIN_CONFIDENCE, min(MAX_CONFIDENCE, int(raw_score)))
        all_scores.append(score)

        missions_confidence.append({
            "missionId": m_id,
            "score": score,
            "failedActions": failed_count,
            "anomalyCount": anomaly_count,
            "anomalyDeduction": anomaly_deduction,
        })

    fleet_avg = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0.0

    formula_dict = {
        "start": STARTING_CONFIDENCE,
        "perFailedAction": -FAILED_ACTION_WEIGHT,
        "anomaly": {sev: -weight for sev, weight in ANOMALY_WEIGHTS.items()},
        "min": MIN_CONFIDENCE,
        "max": MAX_CONFIDENCE,
    }

    return {
        "formula": formula_dict,
        "fleetAverage": fleet_avg,
        "missions": missions_confidence,
    }


def compute_mission_confidence_detail(
    mission_id: str,
    missions_df: pd.DataFrame,
    actions_df: pd.DataFrame,
    anomalies_df: pd.DataFrame,
) -> dict[str, Any] | None:
    """
    Computes detailed confidence score and itemized deduction breakdown for one mission.
    Returns None if mission_id is unknown.
    """
    matched = missions_df[missions_df["mission_id"] == mission_id]
    if matched.empty:
        return None

    m_actions = actions_df[actions_df["mission_id"] == mission_id]
    failed_actions = m_actions[m_actions["status"] != "SUCCESS"]
    failed_count = int(len(failed_actions))

    m_anomalies = anomalies_df[anomalies_df["mission_id"] == mission_id]
    anomaly_count = int(len(m_anomalies))
    anomaly_deduction = int(
        sum(
            ANOMALY_WEIGHTS.get(str(sev).upper(), 0)
            for sev in m_anomalies["severity"]
        )
    )

    raw_score = (
        STARTING_CONFIDENCE
        - (FAILED_ACTION_WEIGHT * failed_count)
        - anomaly_deduction
    )
    score = max(MIN_CONFIDENCE, min(MAX_CONFIDENCE, int(raw_score)))

    breakdown: list[dict[str, Any]] = []

    for _, act in failed_actions.iterrows():
        act_id = act.get("action_id", "")
        act_type = act.get("action_type", "")
        reason = f"Failed action: {act_id} ({act_type})" if act_id else "Failed action"
        breakdown.append({
            "reason": reason,
            "points": -FAILED_ACTION_WEIGHT,
        })

    for _, anom in m_anomalies.iterrows():
        anom_id = anom.get("anomaly_id", "")
        sev = str(anom.get("severity", "")).upper()
        anom_type = anom.get("anomaly_type", "")
        deduction = ANOMALY_WEIGHTS.get(sev, 0)
        reason = (
            f"{sev} anomaly: {anom_id} ({anom_type})"
            if anom_id
            else f"{sev} anomaly"
        )
        breakdown.append({
            "reason": reason,
            "points": -deduction,
        })

    return {
        "missionId": mission_id,
        "score": score,
        "failedActions": failed_count,
        "anomalyCount": anomaly_count,
        "anomalyDeduction": anomaly_deduction,
        "breakdown": breakdown,
    }


def get_analytics_payload(force_refresh: bool = False) -> dict[str, Any]:
    """
    Loads data (or uses cache) and returns the full analytics payload for GET /api/analytics.
    """
    global _cached_analytics, _cached_data_frames
    if not force_refresh and _cached_analytics is not None:
        return _cached_analytics

    missions_df, actions_df, anomalies_df, source = load_raw_data()
    _cached_data_frames = (missions_df, actions_df, anomalies_df, source)

    battery_reliability = compute_battery_reliability(actions_df)
    mission_paradox = compute_mission_paradox(missions_df, actions_df)
    config_comparison = compute_config_comparison(missions_df, actions_df)
    confidence = compute_confidence(missions_df, actions_df, anomalies_df)

    payload = {
        "batteryReliability": battery_reliability,
        "missionParadox": mission_paradox,
        "configComparison": config_comparison,
        "confidence": confidence,
        "source": source,
    }
    _cached_analytics = payload
    return payload


def get_mission_confidence(mission_id: str) -> dict[str, Any] | None:
    """
    Returns single mission confidence detail or None if mission is not found.
    """
    global _cached_data_frames
    if _cached_data_frames is None:
        get_analytics_payload()

    assert _cached_data_frames is not None
    missions_df, actions_df, anomalies_df, _ = _cached_data_frames
    return compute_mission_confidence_detail(
        mission_id, missions_df, actions_df, anomalies_df
    )
