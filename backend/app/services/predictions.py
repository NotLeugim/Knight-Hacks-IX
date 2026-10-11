"""
backend/app/services/predictions.py

Service layer for predictive analytics (issue #16 / AI-3):
1. Part A: Trend Watch (sliding-window wear trend detector & backtest).
2. Part B: Pre-mission Risk Forecast Model (pure NumPy L2 regularized logistic regression,
   honest leave-one-mission-out backtest, baselines, calibration, route forecast,
   and route sequence optimization).
"""

import asyncio
from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy import text

from app.db.database import engine
from app.services.gemini import get_client

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "data" / "SPOT_KnightHacks_Challenge_Kit Part One" / "02_DATA"

# ---------------------------------------------------------------------------
# Part A Configuration
# ---------------------------------------------------------------------------
TREND_CONFIG: dict[str, dict[str, Any]] = {
    "TEMPERATURE_C": {
        "direction": "up",
        "threshold": 10.0,
        "unit": "°C",
        "measure": "temperature",
        "next_step": "Have a technician check it for overheating",
    },
    "SOUND_DB": {
        "direction": "up",
        "threshold": 6.0,
        "unit": "dB",
        "measure": "sound level",
        "next_step": "Schedule a vibration check",
    },
    "PRESSURE_PSI": {
        "direction": "up",
        "threshold": 10.0,
        "unit": "psi",
        "measure": "pressure",
        "next_step": "Verify the gauge by hand",
    },
    "VISUAL_SCORE": {
        "direction": "down",
        "threshold": 8.0,
        "unit": "points",
        "measure": "visual score",
        "next_step": "Inspect it in person",
    },
    "LOCALIZATION_CONFIDENCE_PCT": {
        "direction": "down",
        "threshold": 8.0,
        "unit": "%",
        "measure": "localization confidence",
        "next_step": "Check lighting and markers nearby",
    },
}

# ---------------------------------------------------------------------------
# Part B Configuration
# ---------------------------------------------------------------------------
ACTION_TYPES_OH = [
    "GAUGE_READING",
    "NAVIGATION",
    "THERMAL_INSPECTION",
    "VISUAL_INSPECTION",
]  # ACOUSTIC_INSPECTION is reference baseline

LOCATIONS_OH = [f"WP{i:02d}" for i in range(2, 16)]  # WP01 is reference baseline

FEATURE_NAMES = (
    ["intercept"]
    + ACTION_TYPES_OH
    + LOCATIONS_OH
    + ["low30", "bat10", "v2"]
)

PLAIN_ACTION_TYPES: dict[str, str] = {
    "ACOUSTIC_INSPECTION": "Acoustic Inspection",
    "GAUGE_READING": "Gauge Reading",
    "NAVIGATION": "Navigation",
    "THERMAL_INSPECTION": "Thermal Inspection",
    "VISUAL_INSPECTION": "Visual Inspection",
}

ACTION_TYPE_REASONS: dict[str, str] = {
    "ACOUSTIC_INSPECTION": "Acoustic inspections fail more often than average",
    "GAUGE_READING": "Gauge readings fail more often than average",
    "NAVIGATION": "Navigation actions fail more often than average",
    "THERMAL_INSPECTION": "Thermal inspections fail more often than average",
    "VISUAL_INSPECTION": "Visual inspections fail more often than average",
}

# Caches
_cached_data: dict[str, pd.DataFrame] | None = None
_cached_loo_backtest: dict[str, Any] | None = None
_cached_trend_messages: dict[str, str] = {}


def clear_predictions_cache() -> None:
    """Clears in-memory caches for data, backtests, and AI messages."""
    global _cached_data, _cached_loo_backtest, _cached_trend_messages
    _cached_data = None
    _cached_loo_backtest = None
    _cached_trend_messages.clear()


# ---------------------------------------------------------------------------
# Data Loading
# ---------------------------------------------------------------------------
def load_predictions_data() -> dict[str, pd.DataFrame]:
    """
    Loads readings, actions, missions, assets, and locations.
    Checks the database first (unless ANALYTICS_FORCE_CSV is 1),
    falling back to CSV files if DB tables are missing or empty.
    """
    global _cached_data
    if _cached_data is not None:
        return _cached_data

    force_csv = os.getenv("ANALYTICS_FORCE_CSV") == "1"
    tables: dict[str, pd.DataFrame] = {}

    if not force_csv and engine is not None:
        try:
            with engine.connect() as conn:
                for t in ["readings", "actions", "missions", "assets", "locations"]:
                    df = pd.read_sql(text(f"SELECT * FROM {t}"), conn)
                    if df.empty:
                        raise ValueError(f"Table {t} is empty in DB")
                    tables[t] = df
            logger.info("Loaded predictions data from database.")
        except Exception as exc:
            logger.warning("Failed loading from DB (%s); falling back to CSV.", exc)
            tables.clear()

    if not tables:
        csv_files = {
            "readings": DATA_DIR / "readings.csv",
            "actions": DATA_DIR / "actions.csv",
            "missions": DATA_DIR / "missions.csv",
            "assets": DATA_DIR / "assets.csv",
            "locations": DATA_DIR / "locations.csv",
        }
        for name, path in csv_files.items():
            if not path.exists():
                raise FileNotFoundError(f"Missing required CSV: {path}")
            tables[name] = pd.read_csv(path)
        logger.info("Loaded predictions data from CSV files.")

    _cached_data = tables
    return _cached_data


# ---------------------------------------------------------------------------
# Part A: Trend Watch
# ---------------------------------------------------------------------------
def format_template_trend_message(
    asset_id: str,
    asset_name: str,
    measurement_type: str,
    readings: list[float],
) -> str:
    """Generates a deterministic plain-language alert message."""
    cfg = TREND_CONFIG.get(measurement_type, {})
    direction = cfg.get("direction", "up")
    verb = "rose" if direction == "up" else "dropped"
    unit = cfg.get("unit", "")
    measure = cfg.get("measure", measurement_type)
    next_step = cfg.get("next_step", "Inspect before the next mission")

    abs_change = round(abs(readings[2] - readings[0]), 1)
    # If integer, format nicely
    change_str = f"{abs_change:g}"
    r_str = f"{readings[0]:.1f} → {readings[1]:.1f} → {readings[2]:.1f}"

    return (
        f"{asset_name} {measure} {verb} {change_str} {unit} over its last 3 readings "
        f"({r_str}). {next_step} before the next mission."
    )


def validate_gemini_alert(text_out: str, asset_name: str, asset_id: str) -> str | None:
    """Validates Gemini alert output: 1 sentence, <30 words, mentions asset name or id."""
    cleaned = text_out.strip().replace("\n", " ")
    if (cleaned.startswith('"') and cleaned.endswith('"')) or (
        cleaned.startswith("'") and cleaned.endswith("'")
    ):
        cleaned = cleaned[1:-1].strip()
    words = cleaned.split()
    if not words or len(words) > 30:
        return None
    lower = cleaned.lower()
    if asset_id.lower() not in lower and asset_name.lower() not in lower:
        return None
    return cleaned


async def generate_trend_alert_message(
    asset_id: str,
    asset_name: str,
    measurement_type: str,
    readings: list[float],
) -> tuple[str, str]:
    """
    Returns (message, generated_by).
    Tries Gemini if GEMINI_API_KEY is available, with strict timeout and validation;
    falls back to template on error, missing key, or validation failure.
    """
    cache_key = f"{asset_id}_{measurement_type}_{readings[0]}_{readings[1]}_{readings[2]}"
    if cache_key in _cached_trend_messages:
        return _cached_trend_messages[cache_key], "gemini"

    template_msg = format_template_trend_message(
        asset_id, asset_name, measurement_type, readings
    )

    if not os.environ.get("GEMINI_API_KEY"):
        return template_msg, "template"

    cfg = TREND_CONFIG.get(measurement_type, {})
    prompt = (
        "You are SPOTSight, an AI diagnostic assistant for NextEra Energy plant operators. "
        "Write exactly ONE concise alert sentence (< 30 words) for a plant operator warning them "
        "about an asset wear trend:\n"
        f"- Asset: {asset_name} ({asset_id})\n"
        f"- Metric: {cfg.get('measure', measurement_type)}\n"
        f"- Recent 3 readings: {readings[0]:.1f} -> {readings[1]:.1f} -> {readings[2]:.1f} {cfg.get('unit', '')}\n"
        f"- Required action: {cfg.get('next_step', 'Inspect before the next mission')}\n\n"
        "Rules:\n"
        "1. Write exactly one sentence.\n"
        "2. Keep it under 30 words.\n"
        f"3. You must explicitly include the asset name '{asset_name}' or '{asset_id}'.\n"
        "4. No conversational filler, pleasantries, or markdown formatting."
    )

    try:
        client = get_client()
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model="gemini-3.8-flash",
                contents=prompt,
            ),
            timeout=15.0,
        )
        validated = validate_gemini_alert(response.text, asset_name, asset_id)
        if validated:
            _cached_trend_messages[cache_key] = validated
            return validated, "gemini"
        logger.warning("Gemini alert failed validation; using template fallback.")
    except Exception as exc:
        logger.warning("Gemini call for trend alert failed (%s); using template fallback.", exc)

    return template_msg, "template"


async def get_trend_alerts(as_of: str | None = None) -> list[dict[str, Any]]:
    """
    Evaluates active trend alerts on the last 3 GOOD readings.
    Returns alerts sorted by severity descending.
    """
    data = load_predictions_data()
    readings_df = data["readings"].copy()
    assets_df = data["assets"]

    asset_names: dict[str, str] = dict(
        zip(assets_df["asset_id"], assets_df["asset_name"])
    )

    # Filter strictly to GOOD quality
    good_readings = readings_df[readings_df["quality"] == "GOOD"].copy()
    if as_of:
        good_readings = good_readings[good_readings["timestamp"] <= as_of]

    good_readings = good_readings.sort_values("timestamp")

    raw_alerts = []
    for (asset_id, m_type), group in good_readings.groupby(
        ["asset_id", "measurement_type"]
    ):
        if len(group) < 3 or m_type not in TREND_CONFIG:
            continue
        last3 = group.tail(3)
        vals = [float(v) for v in last3["value"]]
        timestamps = [str(t) for t in last3["timestamp"]]
        cfg = TREND_CONFIG[m_type]
        direction = cfg["direction"]
        threshold = cfg["threshold"]

        triggered = False
        if direction == "up" and vals[0] < vals[1] < vals[2] and (vals[2] - vals[0]) >= threshold:
            triggered = True
        elif (
            direction == "down"
            and vals[0] > vals[1] > vals[2]
            and (vals[0] - vals[2]) >= threshold
        ):
            triggered = True

        if triggered:
            abs_change = round(abs(vals[2] - vals[0]), 2)
            severity = round(abs_change / threshold, 2)
            raw_alerts.append(
                {
                    "assetId": str(asset_id),
                    "assetName": asset_names.get(str(asset_id), str(asset_id)),
                    "measurementType": m_type,
                    "readings": vals,
                    "timestamps": timestamps,
                    "absChange": abs_change,
                    "threshold": threshold,
                    "severity": severity,
                    "direction": direction,
                }
            )

    # Sort alerts by severity descending
    raw_alerts.sort(key=lambda a: a["severity"], reverse=True)

    # Generate plain-language / Gemini messages
    alerts: list[dict[str, Any]] = []
    for item in raw_alerts:
        msg, gen_by = await generate_trend_alert_message(
            item["assetId"],
            item["assetName"],
            item["measurementType"],
            item["readings"],
        )
        item["message"] = msg
        item["generatedBy"] = gen_by
        alerts.append(item)

    return alerts


def get_trend_backtest() -> dict[str, Any]:
    """
    Performs a walk-forward backtest across all GOOD readings without hindsight.
    Records the first triggering window for each (asset_id, measurement_type) pair
    and inspects whether any later action on that asset failed.
    """
    data = load_predictions_data()
    readings_df = data["readings"].copy()
    actions_df = data["actions"].copy()
    assets_df = data["assets"]

    asset_names: dict[str, str] = dict(
        zip(assets_df["asset_id"], assets_df["asset_name"])
    )

    good_readings = readings_df[readings_df["quality"] == "GOOD"].sort_values("timestamp")

    events: list[dict[str, Any]] = []

    for (asset_id, m_type), group in good_readings.groupby(
        ["asset_id", "measurement_type"]
    ):
        if m_type not in TREND_CONFIG:
            continue
        g_sorted = group.sort_values("timestamp").reset_index(drop=True)
        cfg = TREND_CONFIG[m_type]
        direction = cfg["direction"]
        threshold = cfg["threshold"]

        for i in range(len(g_sorted) - 2):
            r1, r2, r3 = g_sorted.iloc[i], g_sorted.iloc[i + 1], g_sorted.iloc[i + 2]
            v1, v2, v3 = float(r1["value"]), float(r2["value"]), float(r3["value"])
            abs_c = abs(v3 - v1)

            triggered = False
            if direction == "up" and v1 < v2 < v3 and abs_c >= threshold:
                triggered = True
            elif direction == "down" and v1 > v2 > v3 and abs_c >= threshold:
                triggered = True

            if triggered:
                triggered_at = str(r3["timestamp"])
                mission_id = str(r3["mission_id"])

                # Check for later failure on the same asset
                asset_actions = actions_df[actions_df["asset_id"] == asset_id]
                later_failures = asset_actions[
                    (asset_actions["timestamp"] > triggered_at)
                    & (asset_actions["status"] != "SUCCESS")
                ].sort_values("timestamp")

                followed_by_failure = None
                if not later_failures.empty:
                    first_fail = later_failures.iloc[0]
                    followed_by_failure = {
                        "missionId": str(first_fail["mission_id"]),
                        "timestamp": str(first_fail["timestamp"]),
                        "failureType": str(first_fail["failure_type"]),
                    }

                events.append(
                    {
                        "assetId": str(asset_id),
                        "assetName": asset_names.get(str(asset_id), str(asset_id)),
                        "measurementType": m_type,
                        "readings": [round(v1, 1), round(v2, 1), round(v3, 1)],
                        "triggeredAt": triggered_at,
                        "missionId": mission_id,
                        "followedByFailure": followed_by_failure,
                    }
                )
                break  # Record only the first triggering window per pair

    # Sort events by triggeredAt
    events.sort(key=lambda e: e["triggeredAt"])
    followed_count = sum(1 for e in events if e["followedByFailure"] is not None)

    return {
        "totalEvents": len(events),
        "followedByFailureCount": followed_count,
        "events": events,
    }


# ---------------------------------------------------------------------------
# Part B: Pre-mission Risk Forecast Model
# ---------------------------------------------------------------------------
def fit_config_drain_parameters(
    train_actions: pd.DataFrame, train_missions: pd.DataFrame
) -> dict[str, tuple[float, float]]:
    """
    Fits pre-mission battery drain parameters for V1 and V2:
    firstDrop = mean(start_battery_pct - battery_pct of action #1)
    stepDrain = mean(battery_pct_i - battery_pct_{i+1})
    """
    if "start_battery_pct" in train_actions.columns:
        df = train_actions
    else:
        df = train_actions.merge(
            train_missions[["mission_id", "start_battery_pct"]], on="mission_id"
        )
    params: dict[str, tuple[float, float]] = {}

    for cfg in ["V1", "V2"]:
        cdf = df[df["configuration_version"] == cfg]
        if cdf.empty:
            params[cfg] = (5.0, 5.0)
            continue
        first_drops: list[float] = []
        step_drains: list[float] = []
        for _, grp in cdf.groupby("mission_id"):
            grp = grp.sort_values("sequence")
            first_drops.append(
                float(grp.iloc[0]["start_battery_pct"] - grp.iloc[0]["battery_pct"])
            )
            bats = list(grp["battery_pct"])
            for i in range(len(bats) - 1):
                step_drains.append(float(bats[i] - bats[i + 1]))

        fd = float(np.mean(first_drops)) if first_drops else 5.0
        sd = float(np.mean(step_drains)) if step_drains else 5.0
        params[cfg] = (fd, sd)

    return params


def compute_projected_battery(
    actions_df: pd.DataFrame,
    start_battery_pct: float | None = None,
    config_params: dict[str, tuple[float, float]] | None = None,
) -> np.ndarray:
    """
    Computes projected battery without looking at action battery_pct.
    projected = start_battery_pct - firstDrop - (sequence - 1) * stepDrain
    """
    if config_params is None:
        config_params = {"V1": (5.555555, 5.567901), "V2": (2.777778, 2.777778)}

    proj: list[float] = []
    for _, row in actions_df.iterrows():
        cfg = str(row["configuration_version"])
        fd, sd = config_params.get(cfg, (5.0, 5.0))
        start_bat = (
            float(start_battery_pct)
            if start_battery_pct is not None
            else float(row["start_battery_pct"])
        )
        seq = int(row["sequence"])
        proj.append(start_bat - fd - (seq - 1) * sd)

    return np.array(proj, dtype=np.float64)


def build_feature_matrix(
    actions_df: pd.DataFrame,
    proj_battery: np.ndarray,
) -> np.ndarray:
    """
    Builds the design matrix X for L2 logistic regression:
    - intercept (column 0)
    - action_type one-hot (4 columns, ACOUSTIC_INSPECTION reference)
    - location_id one-hot (14 columns, WP01 reference)
    - low30 (projected < 30)
    - bat10 ((projected - 60) / 10)
    - v2 (configuration_version == V2)
    """
    n = len(actions_df)
    d = len(FEATURE_NAMES)
    X = np.zeros((n, d), dtype=np.float64)

    X[:, 0] = 1.0  # intercept

    # Action types
    for idx, at in enumerate(ACTION_TYPES_OH):
        X[:, 1 + idx] = (actions_df["action_type"] == at).astype(np.float64).values

    # Locations
    offset = 1 + len(ACTION_TYPES_OH)
    for idx, loc in enumerate(LOCATIONS_OH):
        X[:, offset + idx] = (actions_df["location_id"] == loc).astype(np.float64).values

    # Battery & config features
    offset += len(LOCATIONS_OH)
    X[:, offset] = (proj_battery < 30.0).astype(np.float64)
    X[:, offset + 1] = (proj_battery - 60.0) / 10.0
    X[:, offset + 2] = (
        (actions_df["configuration_version"] == "V2").astype(np.float64).values
    )

    return X


def fit_logistic_regression(
    X: np.ndarray,
    y: np.ndarray,
    lr: float = 0.1,
    lam: float = 5.0,
    iters: int = 3000,
) -> np.ndarray:
    """
    Fits L2 regularized logistic regression via full-batch gradient descent.
    Does NOT regularize the intercept term (column 0).
    """
    n, d = X.shape
    w = np.zeros(d, dtype=np.float64)
    reg_mask = np.ones(d, dtype=np.float64)
    reg_mask[0] = 0.0

    for _ in range(iters):
        z = np.clip(X @ w, -30.0, 30.0)
        p = 1.0 / (1.0 + np.exp(-z))
        grad = (X.T @ (p - y)) / n + (lam / n) * (reg_mask * w)
        w -= lr * grad

    return w


def predict_probability(X: np.ndarray, w: np.ndarray) -> np.ndarray:
    """Computes predicted probabilities from features and weights."""
    z = np.clip(X @ w, -30.0, 30.0)
    return 1.0 / (1.0 + np.exp(-z))


def compute_rank_auc(y_true: np.ndarray, y_score: np.ndarray) -> float:
    """Computes AUC with tie averaging."""
    pos = y_score[y_true == 1]
    neg = y_score[y_true == 0]
    if len(pos) == 0 or len(neg) == 0:
        return 0.5
    auc_sum = 0.0
    for p in pos:
        auc_sum += np.sum(neg < p) + 0.5 * np.sum(neg == p)
    return float(auc_sum / (len(pos) * len(neg)))


def run_leave_one_out_backtest() -> dict[str, Any]:
    """
    Executes honest leave-one-mission-out backtest across all 27 missions (270 actions).
    Evaluates AUC, Brier score, top 20% lift, baselines, and calibration bins.
    Also fits the final model on all data.
    """
    global _cached_loo_backtest
    if _cached_loo_backtest is not None:
        return _cached_loo_backtest

    data = load_predictions_data()
    missions_df = data["missions"]
    actions_df = data["actions"].merge(
        missions_df[["mission_id", "start_battery_pct"]], on="mission_id"
    )

    all_mids = list(missions_df["mission_id"].unique())
    y_all = (actions_df["status"] != "SUCCESS").astype(np.float64).values
    n_actions = len(actions_df)

    held_out_preds = np.zeros(n_actions, dtype=np.float64)
    held_out_type_preds = np.zeros(n_actions, dtype=np.float64)
    held_out_bat_preds = np.zeros(n_actions, dtype=np.float64)

    # 1. 27-fold Leave-One-Mission-Out
    for mid in all_mids:
        train_mask = (actions_df["mission_id"] != mid).values
        test_mask = (actions_df["mission_id"] == mid).values

        train_actions = actions_df[train_mask]
        train_missions = missions_df[missions_df["mission_id"] != mid]
        test_actions = actions_df[test_mask]

        params = fit_config_drain_parameters(train_actions, train_missions)

        # Full model
        X_train = build_feature_matrix(
            train_actions, compute_projected_battery(train_actions, config_params=params)
        )
        y_train = y_all[train_mask]
        w = fit_logistic_regression(X_train, y_train)

        X_test = build_feature_matrix(
            test_actions, compute_projected_battery(test_actions, config_params=params)
        )
        held_out_preds[test_mask] = predict_probability(X_test, w)

        # Baseline 1: Inspection type average
        type_means = (
            train_actions.groupby("action_type")["status"]
            .apply(lambda s: float(np.mean(s != "SUCCESS")))
            .to_dict()
        )
        held_out_type_preds[test_mask] = (
            test_actions["action_type"].map(type_means).fillna(0.0).values
        )

        # Baseline 2: Battery only
        proj_train = compute_projected_battery(train_actions, config_params=params)
        X_train_bat = np.zeros((len(train_actions), 3), dtype=np.float64)
        X_train_bat[:, 0] = 1.0
        X_train_bat[:, 1] = (proj_train < 30.0).astype(np.float64)
        X_train_bat[:, 2] = (proj_train - 60.0) / 10.0
        w_bat = fit_logistic_regression(X_train_bat, y_train)

        proj_test = compute_projected_battery(test_actions, config_params=params)
        X_test_bat = np.zeros((len(test_actions), 3), dtype=np.float64)
        X_test_bat[:, 0] = 1.0
        X_test_bat[:, 1] = (proj_test < 30.0).astype(np.float64)
        X_test_bat[:, 2] = (proj_test - 60.0) / 10.0
        held_out_bat_preds[test_mask] = predict_probability(X_test_bat, w_bat)

    # 2. Performance Metrics
    auc_val = round(compute_rank_auc(y_all, held_out_preds), 4)
    brier_val = round(float(np.mean((held_out_preds - y_all) ** 2)), 4)

    # Top 20%
    top20_count = int(np.round(n_actions * 0.20))
    sorted_idx = np.argsort(-held_out_preds)
    top20_idx = sorted_idx[:top20_count]
    total_failures = int(np.sum(y_all))
    failures_caught = int(np.sum(y_all[top20_idx]))
    lift = round((failures_caught / total_failures) / 0.20, 2)

    # Baselines
    type_auc = round(compute_rank_auc(y_all, held_out_type_preds), 4)
    bat_auc = round(compute_rank_auc(y_all, held_out_bat_preds), 4)

    # Calibration table (4 bins: 0-10%, 10-20%, 20-35%, 35-100%)
    calibration_bins = [
        ("0-10%", 0.0, 0.10),
        ("10-20%", 0.10, 0.20),
        ("20-35%", 0.20, 0.35),
        ("35-100%", 0.35, 1.001),
    ]
    cal_table = []
    for b_label, b_min, b_max in calibration_bins:
        mask = (held_out_preds >= b_min) & (held_out_preds < b_max)
        cnt = int(np.sum(mask))
        pred_rate = round(float(np.mean(held_out_preds[mask])), 3) if cnt > 0 else 0.0
        act_rate = round(float(np.mean(y_all[mask])), 3) if cnt > 0 else 0.0
        cal_table.append(
            {
                "bin": b_label,
                "minRisk": b_min,
                "maxRisk": min(b_max, 1.0),
                "actionCount": cnt,
                "predictedFailureRate": pred_rate,
                "actualFailureRate": act_rate,
            }
        )

    # 3. Fit Final Model on All 270 Actions
    final_params = fit_config_drain_parameters(actions_df, missions_df)
    X_full = build_feature_matrix(
        actions_df, compute_projected_battery(actions_df, config_params=final_params)
    )
    final_w = fit_logistic_regression(X_full, y_all)

    # Human-readable factor interpretations
    factors: list[dict[str, Any]] = []
    for name, weight in zip(FEATURE_NAMES, final_w):
        if name == "intercept":
            continue
        weight_rounded = round(float(weight), 4)
        if name == "low30":
            impact = "Battery below 30% significantly increases failure probability"
        elif name == "bat10":
            impact = "Higher battery levels reduce failure risk (each +10% reduces odds)"
        elif name == "v2":
            impact = "V2 configuration reduces baseline action failure rate"
        elif name in ACTION_TYPES_OH:
            impact = f"Baseline risk shift for {PLAIN_ACTION_TYPES.get(name, name)} vs Acoustic Inspection"
        else:
            impact = f"Specific historical risk factor at waypoint {name}"

        factors.append(
            {
                "feature": name,
                "weight": weight_rounded,
                "impact": impact,
            }
        )

    factors.sort(key=lambda f: abs(f["weight"]), reverse=True)

    # Store map of action_id -> held-out risk
    action_held_out_map = dict(
        zip(actions_df["action_id"], [round(float(p), 3) for p in held_out_preds])
    )

    # Feature averages and categorical baselines for centered reason contributions
    mean_X = np.mean(X_full, axis=0)

    all_action_types = ["ACOUSTIC_INSPECTION"] + ACTION_TYPES_OH
    w_action_types = {
        at: (float(final_w[1 + ACTION_TYPES_OH.index(at)]) if at in ACTION_TYPES_OH else 0.0)
        for at in all_action_types
    }
    p_action_types = {
        at: float(np.mean(actions_df["action_type"] == at)) for at in all_action_types
    }
    mean_z_at = sum(p_action_types[at] * w_action_types[at] for at in all_action_types)

    all_locations = ["WP01"] + LOCATIONS_OH
    w_locations = {
        loc: (
            float(final_w[1 + len(ACTION_TYPES_OH) + LOCATIONS_OH.index(loc)])
            if loc in LOCATIONS_OH
            else 0.0
        )
        for loc in all_locations
    }
    p_locations = {
        loc: float(np.mean(actions_df["location_id"] == loc)) for loc in all_locations
    }
    mean_z_loc = sum(p_locations[loc] * w_locations[loc] for loc in all_locations)

    # Raw failure rates by action type vs overall
    overall_fail_rate = float(np.mean(actions_df["status"] != "SUCCESS"))
    type_fail_rates = {
        at: float(np.mean(actions_df[actions_df["action_type"] == at]["status"] != "SUCCESS"))
        for at in all_action_types
    }

    _cached_loo_backtest = {
        "evaluation": {
            "method": "Leave-one-mission-out (27 folds)",
            "totalActions": n_actions,
            "auc": auc_val,
            "brierScore": brier_val,
            "top20Percent": {
                "threshold": 0.20,
                "actionsEvaluated": top20_count,
                "failuresCaught": failures_caught,
                "totalFailures": total_failures,
                "lift": lift,
            },
            "baselines": {
                "actionTypeAverageAuc": type_auc,
                "batteryOnlyAuc": bat_auc,
                "randomAuc": 0.50,
            },
            "calibration": cal_table,
        },
        "factors": factors,
        "weights": final_w,
        "finalDrainParams": final_params,
        "actionHeldOutMap": action_held_out_map,
        "mean_X": mean_X,
        "w_action_types": w_action_types,
        "mean_z_at": mean_z_at,
        "w_locations": w_locations,
        "mean_z_loc": mean_z_loc,
        "overall_fail_rate": overall_fail_rate,
        "type_fail_rates": type_fail_rates,
    }
    return _cached_loo_backtest


def get_model_metadata() -> dict[str, Any]:
    """Returns model specification, evaluation metrics, and factor analysis."""
    loo_res = run_leave_one_out_backtest()
    return {
        "modelName": "L2 Regularized Logistic Regression (NumPy)",
        "evaluation": loo_res["evaluation"],
        "factors": loo_res["factors"],
    }


def get_mission_forecast(
    mission_id: str,
    start_battery: float | None = None,
    config: str | None = None,
) -> dict[str, Any] | None:
    """
    Builds the pre-mission Risk Forecast for a mission route:
    - sequence, actionId, actionType, locationName, projectedBattery, risk, reasons
    - chanceAnyFailure, expectedFailures
    - heldOutRisk and actual for historical missions
    - greedy route reordering suggestion if it reduces expectedFailures >= 0.05.
    Returns None if mission_id is unknown.
    """
    data = load_predictions_data()
    missions_df = data["missions"]
    actions_df = data["actions"]
    locations_df = data["locations"]

    matched = missions_df[missions_df["mission_id"] == mission_id]
    if matched.empty:
        return None

    m_row = matched.iloc[0]
    effective_config = config if config is not None else str(m_row["configuration_version"])
    effective_start_bat = (
        float(start_battery)
        if start_battery is not None
        else float(m_row["start_battery_pct"])
    )

    loc_map: dict[str, str] = dict(
        zip(locations_df["location_id"], locations_df["location_name"])
    )

    loo_res = run_leave_one_out_backtest()
    weights = loo_res["weights"]
    drain_params = loo_res["finalDrainParams"]
    action_held_out_map = loo_res["actionHeldOutMap"]
    mean_X = loo_res["mean_X"]
    w_action_types = loo_res["w_action_types"]
    mean_z_at = loo_res["mean_z_at"]
    w_locations = loo_res["w_locations"]
    mean_z_loc = loo_res["mean_z_loc"]
    overall_fail_rate = loo_res["overall_fail_rate"]
    type_fail_rates = loo_res["type_fail_rates"]

    fd, sd = drain_params.get(effective_config, (5.0, 5.0))

    # Retrieve mission actions sorted by sequence
    m_actions = (
        actions_df[actions_df["mission_id"] == mission_id]
        .sort_values("sequence")
        .copy()
        .reset_index(drop=True)
    )
    if m_actions.empty:
        return None

    # Override configuration for what-if evaluation
    m_actions["configuration_version"] = effective_config

    action_items: list[dict[str, Any]] = []
    base_logits: list[float] = []

    # Map feature names to indices
    feat_idx = {name: idx for idx, name in enumerate(FEATURE_NAMES)}

    for _, a_row in m_actions.iterrows():
        seq = int(a_row["sequence"])
        proj_bat = round(effective_start_bat - fd - (seq - 1) * sd, 1)

        at = str(a_row["action_type"])
        loc_id = str(a_row["location_id"])

        # Base log-odds (excluding battery terms)
        base_log_odd = weights[0]  # intercept
        if at in feat_idx:
            base_log_odd += weights[feat_idx[at]]
        if loc_id in feat_idx:
            base_log_odd += weights[feat_idx[loc_id]]
        if effective_config == "V2":
            base_log_odd += weights[feat_idx["v2"]]

        base_logits.append(base_log_odd)

        # Battery terms
        low30_val = 1.0 if proj_bat < 30.0 else 0.0
        bat10_val = (proj_bat - 60.0) / 10.0
        battery_log_odd = (
            weights[feat_idx["low30"]] * low30_val
            + weights[feat_idx["bat10"]] * bat10_val
        )

        total_logit = base_log_odd + battery_log_odd
        risk = round(float(1.0 / (1.0 + np.exp(-np.clip(total_logit, -30.0, 30.0)))), 3)

        # Candidates above 0.15 contribution relative to average action
        candidate_reasons: list[tuple[float, str]] = []

        # 1. Battery contribution
        low30_idx = feat_idx["low30"]
        bat10_idx = feat_idx["bat10"]
        bat_contrib = (
            weights[low30_idx] * (low30_val - mean_X[low30_idx])
            + weights[bat10_idx] * (bat10_val - mean_X[bat10_idx])
        )
        if bat_contrib > 0.15:
            if proj_bat < 30.0:
                bat_text = f"Projected battery below 30% ({proj_bat}%)"
            else:
                bat_text = f"Projected battery {proj_bat}% (lower battery raises risk)"
            candidate_reasons.append((bat_contrib, bat_text))

        # 2. Action type contribution
        at_contrib = w_action_types.get(at, 0.0) - mean_z_at
        if at_contrib > 0.15:
            if type_fail_rates.get(at, 0.0) > overall_fail_rate:
                if at == "ACOUSTIC_INSPECTION":
                    at_text = "Acoustic inspections fail more often than average"
                elif at == "GAUGE_READING":
                    at_text = "Gauge readings fail more often than average"
                else:
                    at_text = f"{PLAIN_ACTION_TYPES.get(at, at)} actions fail more often than average"
            else:
                at_text = f"{PLAIN_ACTION_TYPES.get(at, at)} adds some risk once battery and location are accounted for"
            candidate_reasons.append((at_contrib, at_text))

        # 3. Location contribution
        loc_contrib = w_locations.get(loc_id, 0.0) - mean_z_loc
        if loc_contrib > 0.15:
            loc_label = loc_map.get(loc_id, loc_id)
            candidate_reasons.append(
                (loc_contrib, f"{loc_label} ({loc_id}) has a higher failure rate")
            )

        # 4. Configuration contribution
        v2_idx = feat_idx["v2"]
        v2_val = 1.0 if effective_config == "V2" else 0.0
        cfg_contrib = weights[v2_idx] * (v2_val - mean_X[v2_idx])
        if cfg_contrib > 0.15:
            candidate_reasons.append(
                (cfg_contrib, "Configuration V1 has a higher failure rate than V2")
            )

        candidate_reasons.sort(key=lambda r: r[0], reverse=True)
        reasons = [r[1] for r in candidate_reasons[:2]] if candidate_reasons else ["nothing unusual"]

        act_id = str(a_row["action_id"])
        held_out_risk = action_held_out_map.get(act_id)
        actual_status = "worked" if a_row["status"] == "SUCCESS" else "failed"

        action_items.append(
            {
                "sequence": seq,
                "actionId": act_id,
                "actionType": PLAIN_ACTION_TYPES.get(at, at),
                "locationId": loc_id,
                "locationName": loc_map.get(loc_id, loc_id),
                "projectedBattery": proj_bat,
                "risk": risk,
                "heldOutRisk": held_out_risk,
                "actual": actual_status,
                "reasons": reasons,
            }
        )

    # Aggregate mission risk metrics
    risks = np.array([item["risk"] for item in action_items], dtype=np.float64)
    expected_failures = round(float(np.sum(risks)), 3)
    chance_any_failure = round(float(1.0 - np.prod(1.0 - risks)), 3)

    # Route reordering optimization:
    # Battery drains with sequence, so bat_terms increase with sequence.
    # Placing higher base_logit actions at earlier sequences minimizes expected failures.
    n_seq = len(m_actions)
    bat_terms_seq = []
    for s in range(1, n_seq + 1):
        pb = effective_start_bat - fd - (s - 1) * sd
        bt = (
            weights[feat_idx["low30"]] * (1.0 if pb < 30.0 else 0.0)
            + weights[feat_idx["bat10"]] * ((pb - 60.0) / 10.0)
        )
        bat_terms_seq.append(bt)
    bat_terms_seq = np.array(bat_terms_seq, dtype=np.float64)

    # Sort base_logits descending (front-load highest base risk)
    base_logits_arr = np.array(base_logits, dtype=np.float64)
    opt_order = np.argsort(-base_logits_arr)

    opt_logits = base_logits_arr[opt_order] + bat_terms_seq
    opt_risks = 1.0 / (1.0 + np.exp(-np.clip(opt_logits, -30.0, 30.0)))
    opt_expected_failures = round(float(np.sum(opt_risks)), 3)

    reduction = round(expected_failures - opt_expected_failures, 3)

    suggested_reordering = None
    if reduction >= 0.05:
        # Build reordered sequence preview
        reordered_actions = []
        for new_seq, orig_idx in enumerate(opt_order, start=1):
            orig_item = action_items[orig_idx]
            pb = round(effective_start_bat - fd - (new_seq - 1) * sd, 1)
            new_r = round(float(opt_risks[new_seq - 1]), 3)
            reordered_actions.append(
                {
                    "newSequence": new_seq,
                    "originalSequence": orig_item["sequence"],
                    "actionId": orig_item["actionId"],
                    "actionType": orig_item["actionType"],
                    "locationName": orig_item["locationName"],
                    "projectedBattery": pb,
                    "risk": new_r,
                }
            )

        suggested_reordering = {
            "expectedFailures": opt_expected_failures,
            "reduction": reduction,
            "note": "Doesn't account for walking distance between waypoints.",
            "actions": reordered_actions,
        }

    return {
        "missionId": mission_id,
        "missionName": str(m_row["mission_name"]),
        "configurationVersion": effective_config,
        "startBatteryPct": effective_start_bat,
        "chanceAnyFailure": chance_any_failure,
        "expectedFailures": expected_failures,
        "actions": action_items,
        "suggestedReordering": suggested_reordering,
    }
