"""
Risk-ranked triage queue for SPOTSight (issue #10 / API-2).

triage_score = severity weight x asset criticality weight

Both scales are LOW=1, MEDIUM=2, HIGH=3, CRITICAL=4, so scores run from 1 (LOW anomaly
on a LOW asset) to 16 (CRITICAL anomaly on a CRITICAL asset). Anomalies are sorted by
score (highest first); ties go to the most recent anomaly, then anomaly_id.

The challenge data has no "resolved" status, so every anomaly is treated as open.
Data comes from the Neon tables (anomalies + assets + locations); if the database is
unavailable or empty it falls back to the challenge kit CSVs.
"""
import logging
import os
from pathlib import Path
from typing import Any, Optional

import pandas as pd
from sqlalchemy import text

from app.db.database import engine

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parents[3] / "data" / "SPOT_KnightHacks_Challenge_Kit Part One" / "02_DATA"

SEVERITY_WEIGHTS = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
CRITICALITY_WEIGHTS = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}


def calculate_triage_score(severity: str, criticality: str) -> int:
    """Severity weight x asset criticality weight. Unknown values count as 0."""
    sev = SEVERITY_WEIGHTS.get(str(severity).strip().upper(), 0)
    crit = CRITICALITY_WEIGHTS.get(str(criticality).strip().upper(), 0)
    return sev * crit


def _load() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, str]:
    """anomalies, assets, locations from the database, or the CSVs as a fallback."""
    if os.getenv("TRIAGE_FORCE_CSV") != "1" and engine is not None:
        try:
            with engine.connect() as conn:
                anomalies = pd.read_sql(text("SELECT * FROM anomalies"), conn)
                assets = pd.read_sql(text("SELECT * FROM assets"), conn)
                locations = pd.read_sql(text("SELECT * FROM locations"), conn)
            if not anomalies.empty and not assets.empty:
                return anomalies, assets, locations, "database"
            logger.warning("Triage: database tables are empty; falling back to CSV files.")
        except Exception as exc:
            logger.warning("Triage: database read failed (%s); falling back to CSV files.", exc)

    return (
        pd.read_csv(DATA_DIR / "anomalies.csv"),
        pd.read_csv(DATA_DIR / "assets.csv"),
        pd.read_csv(DATA_DIR / "locations.csv"),
        "csv",
    )


def _title(anomaly_type: str, asset_name: Optional[str], asset_id: str) -> str:
    kind = str(anomaly_type).replace("_", " ").title()
    return f"{kind} — {asset_name or asset_id}"


def get_triage_queue(limit: Optional[int] = None) -> dict[str, Any]:
    """Open anomalies ranked by triage_score (highest first), optionally the top `limit`."""
    anomalies, assets, locations, source = _load()

    asset_info = assets.set_index("asset_id")[["asset_name", "criticality"]].to_dict("index")
    location_names = locations.set_index("location_id")["location_name"].to_dict()

    items = []
    for row in anomalies.to_dict("records"):
        asset = asset_info.get(row["asset_id"], {})
        criticality = asset.get("criticality", "UNKNOWN")
        score = calculate_triage_score(row["severity"], criticality)
        ts = pd.Timestamp(row["timestamp"])
        items.append({
            "id": row["anomaly_id"],
            "anomaly_id": row["anomaly_id"],
            "action_id": row["action_id"],
            "mission_id": row["mission_id"],
            "title": _title(row["anomaly_type"], asset.get("asset_name"), row["asset_id"]),
            "description": row["description"],
            "severity": row["severity"],
            "anomaly_type": row["anomaly_type"],
            "location_id": row["location_id"],
            "location_name": location_names.get(row["location_id"]),
            "asset_id": row["asset_id"],
            "asset_name": asset.get("asset_name"),
            "asset_criticality": criticality,
            "timestamp": ts.isoformat(),
            "operator_review_required": bool(row["operator_review_required"]),
            "severity_weight": SEVERITY_WEIGHTS.get(str(row["severity"]).upper(), 0),
            "criticality_weight": CRITICALITY_WEIGHTS.get(str(criticality).upper(), 0),
            "triage_score": score,
            "risk_score": score,
            "_ts": ts,
        })

    # Highest score first; ties -> most recent first; then anomaly_id for a stable order.
    items.sort(key=lambda i: i["anomaly_id"])
    items.sort(key=lambda i: (i["triage_score"], i["_ts"]), reverse=True)

    total = len(items)
    if limit is not None:
        items = items[:limit]
    for rank, item in enumerate(items, start=1):
        item.pop("_ts")
        item["rank"] = rank

    return {
        "queue": items,
        "count": len(items),
        "total": total,
        "scoring": {
            "formula": "triage_score = severity_weight x criticality_weight",
            "severityWeights": SEVERITY_WEIGHTS,
            "criticalityWeights": CRITICALITY_WEIGHTS,
            "range": [1, 16],
        },
        "source": source,
    }
