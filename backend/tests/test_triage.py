"""
Tests for the risk-ranked triage queue (issue #10 / API-2).

Run from backend/:  python -m pytest tests/test_triage.py -v
Uses the challenge kit CSVs (TRIAGE_FORCE_CSV=1), so it never touches Neon.
"""
import csv
import sys
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR.parent / "data" / "SPOT_KnightHacks_Challenge_Kit Part One" / "02_DATA"
sys.path.insert(0, str(BACKEND_DIR))

from app.main import app as fastapi_app  # noqa: E402
from app.services import triage  # noqa: E402
from app.services.triage import calculate_triage_score  # noqa: E402

LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


def _csv(name):
    with open(DATA_DIR / f"{name}.csv", newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


@pytest.fixture(scope="module")
def client():
    mp = pytest.MonkeyPatch()
    mp.setenv("TRIAGE_FORCE_CSV", "1")
    with TestClient(fastapi_app) as c:
        yield c
    mp.undo()


@pytest.fixture(scope="module")
def queue(client):
    r = client.get("/api/triage")
    assert r.status_code == 200, r.text
    return r.json()["queue"]


# ── calculate_triage_score ────────────────────────────────────────────────────
def test_score_is_severity_times_criticality():
    for i, sev in enumerate(LEVELS, start=1):
        for j, crit in enumerate(LEVELS, start=1):
            assert calculate_triage_score(sev, crit) == i * j


def test_score_case_insensitive_and_unknown_is_zero():
    assert calculate_triage_score("critical", "high") == 12
    assert calculate_triage_score("BOGUS", "HIGH") == 0
    assert calculate_triage_score("HIGH", None) == 0


def test_critical_on_high_beats_low_on_low():
    assert calculate_triage_score("CRITICAL", "HIGH") > calculate_triage_score("LOW", "LOW")


# ── Pass check 1: valid JSON array of anomaly objects ─────────────────────────
def test_endpoint_returns_array_of_anomaly_objects(queue):
    assert isinstance(queue, list) and queue
    for item in queue:
        assert isinstance(item, dict)
        for field in ("id", "title", "description", "severity", "timestamp", "triage_score"):
            assert field in item, field


def test_every_anomaly_appears_exactly_once(queue):
    assert sorted(i["id"] for i in queue) == sorted(a["anomaly_id"] for a in _csv("anomalies"))


def test_scores_match_hand_calculation(queue):
    crit = {a["asset_id"]: a["criticality"] for a in _csv("assets")}
    weight = {lvl: n for n, lvl in enumerate(LEVELS, start=1)}
    expected = {a["anomaly_id"]: weight[a["severity"]] * weight[crit[a["asset_id"]]] for a in _csv("anomalies")}
    assert {i["id"]: i["triage_score"] for i in queue} == expected


def test_sorted_descending_by_score(queue):
    scores = [i["triage_score"] for i in queue]
    assert scores == sorted(scores, reverse=True)
    assert [i["rank"] for i in queue] == list(range(1, len(queue) + 1))


# ── Pass check 2: CRITICAL/HIGH always above LOW/LOW ──────────────────────────
def test_critical_high_above_low_low_in_real_data(queue):
    pos = {i["id"]: n for n, i in enumerate(queue)}
    top = [i["id"] for i in queue if i["severity"] == "CRITICAL" and i["asset_criticality"] == "HIGH"]
    bottom = [i["id"] for i in queue if i["severity"] == "LOW" and i["asset_criticality"] == "LOW"]
    for a in top:
        for b in bottom:
            assert pos[a] < pos[b], (a, b)


def test_critical_high_above_low_low_even_when_older(monkeypatch):
    """Ranking is by risk, not time: the LOW/LOW anomaly is newer but must rank last."""
    anomalies = pd.DataFrame([
        {"anomaly_id": "OLD-CRIT", "action_id": "A1", "mission_id": "M1", "location_id": "WP01",
         "asset_id": "AS-HIGH", "timestamp": "2026-01-01T00:00:00", "anomaly_type": "ABNORMAL_TEMPERATURE",
         "severity": "CRITICAL", "operator_review_required": True, "description": "x"},
        {"anomaly_id": "NEW-LOW", "action_id": "A2", "mission_id": "M1", "location_id": "WP01",
         "asset_id": "AS-LOW", "timestamp": "2026-12-31T23:59:59", "anomaly_type": "SIGNAL_DEGRADATION",
         "severity": "LOW", "operator_review_required": False, "description": "y"},
    ])
    assets = pd.DataFrame([
        {"asset_id": "AS-HIGH", "asset_name": "High Asset", "criticality": "HIGH"},
        {"asset_id": "AS-LOW", "asset_name": "Low Asset", "criticality": "LOW"},
    ])
    locations = pd.DataFrame([{"location_id": "WP01", "location_name": "Main Entrance"}])
    monkeypatch.setattr(triage, "_load", lambda: (anomalies, assets, locations, "test"))
    q = triage.get_triage_queue()["queue"]
    assert [i["id"] for i in q] == ["OLD-CRIT", "NEW-LOW"]
    assert q[0]["triage_score"] == 12 and q[1]["triage_score"] == 1


# ── Top N, alias, metadata ────────────────────────────────────────────────────
def test_limit_returns_top_n(client, queue):
    r = client.get("/api/triage?limit=5").json()
    assert [i["id"] for i in r["queue"]] == [i["id"] for i in queue[:5]]
    assert r["count"] == 5 and r["total"] == len(queue)


def test_invalid_limit_rejected(client):
    assert client.get("/api/triage?limit=0").status_code == 422


def test_legacy_alias_matches(client):
    assert client.get("/triage").json()["queue"] == client.get("/api/triage").json()["queue"]


def test_response_metadata(client):
    body = client.get("/api/triage").json()
    assert body["source"] == "csv"
    assert body["scoring"]["range"] == [1, 16]
