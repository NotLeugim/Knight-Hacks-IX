"""
backend/tests/test_summary.py

Automated test suite for SPOTSight shift summaries and replay triggers (issue #15 / AI-2).
Covers:
1. M005 all-clear rule: status 'all_clear', generatedBy 'rule', exact first bullet.
2. M026 status 'issues' with MEDIUM visual defect.
3. M017 summary reflects reported FAILED.
4. M025 (absent from replay.ndjson) generates valid summary on demand.
5. All 27 missions produce exactly 3 markdown bullets starting with '- '.
6. Gemini mock branches: valid 3 bullets -> 'gemini', 2 bullets -> fallback 'template',
   exception/timeout -> fallback 'template'. Never calls live Gemini API.
7. handle_replay_event and POST /api/events/replay handle MISSION_COMPLETED vs other events.
8. Unknown mission 404 and /api/shift-handoff?limit=3 returns [M027, M026, M025].
9. Asset and location names in summaries are grounded strictly in the data.
"""

import asyncio
import os
import sys
from pathlib import Path

# Force CSV data loading and ensure live Gemini API is never called
os.environ["ANALYTICS_FORCE_CSV"] = "1"
os.environ.pop("GEMINI_API_KEY", None)

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import summary as summary_service
from app.services.analytics import clear_analytics_cache


@pytest.fixture(autouse=True)
def clean_state():
    """Clear all caches before and after every test."""
    os.environ.pop("GEMINI_API_KEY", None)
    summary_service.clear_summary_cache()
    clear_analytics_cache()
    yield
    summary_service.clear_summary_cache()
    clear_analytics_cache()


@pytest.fixture
def client():
    return TestClient(app)


def test_1_all_clear_mission_m005(client):
    """
    1. M005 returns status 'all_clear', generatedBy 'rule', and first bullet
       exactly 'All clear, no anomalies detected.'
    """
    res = client.get("/api/missions/M005/summary")
    assert res.status_code == 200
    data = res.json()

    assert data["missionId"] == "M005"
    assert data["status"] == "all_clear"
    assert data["generatedBy"] == "rule"
    assert data["bullets"][0] == "- All clear, no anomalies detected."
    assert data["bullets"][1] == "- All 10 actions completed successfully."
    assert data["bullets"][2] == "- No operator follow-up needed for this mission."
    assert len(data["bullets"]) == 3
    assert data["confidence"] == 100


def test_2_m026_issues_and_visual_defect(client):
    """
    2. M026 returns status 'issues' (NOT all clear) and mentions its MEDIUM visual defect.
    """
    res = client.get("/api/missions/M026/summary")
    assert res.status_code == 200
    data = res.json()

    assert data["missionId"] == "M026"
    assert data["status"] == "issues"
    assert data["generatedBy"] in ("template", "rule")

    text_content = " ".join(data["bullets"])
    assert "MEDIUM" in text_content
    assert "visual defect" in text_content.lower()

    # M026 has 1 anomaly total, so bullet 3 must not contain "0 other anomalies"
    assert "0 other anomalies" not in data["bullets"][2]
    assert data["bullets"][2] == "- No other anomalies. Mission confidence score: 95/100."


def test_3_m017_reflects_reported_failed(client):
    """
    3. M017 summary reflects that it reported FAILED.
    """
    res = client.get("/api/missions/M017/summary")
    assert res.status_code == 200
    data = res.json()

    assert data["missionId"] == "M017"
    assert data["reportedStatus"] == "FAILED"
    text_content = " ".join(data["bullets"])
    assert "FAILED" in text_content


def test_4_m025_valid_on_demand_summary(client):
    """
    4. M025 (never completes in replay.ndjson) still returns a valid summary.
    """
    res = client.get("/api/missions/M025/summary")
    assert res.status_code == 200
    data = res.json()

    assert data["missionId"] == "M025"
    assert len(data["bullets"]) == 3
    for b in data["bullets"]:
        assert b.startswith("- ")


def test_5_all_27_missions_return_3_bullets(client):
    """
    5. Every one of the 27 missions returns exactly 3 bullets, each starting
       with '- ' in summaryMarkdown.
    """
    for i in range(1, 28):
        m_id = f"M{i:03d}"
        res = client.get(f"/api/missions/{m_id}/summary")
        assert res.status_code == 200, f"Mission {m_id} failed with {res.status_code}"
        data = res.json()

        assert len(data["bullets"]) == 3, f"{m_id} did not return 3 bullets"
        for b in data["bullets"]:
            assert b.startswith("- "), f"{m_id} bullet missing '- ': {b}"

        lines = data["summaryMarkdown"].split("\n")
        assert len(lines) == 3, f"{m_id} summaryMarkdown line count mismatch"
        for line in lines:
            assert line.startswith("- "), f"{m_id} summaryMarkdown line missing '- ': {line}"


def test_6_mocked_gemini_scenarios(client, monkeypatch):
    """
    6. Mocked valid Gemini response -> generatedBy 'gemini' with those 3 bullets.
       Mocked 2-bullet response -> falls back to 'template'.
       Mocked exception and mocked timeout -> 'template'.
    """
    monkeypatch.setenv("GEMINI_API_KEY", "mock-test-key")

    # Case A: Valid 3-bullet response
    async def mock_valid_gemini(facts):
        return (
            "- Urgent: CRITICAL vibration detected on Motor 06 in Compressor Area; inspect immediately.\n"
            "- 2 of 10 actions failed, even though the mission reported COMPLETED.\n"
            "- 1 other anomaly remains; overall mission confidence is 65/100."
        )

    monkeypatch.setattr(summary_service, "call_gemini_for_summary", mock_valid_gemini)
    res_a = client.get("/api/missions/M006/summary?regenerate=true")
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["generatedBy"] == "gemini"
    assert len(data_a["bullets"]) == 3
    assert "Motor 06" in data_a["bullets"][0]

    # Case B: 2-bullet response (must fall back to template)
    async def mock_two_bullets(facts):
        return "- Only first bullet.\n- Only second bullet."

    monkeypatch.setattr(summary_service, "call_gemini_for_summary", mock_two_bullets)
    res_b = client.get("/api/missions/M006/summary?regenerate=true")
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["generatedBy"] == "template"
    assert len(data_b["bullets"]) == 3

    # Case C: Mocked exception
    async def mock_error(facts):
        raise RuntimeError("Gemini connection error")

    monkeypatch.setattr(summary_service, "call_gemini_for_summary", mock_error)
    res_c = client.get("/api/missions/M006/summary?regenerate=true")
    assert res_c.status_code == 200
    data_c = res_c.json()
    assert data_c["generatedBy"] == "template"

    # Case D: Mocked timeout
    async def mock_timeout(facts):
        raise asyncio.TimeoutError()

    monkeypatch.setattr(summary_service, "call_gemini_for_summary", mock_timeout)
    res_d = client.get("/api/missions/M006/summary?regenerate=true")
    assert res_d.status_code == 200
    data_d = res_d.json()
    assert data_d["generatedBy"] == "template"


def test_7_replay_event_trigger(client):
    """
    7. handle_replay_event with a fake MISSION_COMPLETED event for M015 returns
       M015's summary; an ACTION_STARTED event returns None.
       POST /api/events/replay behaves the same.
    """
    comp_event = {
        "event_id": "EV_M015_END",
        "mission_id": "M015",
        "timestamp": "2026-09-06T10:34:00",
        "event_type": "MISSION_COMPLETED",
        "details": {"status": "COMPLETED", "end_battery_pct": 27},
    }

    start_event = {
        "event_id": "EV_M015_START",
        "mission_id": "M015",
        "timestamp": "2026-09-06T10:00:00",
        "event_type": "ACTION_STARTED",
        "details": {"action_id": "A0141"},
    }

    # Direct function call
    res_comp = asyncio.run(summary_service.handle_replay_event(comp_event))
    assert res_comp is not None
    assert res_comp["missionId"] == "M015"
    assert res_comp["reportedStatusAtEnd"] == "COMPLETED"

    res_start = asyncio.run(summary_service.handle_replay_event(start_event))
    assert res_start is None

    # HTTP endpoint call
    post_comp = client.post("/api/events/replay", json=comp_event)
    assert post_comp.status_code == 200
    assert post_comp.json()["triggered"] is True
    assert post_comp.json()["summary"]["missionId"] == "M015"

    post_start = client.post("/api/events/replay", json=start_event)
    assert post_start.status_code == 200
    assert post_start.json()["triggered"] is False
    assert "summary" not in post_start.json()


def test_8_error_handling_and_shift_handoff(client):
    """
    8. GET /api/missions/M999/summary -> 404.
       GET /api/shift-handoff?limit=3 returns 3 missions, newest first (M027, M026, M025).
    """
    res_404 = client.get("/api/missions/M999/summary")
    assert res_404.status_code == 404
    assert "not found" in res_404.json()["detail"].lower()

    res_handoff = client.get("/api/shift-handoff?limit=3")
    assert res_handoff.status_code == 200
    missions = res_handoff.json()["missions"]
    assert len(missions) == 3
    ids = [m["missionId"] for m in missions]
    assert ids == ["M027", "M026", "M025"]


def test_9_asset_and_location_grounding(client):
    """
    9. No summary contains an asset or location name that isn't in the data.
    """
    import pandas as pd
    repo_root = BACKEND_DIR.parent
    data_dir = repo_root / "data" / "SPOT_KnightHacks_Challenge_Kit Part One" / "02_DATA"

    loc_df = pd.read_csv(data_dir / "locations.csv")
    asset_df = pd.read_csv(data_dir / "assets.csv")

    valid_loc_names = set(loc_df["location_name"].tolist())
    valid_asset_names = set(asset_df["asset_name"].tolist())

    for i in range(1, 28):
        m_id = f"M{i:03d}"
        res = client.get(f"/api/missions/{m_id}/summary")
        assert res.status_code == 200
        data = res.json()

        facts = data["facts"]
        for anom in facts["anomalies"]:
            assert anom["locationName"] in valid_loc_names
            assert anom["assetName"] in valid_asset_names

        for act in facts["failedActions"]:
            assert act["locationName"] in valid_loc_names


def test_10_m015_clean_wording_no_raw_codes(client):
    """
    10. M015 summary does not contain 'most common' (since all 3 failures are distinct)
        and contains no raw failure codes like LOCALIZATION_FAILURE.
    """
    res = client.get("/api/missions/M015/summary")
    assert res.status_code == 200
    data = res.json()

    # Bullet 2: Check failure description
    bullet_2 = data["bullets"][1]
    assert "most common" not in bullet_2
    raw_codes = [
        "LOCALIZATION_FAILURE",
        "SENSOR_TIMEOUT",
        "SIGNAL_NOISE",
        "READING_UNRELIABLE",
        "TARGET_NOT_DETECTED",
        "COMMUNICATION_LOSS",
        "PATH_BLOCKED",
        "OBSTACLE_DETECTION",
    ]
    for code in raw_codes:
        assert code not in bullet_2

    assert "lost localization at Pipe Gallery" in bullet_2
    assert "sensor timeout at Pump Bay" in bullet_2
    assert "signal noise at Control Room Corridor" in bullet_2

    # Bullet 3: Check remaining anomalies
    bullet_3 = data["bullets"][2]
    assert "0 require" not in bullet_3
    assert "3 other anomalies remain" in bullet_3
    assert "Mission confidence score: 51/100." in bullet_3
