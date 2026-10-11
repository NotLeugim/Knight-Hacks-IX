"""
Live Mission Health Score for SPOTSight (issue #12 / API-3).

Uses the SAME formula and weights as the confidence score in services/analytics.py
(issue #3), so the two can never disagree:

    score = 100 - FAILED_ACTION_WEIGHT * failed_actions - sum(ANOMALY_WEIGHTS[severity])
    clamped to [0, 100]

What this module adds:
- get_mission_health(): the score plus a per-action timeline (score after each action),
  so the UI can show health dropping as a mission plays back, and flags missions that
  report COMPLETED but are not 100% healthy.
- LiveHealthTracker: running score per mission while replay events stream in, used by
  GET /api/stream/live?health=true to emit separate `event: health` SSE messages.
"""
from collections import defaultdict
from typing import Any, Optional

import pandas as pd

from app.services import analytics

HEALTHY_MIN = 90
DEGRADED_MIN = 60


def _clamp(score: int) -> int:
    return max(analytics.MIN_CONFIDENCE, min(analytics.MAX_CONFIDENCE, int(score)))


def health_label(score: int) -> str:
    if score >= HEALTHY_MIN:
        return "HEALTHY"
    if score >= DEGRADED_MIN:
        return "DEGRADED"
    return "CRITICAL"


def _frames() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, str]:
    """Reuse the analytics data cache (database with CSV fallback)."""
    if analytics._cached_data_frames is None:
        analytics.get_analytics_payload()
    return analytics._cached_data_frames


def _anomalies_by_action(anomalies_df: pd.DataFrame) -> dict[str, list[dict[str, str]]]:
    by_action: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in anomalies_df.to_dict("records"):
        by_action[row["action_id"]].append({
            "anomalyId": row["anomaly_id"],
            "severity": str(row["severity"]).upper(),
        })
    return by_action


def _action_delta(failed: bool, anomalies: list[dict[str, str]]) -> int:
    delta = analytics.FAILED_ACTION_WEIGHT if failed else 0
    delta += sum(analytics.ANOMALY_WEIGHTS.get(a["severity"], 0) for a in anomalies)
    return -delta


def get_mission_health(mission_id: str) -> Optional[dict[str, Any]]:
    """Health score with a per-action timeline, or None if the mission doesn't exist."""
    missions_df, actions_df, anomalies_df, source = _frames()
    matched = missions_df[missions_df["mission_id"] == mission_id]
    if matched.empty:
        return None
    mission = matched.iloc[0]

    m_actions = actions_df[actions_df["mission_id"] == mission_id].sort_values("sequence")
    m_anomalies = anomalies_df[anomalies_df["mission_id"] == mission_id]
    by_action = _anomalies_by_action(m_anomalies)

    raw = analytics.STARTING_CONFIDENCE
    failed_count = 0
    timeline = []
    for act in m_actions.to_dict("records"):
        failed = act["status"] != "SUCCESS"
        failed_count += failed
        anomalies = by_action.get(act["action_id"], [])
        delta = _action_delta(failed, anomalies)
        raw += delta
        timeline.append({
            "sequence": int(act["sequence"]),
            "actionId": act["action_id"],
            "actionType": act["action_type"],
            "timestamp": pd.Timestamp(act["timestamp"]).isoformat(),
            "status": act["status"],
            "anomalies": anomalies,
            "delta": delta,
            "score": _clamp(raw),
        })

    # Anomalies not tied to an action in this mission still count (none in the kit data).
    seen = {a["anomalyId"] for t in timeline for a in t["anomalies"]}
    extra = [a for lst in by_action.values() for a in lst if a["anomalyId"] not in seen]
    raw += _action_delta(False, extra)

    score = _clamp(raw)
    status = str(mission["mission_status"])
    return {
        "missionId": mission_id,
        "missionStatus": status,
        "config": str(mission["configuration_version"]),
        "score": score,
        "label": health_label(score),
        "completedButDegraded": status == "COMPLETED" and score < analytics.MAX_CONFIDENCE,
        "failedActions": failed_count,
        "anomalyCount": int(len(m_anomalies)),
        "timeline": timeline,
        "source": source,
    }


class LiveHealthTracker:
    """Running health score per mission while replay events stream in."""

    def __init__(self) -> None:
        _, _, anomalies_df, _ = _frames()
        self._by_action = _anomalies_by_action(anomalies_df)
        self._raw: dict[str, int] = {}

    def _payload(self, event: dict, final: bool = False, action_id: Optional[str] = None) -> dict[str, Any]:
        mission_id = event.get("mission_id")
        score = _clamp(self._raw.get(mission_id, analytics.STARTING_CONFIDENCE))
        return {
            "mission_id": mission_id,
            "event_id": event.get("event_id"),
            "timestamp": event.get("timestamp"),
            "action_id": action_id,
            "score": score,
            "label": health_label(score),
            "final": final,
        }

    def update(self, event: dict) -> Optional[dict[str, Any]]:
        """Returns a health payload after events that change (or start/end) a mission's score."""
        etype = event.get("event_type")
        mission_id = event.get("mission_id")
        details = event.get("details") or {}

        if etype == "MISSION_STARTED":
            self._raw[mission_id] = analytics.STARTING_CONFIDENCE
            return self._payload(event)
        if etype in ("ACTION_COMPLETED", "ACTION_FAILED"):
            action_id = details.get("action_id")
            failed = etype == "ACTION_FAILED"
            delta = _action_delta(failed, self._by_action.get(action_id, []))
            self._raw[mission_id] = self._raw.get(mission_id, analytics.STARTING_CONFIDENCE) + delta
            return self._payload(event, action_id=action_id)
        if etype == "MISSION_COMPLETED":
            return self._payload(event, final=True)
        return None
