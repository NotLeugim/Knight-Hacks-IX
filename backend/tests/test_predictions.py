"""
backend/tests/test_predictions.py

Unit and integration tests for predictions service and API endpoints (issue #16 / AI-3):
1. test_trend_watch_active_alerts
2. test_trend_watch_as_of_filtering
3. test_trend_watch_backtest
4. test_trend_watch_drops_vs_rises
5. test_trend_watch_gemini_fallback
6. test_risk_model_leave_one_out_metrics
7. test_risk_model_baselines
8. test_no_hindsight_leakage
9. test_mission_route_forecast
10. test_forecast_what_if_battery
11. test_api_error_handling
"""

import asyncio
import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest
from fastapi.testclient import TestClient

# Force CSV data loading and clear Gemini API key by default
os.environ["ANALYTICS_FORCE_CSV"] = "1"
os.environ.pop("GEMINI_API_KEY", None)

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app
from app.services import predictions as predictions_service


@pytest.fixture(autouse=True)
def clean_predictions_cache():
    """Ensure a pristine cache state for each test."""
    os.environ["ANALYTICS_FORCE_CSV"] = "1"
    os.environ.pop("GEMINI_API_KEY", None)
    predictions_service.clear_predictions_cache()
    yield
    predictions_service.clear_predictions_cache()


@pytest.fixture
def client():
    return TestClient(app)


# ---------------------------------------------------------------------------
# Part A: Trend Watch Tests
# ---------------------------------------------------------------------------
def test_trend_watch_active_alerts():
    """Verify that active trend detection produces exactly 5 alerts sorted by severity."""
    alerts = asyncio.run(predictions_service.get_trend_alerts())
    assert len(alerts) == 5

    # Check descending order of severities
    severities = [a["severity"] for a in alerts]
    assert severities == sorted(severities, reverse=True)

    expected_assets = {"HX-202", "HX-210", "HX-216", "HX-217"}
    found_assets = {a["assetId"] for a in alerts}
    assert found_assets == expected_assets

    # Verify HX-202 sound alert
    hx202 = next(a for a in alerts if a["assetId"] == "HX-202")
    assert hx202["measurementType"] == "SOUND_DB"
    assert hx202["severity"] == pytest.approx(3.9, 0.05)
    assert hx202["direction"] == "up"
    assert len(hx202["readings"]) == 3
    assert hx202["readings"] == [pytest.approx(58.5), pytest.approx(65.6), pytest.approx(81.9)]


def test_trend_watch_as_of_filtering():
    """Verify that as_of timestamp filter excludes readings after that timestamp."""
    # Before M026 (timestamp 2026-09-10T02:06:54)
    cutoff = "2026-09-08T00:00:00"
    alerts = asyncio.run(predictions_service.get_trend_alerts(as_of=cutoff))

    # HX-216 triggers in M026, HX-210 temperature triggers in M025
    # Therefore, neither should be present in active alerts as of 2026-09-08
    asset_measures = {(a["assetId"], a["measurementType"]) for a in alerts}
    assert ("HX-216", "TEMPERATURE_C") not in asset_measures
    assert ("HX-210", "TEMPERATURE_C") not in asset_measures


def test_trend_watch_backtest():
    """Verify walk-forward backtest produces exactly 6 events and 3 followed by failure."""
    backtest = predictions_service.get_trend_backtest()
    assert backtest["totalEvents"] == 6
    assert backtest["followedByFailureCount"] == 3

    # Check HX-202 followed by failure in M027
    hx202 = next(e for e in backtest["events"] if e["assetId"] == "HX-202")
    assert hx202["missionId"] == "M013"
    assert hx202["followedByFailure"] is not None
    assert hx202["followedByFailure"]["missionId"] == "M027"
    assert hx202["followedByFailure"]["failureType"] == "READING_UNRELIABLE"

    # Check PUMP-220 localization confidence drop not followed by failure
    pump220 = next(e for e in backtest["events"] if e["assetId"] == "PUMP-220")
    assert pump220["measurementType"] == "LOCALIZATION_CONFIDENCE_PCT"
    assert pump220["followedByFailure"] is None


def test_trend_watch_drops_vs_rises():
    """Confirm that drops trigger for down metrics and rises trigger for up metrics."""
    # Temperature should trigger on rise >= 10, not on drop
    cfg_temp = predictions_service.TREND_CONFIG["TEMPERATURE_C"]
    assert cfg_temp["direction"] == "up"

    # Visual score should trigger on drop >= 8, not on rise
    cfg_vis = predictions_service.TREND_CONFIG["VISUAL_SCORE"]
    assert cfg_vis["direction"] == "down"

    msg_temp = predictions_service.format_template_trend_message(
        "HX-210", "Heat Exchanger 10", "TEMPERATURE_C", [43.8, 48.3, 73.9]
    )
    assert "rose" in msg_temp
    assert "°C" in msg_temp

    msg_vis = predictions_service.format_template_trend_message(
        "HX-210", "Heat Exchanger 10", "VISUAL_SCORE", [96.0, 92.0, 75.0]
    )
    assert "dropped" in msg_vis
    assert "points" in msg_vis


def test_trend_watch_gemini_fallback():
    """Test Gemini generation with successful mock and fallback when disabled or on error."""
    # 1. No GEMINI_API_KEY -> template fallback
    with patch.dict(os.environ, {}, clear=True):
        msg, gen_by = asyncio.run(
            predictions_service.generate_trend_alert_message(
                "HX-202", "Heat Exchanger 02", "SOUND_DB", [58.5, 65.6, 81.9]
            )
        )
        assert gen_by == "template"
        assert "Heat Exchanger 02" in msg
        assert "rose" in msg

    # 2. Mock Gemini success
    mock_resp = MagicMock()
    mock_resp.text = "Heat Exchanger 02 sound level surged 23.4 dB over three readings; schedule vibration check immediately."

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_resp)

    predictions_service._cached_trend_messages.clear()
    with patch.dict(os.environ, {"GEMINI_API_KEY": "fake_key"}):
        with patch("app.services.predictions.get_client", return_value=mock_client):
            msg, gen_by = asyncio.run(
                predictions_service.generate_trend_alert_message(
                    "HX-202", "Heat Exchanger 02", "SOUND_DB", [58.5, 65.6, 81.9]
                )
            )
            assert gen_by == "gemini"
            assert "Heat Exchanger 02" in msg

    # 3. Mock Gemini error -> template fallback
    predictions_service._cached_trend_messages.clear()
    mock_client.aio.models.generate_content = AsyncMock(side_effect=RuntimeError("API quota exceeded"))
    with patch.dict(os.environ, {"GEMINI_API_KEY": "fake_key"}):
        with patch("app.services.predictions.get_client", return_value=mock_client):
            msg, gen_by = asyncio.run(
                predictions_service.generate_trend_alert_message(
                    "HX-202", "Heat Exchanger 02", "SOUND_DB", [58.5, 65.6, 81.9]
                )
            )
            assert gen_by == "template"
            assert "Heat Exchanger 02" in msg


# ---------------------------------------------------------------------------
# Part B: Pre-mission Risk Forecast Model Tests
# ---------------------------------------------------------------------------
def test_risk_model_leave_one_out_metrics():
    """Verify leave-one-mission-out backtest AUC, Brier score, and top 20% lift."""
    meta = predictions_service.get_model_metadata()
    eval_res = meta["evaluation"]

    # Target: AUC ≈ 0.69 (accept 0.67 - 0.71)
    assert 0.67 <= eval_res["auc"] <= 0.71

    # Target: Brier score ≈ 0.137 (accept 0.130 - 0.142)
    assert 0.130 <= eval_res["brierScore"] <= 0.142

    # Target: Top 20% catches 17-21 failures, lift > 1.7
    top20 = eval_res["top20Percent"]
    assert top20["actionsEvaluated"] == 54
    assert 17 <= top20["failuresCaught"] <= 21
    assert top20["lift"] >= 1.7


def test_risk_model_baselines():
    """Verify model outperforms naive baseline models."""
    meta = predictions_service.get_model_metadata()
    eval_res = meta["evaluation"]
    baselines = eval_res["baselines"]

    # Model AUC (0.69) > Type average (≈0.55) and > Battery only (≈0.64)
    assert eval_res["auc"] > baselines["actionTypeAverageAuc"]
    assert eval_res["auc"] > baselines["batteryOnlyAuc"]
    assert eval_res["auc"] > baselines["randomAuc"]
    assert 0.52 <= baselines["actionTypeAverageAuc"] <= 0.58
    assert 0.62 <= baselines["batteryOnlyAuc"] <= 0.67


def test_no_hindsight_leakage():
    """Verify projected battery calculation never references actions.battery_pct."""
    data = predictions_service.load_predictions_data()
    actions = data["actions"].head(5).copy()

    # Tamper with actual battery_pct in actions dataframe
    actions["battery_pct"] = 999.0
    proj = predictions_service.compute_projected_battery(actions, start_battery_pct=85.0)

    # Projected battery should be unaffected by actual battery_pct
    assert np.all(proj < 100.0)
    assert np.all(proj > 0.0)
    assert proj[0] > proj[1] > proj[2] > proj[3] > proj[4]


def test_mission_route_forecast(client):
    """Verify mission route forecast for M015 returns expected schema and metrics."""
    res = client.get("/api/predictions/missions/M015/forecast")
    assert res.status_code == 200
    data = res.json()

    assert data["missionId"] == "M015"
    assert "actions" in data
    assert len(data["actions"]) == 10

    # Sequence 1..10 in order
    seqs = [a["sequence"] for a in data["actions"]]
    assert seqs == list(range(1, 11))

    # Battery decreases monotonically
    proj_bats = [a["projectedBattery"] for a in data["actions"]]
    assert proj_bats == sorted(proj_bats, reverse=True)

    # Risks between 0 and 1
    for a in data["actions"]:
        assert 0.0 <= a["risk"] <= 1.0
        assert a["actionType"] in [
            "Acoustic Inspection",
            "Gauge Reading",
            "Navigation",
            "Thermal Inspection",
            "Visual Inspection",
        ]
        assert isinstance(a["reasons"], list)
        assert len(a["reasons"]) >= 1

    # Check suggested reordering optimization
    assert data["suggestedReordering"] is not None
    assert data["suggestedReordering"]["reduction"] >= 0.05
    assert "walking distance" in data["suggestedReordering"]["note"]


def test_forecast_what_if_battery(client):
    """Verify what-if battery parameter simulates higher failure risk at lower battery."""
    res_high = client.get("/api/predictions/missions/M015/forecast?start_battery=95")
    assert res_high.status_code == 200
    high_data = res_high.json()

    res_low = client.get("/api/predictions/missions/M015/forecast?start_battery=30")
    assert res_low.status_code == 200
    low_data = res_low.json()

    # Lower battery should result in strictly higher expected failures
    assert low_data["expectedFailures"] > high_data["expectedFailures"]
    assert low_data["chanceAnyFailure"] > high_data["chanceAnyFailure"]


def test_api_error_handling(client):
    """Verify 404 for unknown mission and 422 for invalid query parameters."""
    # 404 for unknown mission
    res_404 = client.get("/api/predictions/missions/UNKNOWN_MISSION/forecast")
    assert res_404.status_code == 404
    assert "Mission not found" in res_404.json()["detail"]

    # 422 for start_battery < 20
    res_low_bat = client.get("/api/predictions/missions/M015/forecast?start_battery=15")
    assert res_low_bat.status_code == 422

    # 422 for start_battery > 100
    res_high_bat = client.get("/api/predictions/missions/M015/forecast?start_battery=105")
    assert res_high_bat.status_code == 422

    # 422 for invalid configuration version
    res_bad_cfg = client.get("/api/predictions/missions/M015/forecast?config=V3")
    assert res_bad_cfg.status_code == 422


def test_m015_reasons_acoustic_and_no_depleted(client):
    """Verify M015 acoustic inspections (steps 5 to 7) include acoustic reason and 'depleted' is never used."""
    res = client.get("/api/predictions/missions/M015/forecast")
    assert res.status_code == 200
    data = res.json()

    for act in data["actions"]:
        for reason in act["reasons"]:
            assert "depleted" not in reason.lower()

    # Steps 5 to 7 (sequence 5, 6, 7) must all include an acoustic reason
    for seq in [5, 6, 7]:
        act = next(a for a in data["actions"] if a["sequence"] == seq)
        assert act["actionType"] == "Acoustic Inspection"
        assert any("acoustic" in r.lower() for r in act["reasons"])

    # Step 1 must NOT claim navigation fails more often than average (raw failure rate is 18.1%, matching fleet average)
    act1 = next(a for a in data["actions"] if a["sequence"] == 1)
    assert not any("Navigation actions fail more often than average" in r for r in act1["reasons"])
    assert any("Navigation adds some risk once battery and location are accounted for" in r for r in act1["reasons"])

