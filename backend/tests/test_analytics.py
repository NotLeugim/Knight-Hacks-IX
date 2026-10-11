"""
backend/tests/test_analytics.py

Automated tests for SPOTSight analytics endpoints and confidence scoring (issue #3 / DATA-2).
Covers:
1. GET /api/analytics 200 response with all required top-level keys.
2. V1/V2 configuration comparison metrics match validation_results.json.
3. Battery reliability bands match expected rows and verify higher failure rate below 30% battery.
4. Mission paradox summary matches expected counts (26 completed, 21 with failures, 5 clean, 1 failed).
5. Confidence scoring spot checks and fleet average.
6. Single mission confidence endpoint (GET /api/missions/{mission_id}/confidence) 200 and 404 behavior.
7. Exact schema contract compatibility with frontend TypeScript definitions.
"""

import json
import os
import sys
from pathlib import Path

# Force CSV data source for repeatable test execution without database requirement
os.environ["ANALYTICS_FORCE_CSV"] = "1"

# Ensure backend root is in sys.path
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.analytics import clear_analytics_cache


@pytest.fixture(autouse=True)
def reset_cache():
    """Ensure analytics cache is cleared before and after each test."""
    clear_analytics_cache()
    yield
    clear_analytics_cache()


@pytest.fixture
def client():
    return TestClient(app)


def test_1_get_analytics_endpoint_keys(client):
    """
    1. GET /api/analytics returns 200 and contains batteryReliability,
       missionParadox, configComparison, confidence, and source.
    """
    response = client.get("/api/analytics")
    assert response.status_code == 200

    data = response.json()
    assert "batteryReliability" in data
    assert "missionParadox" in data
    assert "configComparison" in data
    assert "confidence" in data
    assert "source" in data
    assert data["source"] in ("database", "csv")


def test_2_config_comparison_matches_validation_results(client):
    """
    2. V1/V2 numbers equal the values in validation_results.json (read dynamically).
    """
    repo_root = BACKEND_DIR.parent
    val_file = (
        repo_root
        / "data"
        / "SPOT_KnightHacks_Challenge_Kit Part One"
        / "02_DATA"
        / "validation_results.json"
    )
    assert val_file.exists(), f"Missing validation results file at {val_file}"

    with open(val_file, "r", encoding="utf-8") as f:
        val_data = json.load(f)

    metrics = val_data["metrics"]
    expected_v1_mission_comp = metrics["baseline_mission_completion_pct"]
    expected_v1_action_succ = metrics["baseline_action_success_pct"]
    expected_v2_mission_comp = metrics["improved_mission_completion_pct"]
    expected_v2_action_succ = metrics["improved_action_success_pct"]

    response = client.get("/api/analytics")
    assert response.status_code == 200
    cfg = response.json()["configComparison"]

    assert cfg["V1"]["missionCompletionPct"] == expected_v1_mission_comp
    assert cfg["V1"]["actionSuccessPct"] == expected_v1_action_succ
    assert cfg["V2"]["missionCompletionPct"] == expected_v2_mission_comp
    assert cfg["V2"]["actionSuccessPct"] == expected_v2_action_succ

    assert cfg["V1"]["missions"] == 18
    assert cfg["V1"]["actions"] == 180
    assert cfg["V2"]["missions"] == 9
    assert cfg["V2"]["actions"] == 90
    assert cfg["V1"]["minBatteryPct"] == 12
    assert cfg["V2"]["minBatteryPct"] == 52

    eq = cfg["equalBattery"]
    assert eq["aboveBatteryPct"] == 50
    assert eq["V1"]["actions"] == 73
    assert eq["V1"]["actionSuccessPct"] == 87.7
    assert eq["V2"]["actions"] == 90
    assert eq["V2"]["actionSuccessPct"] == 91.1


def test_3_battery_bands_and_low_battery_reliability(client):
    """
    3. Battery bands equal the seven expected rows, and the combined failure rate
       below 30% is greater than the combined rate at or above 30%.
    """
    response = client.get("/api/analytics")
    assert response.status_code == 200

    bands = response.json()["batteryReliability"]
    assert len(bands) == 7

    expected_bands = [
        {"band": "<20%", "minPct": 0, "maxPct": 20, "actions": 11, "failed": 8, "failureRatePct": 72.7},
        {"band": "20-30%", "minPct": 20, "maxPct": 30, "actions": 26, "failed": 11, "failureRatePct": 42.3},
        {"band": "30-40%", "minPct": 30, "maxPct": 40, "actions": 34, "failed": 6, "failureRatePct": 17.6},
        {"band": "40-50%", "minPct": 40, "maxPct": 50, "actions": 32, "failed": 6, "failureRatePct": 18.8},
        {"band": "50-60%", "minPct": 50, "maxPct": 60, "actions": 41, "failed": 4, "failureRatePct": 9.8},
        {"band": "60-70%", "minPct": 60, "maxPct": 70, "actions": 47, "failed": 1, "failureRatePct": 2.1},
        {"band": "70%+", "minPct": 70, "maxPct": 101, "actions": 79, "failed": 13, "failureRatePct": 16.5},
    ]

    for actual, expected in zip(bands, expected_bands):
        assert actual["band"] == expected["band"]
        assert actual["minPct"] == expected["minPct"]
        assert actual["maxPct"] == expected["maxPct"]
        assert actual["actions"] == expected["actions"]
        assert actual["failed"] == expected["failed"]
        assert actual["failureRatePct"] == expected["failureRatePct"]

    # Combined failure rate below 30% vs >= 30%
    below_30_actions = sum(b["actions"] for b in bands if b["maxPct"] <= 30)
    below_30_failed = sum(b["failed"] for b in bands if b["maxPct"] <= 30)
    below_30_rate = (below_30_failed / below_30_actions) * 100

    above_30_actions = sum(b["actions"] for b in bands if b["minPct"] >= 30)
    above_30_failed = sum(b["failed"] for b in bands if b["minPct"] >= 30)
    above_30_rate = (above_30_failed / above_30_actions) * 100

    assert below_30_rate > above_30_rate
    assert below_30_rate > 50.0
    assert above_30_rate < 15.0


def test_4_mission_paradox_summary_and_missions(client):
    """
    4. missionParadox.summary equals 26 / 21 / 5 / 1, and missions has 27 entries.
    """
    response = client.get("/api/analytics")
    assert response.status_code == 200

    paradox = response.json()["missionParadox"]
    summary = paradox["summary"]

    assert summary["reportedCompleted"] == 26
    assert summary["completedWithFailures"] == 21
    assert summary["completedClean"] == 5
    assert summary["reportedFailed"] == 1

    missions = paradox["missions"]
    assert len(missions) == 27


def test_5_confidence_score_rules_and_spot_checks(client):
    """
    5. Every confidence score is an integer from 0 to 100;
       spot checks (M005=100, M006=45, M015=51, M020=65, M023=100) pass;
       fleetAverage == 72.1.
    """
    response = client.get("/api/analytics")
    assert response.status_code == 200

    confidence = response.json()["confidence"]
    assert confidence["fleetAverage"] == 72.1

    missions = confidence["missions"]
    assert len(missions) == 27

    score_by_id = {}
    for m in missions:
        score = m["score"]
        assert isinstance(score, int)
        assert 0 <= score <= 100
        score_by_id[m["missionId"]] = score

    assert score_by_id["M005"] == 100
    assert score_by_id["M006"] == 45
    assert score_by_id["M015"] == 51
    assert score_by_id["M020"] == 65
    assert score_by_id["M023"] == 100


def test_6_single_mission_confidence_endpoint(client):
    """
    6. GET /api/missions/M006/confidence returns score 45;
       GET /api/missions/M999/confidence returns 404.
    """
    res_m006 = client.get("/api/missions/M006/confidence")
    assert res_m006.status_code == 200
    m006_data = res_m006.json()

    assert m006_data["missionId"] == "M006"
    assert m006_data["score"] == 45
    assert m006_data["failedActions"] == 3
    assert m006_data["anomalyCount"] == 3
    assert m006_data["anomalyDeduction"] == 25
    assert isinstance(m006_data["breakdown"], list)
    assert len(m006_data["breakdown"]) == 6

    # Verify 404 for unknown mission
    res_unknown = client.get("/api/missions/M999/confidence")
    assert res_unknown.status_code == 404
    assert "not found" in res_unknown.json()["detail"].lower()


def test_7_response_shape_matches_frontend_contract(client):
    """
    7. The response shape matches the frontend contract:
       every batteryReliability item has band, minPct, maxPct, actions, failed, failureRatePct;
       every mission has missionId, reportedStatus, config, actionsSucceeded, actionsFailed.
    """
    response = client.get("/api/analytics")
    assert response.status_code == 200
    data = response.json()

    # Frontend battery contract check
    for item in data["batteryReliability"]:
        assert isinstance(item["band"], str)
        assert isinstance(item["minPct"], (int, float))
        assert isinstance(item["maxPct"], (int, float))
        assert isinstance(item["actions"], int)
        assert isinstance(item["failed"], int)
        assert isinstance(item["failureRatePct"], (int, float))

    # Frontend paradox mission contract check
    for mission in data["missionParadox"]["missions"]:
        assert isinstance(mission["missionId"], str)
        assert isinstance(mission["reportedStatus"], str)
        assert isinstance(mission["config"], str)
        assert isinstance(mission["actionsSucceeded"], int)
        assert isinstance(mission["actionsFailed"], int)
