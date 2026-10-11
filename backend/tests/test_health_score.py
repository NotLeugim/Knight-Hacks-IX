"""
Tests for the live Mission Health Score (issue #12 / API-3).

Run from backend/:  python -m pytest tests/test_health_score.py -v
Uses the challenge kit CSVs (ANALYTICS_FORCE_CSV=1), so it never touches Neon.
"""
import csv
import json
import sys
from collections import Counter
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR.parent / "data" / "SPOT_KnightHacks_Challenge_Kit Part One" / "02_DATA"
sys.path.insert(0, str(BACKEND_DIR))

from app.main import app as fastapi_app  # noqa: E402
from app.services import analytics, health  # noqa: E402


def _csv(name):
    with open(DATA_DIR / f"{name}.csv", newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


MISSION_IDS = sorted(m["mission_id"] for m in _csv("missions"))


@pytest.fixture(scope="module")
def client():
    mp = pytest.MonkeyPatch()
    mp.setenv("ANALYTICS_FORCE_CSV", "1")
    analytics.clear_analytics_cache()
    with TestClient(fastapi_app) as c:
        yield c
    analytics.clear_analytics_cache()
    mp.undo()


def _fake_frames(n_failed_critical: int, n_ok: int = 0):
    """One mission: n failed actions each with a CRITICAL anomaly, plus n_ok clean actions."""
    missions = pd.DataFrame([{"mission_id": "MX", "mission_status": "COMPLETED", "configuration_version": "V1"}])
    actions, anomalies = [], []
    for i in range(n_failed_critical + n_ok):
        failed = i < n_failed_critical
        actions.append({"action_id": f"AX{i}", "mission_id": "MX", "sequence": i + 1, "action_type": "NAVIGATION",
                        "timestamp": f"2026-01-01T00:{i:02d}:00", "status": "FAILED" if failed else "SUCCESS"})
        if failed:
            anomalies.append({"anomaly_id": f"ANX{i}", "action_id": f"AX{i}", "mission_id": "MX", "severity": "CRITICAL"})
    return (missions, pd.DataFrame(actions),
            pd.DataFrame(anomalies, columns=["anomaly_id", "action_id", "mission_id", "severity"]), "test")


# ── Pass check 1: perfect missions return exactly 100 ─────────────────────────
def test_perfect_missions_score_exactly_100(client):
    failed = Counter(a["mission_id"] for a in _csv("actions") if a["status"] != "SUCCESS")
    anomalous = Counter(a["mission_id"] for a in _csv("anomalies"))
    perfect = [m for m in MISSION_IDS if failed[m] == 0 and anomalous[m] == 0]
    assert perfect == ["M005", "M018", "M019", "M023"]
    for m in perfect:
        body = client.get(f"/api/missions/{m}/health").json()
        assert body["score"] == 100, m
        assert body["label"] == "HEALTHY"
        assert body["completedButDegraded"] is False


# ── Pass check 2: multiple critical failures -> significantly degraded ───────
def test_multiple_critical_failures_degrade_score(monkeypatch):
    monkeypatch.setattr(analytics, "_cached_data_frames", _fake_frames(3, n_ok=7))
    body = health.get_mission_health("MX")
    assert body["score"] == 100 - 3 * (analytics.FAILED_ACTION_WEIGHT + analytics.ANOMALY_WEIGHTS["CRITICAL"])
    assert body["score"] < 60 and body["label"] == "CRITICAL"
    assert body["completedButDegraded"] is True


def test_real_completed_mission_flagged_as_degraded(client):
    body = client.get("/api/missions/M006/health").json()
    assert body["missionStatus"] == "COMPLETED"
    assert body["score"] < 60 and body["completedButDegraded"] is True


# ── Pass check 3: never below 0 or above 100 ──────────────────────────────────
def test_score_never_below_zero(monkeypatch):
    monkeypatch.setattr(analytics, "_cached_data_frames", _fake_frames(10))
    body = health.get_mission_health("MX")
    assert body["score"] == 0
    assert all(0 <= t["score"] <= 100 for t in body["timeline"])


def test_all_real_missions_and_steps_within_bounds(client):
    for m in MISSION_IDS:
        body = client.get(f"/api/missions/{m}/health").json()
        assert 0 <= body["score"] <= 100
        assert all(0 <= t["score"] <= 100 for t in body["timeline"])


# ── Consistency with the existing confidence score (issue #3) ─────────────────
def test_health_matches_confidence_endpoint(client):
    for m in MISSION_IDS:
        h = client.get(f"/api/missions/{m}/health").json()["score"]
        c = client.get(f"/api/missions/{m}/confidence").json()["score"]
        assert h == c, m


def test_timeline_ends_at_score_and_never_rises(client):
    actions_per_mission = Counter(a["mission_id"] for a in _csv("actions"))
    for m in MISSION_IDS:
        body = client.get(f"/api/missions/{m}/health").json()
        scores = [t["score"] for t in body["timeline"]]
        assert len(scores) == actions_per_mission[m]
        assert scores == sorted(scores, reverse=True)
        assert scores[-1] == body["score"]


def test_unknown_mission_404(client):
    assert client.get("/api/missions/NOPE/health").status_code == 404


# ── Live stream (opt-in) ──────────────────────────────────────────────────────
def _stream(client, query):
    with client.stream("GET", f"/api/stream/live?delay=0{query}") as r:
        assert r.status_code == 200
        return list(r.iter_lines())


def _replay_lines():
    with open(DATA_DIR / "replay.ndjson", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


def test_default_stream_unchanged(client):
    lines = _stream(client, "")
    assert not any(line.startswith("event: health") for line in lines)
    assert [line[6:] for line in lines if line.startswith("data: ")] == _replay_lines()


def test_health_stream_adds_events_without_changing_data(client):
    lines = _stream(client, "&health=true")
    health_events, data = [], []
    for i, line in enumerate(lines):
        if line == "event: health":
            health_events.append(json.loads(lines[i + 1][6:]))
        elif line.startswith("data: ") and (i == 0 or lines[i - 1] != "event: health"):
            data.append(line[6:])
    assert data == _replay_lines()
    assert health_events and all(0 <= h["score"] <= 100 for h in health_events)

    finals = [h for h in health_events if h["final"]]
    completed = [json.loads(x) for x in data if json.loads(x)["event_type"] == "MISSION_COMPLETED"]
    assert len(finals) == len(completed)
    for h in finals:
        assert h["score"] == client.get(f"/api/missions/{h['mission_id']}/health").json()["score"], h["mission_id"]
