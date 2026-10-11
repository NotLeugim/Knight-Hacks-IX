"""
backend/app/services/worker_safety.py

Service layer for post-mission Worker Safety occupational guidance:
For follow-up locations after a mission (locations with failed actions and anomalies),
determines occupational hazards, OSHA citations, and recommended protective equipment.
"""

import logging
import os
from pathlib import Path
from typing import Any

import pandas as pd
from sqlalchemy import text

from app.db.database import engine

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "data" / "SPOT_KnightHacks_Challenge_Kit Part One" / "02_DATA"

# ---------------------------------------------------------------------------
# Central Documented Configuration
# ---------------------------------------------------------------------------
WORKER_SAFETY_CONFIG: dict[str, Any] = {
    "zone_hazards": {
        "ELECTRICAL": {
            "text": "Shock and arc-flash hazards: only qualified workers, treat equipment as energized until verified de-energized",
            "source": "OSHA 29 CFR 1910.333; arc-flash PPE determined by your site's arc-flash assessment",
            "ppe": ["arc-rated PPE per your site's arc-flash assessment", "lockout/tagout devices"],
        },
        "MECHANICAL": {
            "text": "Rotating and moving equipment: stay clear of moving parts and lock out equipment before hands-on work",
            "source": "OSHA 29 CFR 1910.212 and 1910.147",
            "ppe": ["lockout/tagout devices", "safety glasses"],
        },
        "PROCESS": {
            "text": "Pressurized lines and hot surfaces may be present: isolate and lock out energy sources before opening anything",
            "source": "OSHA 29 CFR 1910.147",
            "ppe": ["lockout/tagout devices", "safety glasses"],
        },
        "ACCESS": {
            "text": "Walkways and corridors: watch for slips and trips; keep paths clear",
            "source": "OSHA 29 CFR 1910.22",
            "ppe": [],
        },
    },
    "environment_hazards": {
        "HIGH_NOISE": {
            "text": "High-noise area: wear hearing protection",
            "source": "OSHA 29 CFR 1910.95",
            "ppe": ["hearing protection"],
        },
        "LOW_LIGHT": {
            "text": "Low light: bring portable lighting; trips and falls are more likely",
            "source": "OSHA 29 CFR 1910.22",
            "ppe": ["portable lighting"],
        },
        "INDOOR_DUSTY": {
            "text": "Dusty area: eye protection; respiratory protection if your site's assessment requires it",
            "source": "OSHA 29 CFR 1910.133 and 1910.134",
            "ppe": ["safety glasses"],
        },
    },
    "thresholds": {
        "hot_surface_temp_c": 60.0,
        "high_noise_sound_db": 85.0,
    },
    "disclaimer": "General guidance only. Follow your site's safety program, job hazard analysis, and work permits.",
}

ZONE_TYPE_PLAIN: dict[str, str] = {
    "ELECTRICAL": "Electrical",
    "MECHANICAL": "Mechanical",
    "PROCESS": "Process",
    "ACCESS": "Access",
}

ENVIRONMENT_PLAIN: dict[str, str] = {
    "NORMAL": "Normal",
    "LOW_LIGHT": "Low light",
    "HIGH_NOISE": "High noise",
    "INDOOR_DUSTY": "Dusty",
    "INDOOR_DRY": "Dry",
}

ACTION_TYPE_PLAIN: dict[str, str] = {
    "VISUAL_INSPECTION": "Visual inspection",
    "GAUGE_READING": "Gauge reading",
    "THERMAL_INSPECTION": "Thermal inspection",
    "ACOUSTIC_INSPECTION": "Acoustic inspection",
    "NAVIGATION": "Navigation",
}

FAILURE_TYPE_PLAIN: dict[str, str] = {
    "LOCALIZATION_FAILURE": "Lost localization",
    "SENSOR_TIMEOUT": "Sensor timeout",
    "SIGNAL_NOISE": "Signal noise",
    "READING_UNRELIABLE": "Unreliable reading",
    "UNRELIABLE_READING": "Unreliable reading",
    "TARGET_NOT_DETECTED": "Target not detected",
    "COMMUNICATION_LOSS": "Communication loss",
    "PATH_BLOCKED": "Path blocked",
    "OBSTACLE_DETECTION": "Obstacle detected",
}

ANOMALY_TYPE_PLAIN: dict[str, str] = {
    "ABNORMAL_VIBRATION": "Abnormal vibration",
    "ABNORMAL_TEMPERATURE": "Abnormal temperature",
    "GAUGE_OUT_OF_RANGE": "Gauge out of range",
    "VISUAL_DEFECT": "Visual defect",
    "SIGNAL_DEGRADATION": "Signal degradation",
    "NAVIGATION_OBSTRUCTION": "Navigation obstruction",
    "LOCALIZATION_ISSUE": "Localization issue",
}

PPE_ORDER: list[str] = [
    "hearing protection",
    "portable lighting",
    "safety glasses",
    "heat-resistant gloves",
    "lockout/tagout devices",
    "arc-rated PPE per your site's arc-flash assessment",
]

_cached_data: dict[str, pd.DataFrame] | None = None


def clear_worker_safety_cache() -> None:
    global _cached_data
    _cached_data = None


def load_worker_safety_data() -> dict[str, pd.DataFrame]:
    """
    Loads missions, actions, readings, anomalies, locations, and assets.
    Follows database-then-CSV fallback (ANALYTICS_FORCE_CSV=1 forces CSV).
    """
    global _cached_data
    if _cached_data is not None:
        return _cached_data

    force_csv = os.getenv("ANALYTICS_FORCE_CSV") == "1"
    tables: dict[str, pd.DataFrame] = {}

    if not force_csv and engine is not None:
        try:
            with engine.connect() as conn:
                for t in ["missions", "actions", "readings", "anomalies", "locations", "assets"]:
                    df = pd.read_sql(text(f"SELECT * FROM {t}"), conn)
                    if df.empty:
                        raise ValueError(f"Table {t} is empty in DB")
                    tables[t] = df
            logger.info("Loaded worker safety data from database.")
        except Exception as exc:
            logger.warning("Failed loading worker safety data from DB (%s); falling back to CSV.", exc)
            tables.clear()

    if not tables:
        csv_files = {
            "missions": DATA_DIR / "missions.csv",
            "actions": DATA_DIR / "actions.csv",
            "readings": DATA_DIR / "readings.csv",
            "anomalies": DATA_DIR / "anomalies.csv",
            "locations": DATA_DIR / "locations.csv",
            "assets": DATA_DIR / "assets.csv",
        }
        for name, path in csv_files.items():
            if not path.exists():
                raise FileNotFoundError(f"Missing required CSV: {path}")
            tables[name] = pd.read_csv(path)
        logger.info("Loaded worker safety data from CSV files.")

    _cached_data = tables
    return _cached_data


def evaluate_worker_safety(mission_id: str) -> dict[str, Any]:
    """
    Evaluates occupational safety guidance for all follow-up locations of a mission.
    Raises KeyError if mission_id is unknown.
    """
    data = load_worker_safety_data()
    missions_df = data["missions"]
    actions_df = data["actions"]
    readings_df = data["readings"]
    anomalies_df = data["anomalies"]
    locations_df = data["locations"]
    assets_df = data["assets"]

    matching_mission = missions_df[missions_df["mission_id"] == mission_id]
    if matching_mission.empty:
        raise KeyError(f"Mission '{mission_id}' not found.")

    mission_row = matching_mission.iloc[0]
    mission_end_time = str(mission_row.get("end_time", ""))

    # Actions for this mission, sorted by sequence
    mission_actions = actions_df[actions_df["mission_id"] == mission_id].sort_values("sequence")
    total_inspections = len(mission_actions)
    inspections_completed = int((mission_actions["status"] == "SUCCESS").sum())

    # Failed actions and anomalies for this mission
    failed_actions = mission_actions[mission_actions["status"] != "SUCCESS"]
    mission_anomalies = anomalies_df[anomalies_df["mission_id"] == mission_id]

    failed_locs_set = set(failed_actions["location_id"].dropna().unique())
    anomaly_locs_set = set(mission_anomalies["location_id"].dropna().unique())
    needed_locs_set = failed_locs_set | anomaly_locs_set

    # Identify follow-up locations in route order of first appearance without duplicates
    follow_up_location_ids: list[str] = []
    for loc_id in mission_actions["location_id"].dropna():
        if loc_id in needed_locs_set and loc_id not in follow_up_location_ids:
            follow_up_location_ids.append(loc_id)

    # If any anomaly occurred at a location not visited in actions, append it
    for loc_id in mission_anomalies["location_id"].dropna():
        if loc_id in needed_locs_set and loc_id not in follow_up_location_ids:
            follow_up_location_ids.append(loc_id)

    # Pre-build lookup dictionaries for fast access
    loc_lookup = {row["location_id"]: row for _, row in locations_df.iterrows()}
    asset_lookup = {row["asset_id"]: row["asset_name"] for _, row in assets_df.iterrows()}

    # Readings: strictly quality == "GOOD" with timestamp <= mission_end_time (no hindsight)
    good_readings = readings_df[readings_df["quality"] == "GOOD"]
    if mission_end_time:
        good_readings = good_readings[good_readings["timestamp"] <= mission_end_time]

    follow_up_locations_res: list[dict[str, Any]] = []

    for loc_id in follow_up_location_ids:
        loc_row = loc_lookup.get(loc_id)
        if loc_row is None:
            continue

        loc_name = str(loc_row.get("location_name", loc_id))
        zone_raw = str(loc_row.get("zone_type", "ACCESS")).upper()
        env_raw = str(loc_row.get("environment", "NORMAL")).upper()

        zone_plain = ZONE_TYPE_PLAIN.get(zone_raw, zone_raw.title())
        env_plain = ENVIRONMENT_PLAIN.get(env_raw, env_raw.title())

        hazards: list[dict[str, str]] = []
        implied_ppe: set[str] = set()
        reasons_list: list[str] = []
        anomalies_structured: list[dict[str, Any]] = []
        failed_actions_structured: list[dict[str, Any]] = []

        # 1. Zone type hazard
        zone_info = WORKER_SAFETY_CONFIG["zone_hazards"].get(zone_raw)
        if zone_info:
            hazards.append({
                "text": zone_info["text"],
                "source": zone_info["source"],
            })
            implied_ppe.update(zone_info["ppe"])

        # 2. Environment hazard
        env_info = WORKER_SAFETY_CONFIG["environment_hazards"].get(env_raw)
        if env_info:
            hazards.append({
                "text": env_info["text"],
                "source": env_info["source"],
            })
            implied_ppe.update(env_info["ppe"])

        # 3. Readings up to this mission at this location
        loc_readings = good_readings[good_readings["location_id"] == loc_id]

        # Temperature >= 60 °C
        temp_readings = loc_readings[loc_readings["measurement_type"] == "TEMPERATURE_C"]["value"].dropna()
        if not temp_readings.empty:
            max_temp = float(temp_readings.max())
            if max_temp >= WORKER_SAFETY_CONFIG["thresholds"]["hot_surface_temp_c"]:
                hazards.append({
                    "text": f"Hot surfaces recorded up to {max_temp:.1f} °C: use heat-resistant gloves and avoid bare-skin contact",
                    "source": "General occupational safety guidance: contact burns become likely around this temperature",
                })
                implied_ppe.add("heat-resistant gloves")

        # Sound >= 85 dB
        sound_readings = loc_readings[loc_readings["measurement_type"] == "SOUND_DB"]["value"].dropna()
        if not sound_readings.empty:
            max_sound = float(sound_readings.max())
            if max_sound >= WORKER_SAFETY_CONFIG["thresholds"]["high_noise_sound_db"]:
                hazards.append({
                    "text": f"Sound readings reached {max_sound:.1f} dB, the OSHA action level for hearing protection programs (equipment readings, not a worker's personal noise exposure)",
                    "source": "OSHA 29 CFR 1910.95",
                })
                implied_ppe.add("hearing protection")

        # Pressure presence
        pressure_readings = loc_readings[loc_readings["measurement_type"] == "PRESSURE_PSI"]["value"].dropna()
        if not pressure_readings.empty:
            hazards.append({
                "text": "Pressurized equipment is present: release stored energy and lock out before opening",
                "source": "OSHA 29 CFR 1910.147",
            })
            implied_ppe.add("lockout/tagout devices")
            implied_ppe.add("safety glasses")

        # 4. Failed actions at this location on this mission
        loc_failed = failed_actions[failed_actions["location_id"] == loc_id]
        for _, fa in loc_failed.iterrows():
            act_type = str(fa.get("action_type", ""))
            act_plain = ACTION_TYPE_PLAIN.get(act_type, act_type.replace("_", " ").title())
            fail_type = str(fa.get("failure_type", ""))
            fail_plain = FAILURE_TYPE_PLAIN.get(fail_type, fail_type.replace("_", " ").title() if fail_type else "Failed")
            asset_id = str(fa.get("asset_id", ""))
            asset_name = asset_lookup.get(asset_id, asset_id)

            if asset_name and asset_name != "nan":
                reason_str = f"Failed {act_plain.lower()} ({fail_plain.lower()}) on {asset_name}"
            else:
                reason_str = f"Failed {act_plain.lower()} ({fail_plain.lower()})"
            reasons_list.append(reason_str)

            failed_actions_structured.append({
                "actionId": str(fa.get("action_id", "")),
                "actionType": act_plain,
                "failureType": fail_plain,
                "assetName": asset_name if asset_name and asset_name != "nan" else None,
            })

        # Anomalies at this location on this mission
        loc_anomalies = mission_anomalies[mission_anomalies["location_id"] == loc_id]
        for _, an in loc_anomalies.iterrows():
            anom_type = str(an.get("anomaly_type", ""))
            anom_plain = ANOMALY_TYPE_PLAIN.get(anom_type, anom_type.replace("_", " ").title())
            sev = str(an.get("severity", "MEDIUM")).upper()
            asset_id = str(an.get("asset_id", ""))
            asset_name = asset_lookup.get(asset_id, asset_id)
            desc = str(an.get("description", ""))

            reason_str = f"{anom_plain} on {asset_name} ({sev.title()} severity)"
            reasons_list.append(reason_str)

            anomalies_structured.append({
                "anomalyId": str(an.get("anomaly_id", "")),
                "anomalyType": anom_plain,
                "severity": sev,
                "assetName": asset_name,
                "description": desc,
            })

            # Anomaly hazard rules
            if anom_type == "ABNORMAL_VIBRATION":
                hazards.append({
                    "text": f"Stay clear of {asset_name} while it's running; lock it out before inspecting",
                    "source": "OSHA 29 CFR 1910.147",
                })
                implied_ppe.add("lockout/tagout devices")
            elif anom_type == "ABNORMAL_TEMPERATURE":
                hazards.append({
                    "text": f"{asset_name} may be hot: check temperature before touching",
                    "source": "General occupational safety guidance",
                })
                implied_ppe.add("heat-resistant gloves")
            elif anom_type == "GAUGE_OUT_OF_RANGE":
                hazards.append({
                    "text": f"Pressure or level may be abnormal on {asset_name}: confirm it's safe and lock out before work",
                    "source": "OSHA 29 CFR 1910.147",
                })
                implied_ppe.add("lockout/tagout devices")
                implied_ppe.add("safety glasses")
            elif anom_type == "SIGNAL_DEGRADATION":
                hazards.append({
                    "text": f"Treat {asset_name} as energized until verified de-energized",
                    "source": "OSHA 29 CFR 1910.333",
                })
                implied_ppe.add("arc-rated PPE per your site's arc-flash assessment")
            elif anom_type == "VISUAL_DEFECT":
                hazards.append({
                    "text": f"Inspect {asset_name} visually before touching; damage may hide other hazards",
                    "source": "General occupational safety guidance",
                })
                implied_ppe.add("safety glasses")
            elif anom_type in ("NAVIGATION_OBSTRUCTION", "LOCALIZATION_ISSUE"):
                hazards.append({
                    "text": f"Something may be blocking the path near {asset_name}: watch for trip hazards",
                    "source": "OSHA 29 CFR 1910.22",
                })

        # Order and deduplicate protective equipment based on standard PPE order
        sorted_ppe = [p for p in PPE_ORDER if p in implied_ppe]

        follow_up_locations_res.append({
            "locationId": loc_id,
            "locationName": loc_name,
            "zoneType": zone_plain,
            "environment": env_plain,
            "reasons": reasons_list,
            "hazards": hazards,
            "protectiveEquipment": sorted_ppe,
            "anomalies": anomalies_structured,
            "failedActions": failed_actions_structured,
        })

    # Mission-level summary
    num_locs = len(follow_up_locations_res)
    if num_locs == 0:
        summary_text = "No follow-up visits needed for this mission."
    else:
        loc_word = "location" if num_locs == 1 else "locations"
        summary_text = f"SPOT completed {inspections_completed} of {total_inspections} inspections, so people only need to visit {num_locs} {loc_word}."

    return {
        "missionId": mission_id,
        "summary": summary_text,
        "inspectionsCompleted": inspections_completed,
        "totalInspections": total_inspections,
        "followUpLocations": follow_up_locations_res,
        "disclaimer": WORKER_SAFETY_CONFIG["disclaimer"],
    }
