"""
backend/tests/test_plant_impacts.py

Unit tests for power plant weather impact evaluations.
Tests verify:
- Safety thresholds across thunderstorm, wind gust, heavy rain, and heat/cold extremes
- Technology-specific operational rules (Gas, Nuclear, Solar, Wind, BESS, Diverse Mix)
- Source labels attached to every reason
- Centralized config usage
- Endpoint validation and 422 errors for invalid plant types
"""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.services import plant_impacts

client = TestClient(app)


def _build_hour(
    temp: float = 20.0,
    gust: float = 5.0,
    precip: float = 0.0,
    code: int = 0,
    rad: float = 500.0,
    ws80: float = 8.0,
    rh: float = 50.0,
    clouds: float = 20.0,
) -> dict:
    return {
        "time": "2026-10-11T12:00",
        "temperature": temp,
        "apparentTemperature": temp + 1.0,
        "relativeHumidity": rh,
        "precipitation": precip,
        "precipitationProbability": 10.0,
        "weatherCode": code,
        "cloudCover": clouds,
        "shortwaveRadiation": rad,
        "windSpeed10m": gust / 1.5,
        "windGusts10m": gust,
        "windSpeed80m": ws80,
    }


def test_safety_rules_thunderstorm_code_95_warning():
    h = _build_hour(code=95)
    lvl, reasons, _ = plant_impacts._evaluate_common_safety(
        h["temperature"], h["windGusts10m"], h["precipitation"], h["weatherCode"], []
    )
    assert lvl == "Warning"
    assert any("Thunderstorm" in r["text"] for r in reasons)


def test_safety_rules_wind_gusts():
    # 26 m/s -> Warning
    h_warn = _build_hour(gust=26.0)
    lvl_warn, _, _ = plant_impacts._evaluate_common_safety(
        h_warn["temperature"], h_warn["windGusts10m"], h_warn["precipitation"], h_warn["weatherCode"], []
    )
    assert lvl_warn == "Warning"

    # 18 m/s -> Watch
    h_watch = _build_hour(gust=18.0)
    lvl_watch, _, _ = plant_impacts._evaluate_common_safety(
        h_watch["temperature"], h_watch["windGusts10m"], h_watch["precipitation"], h_watch["weatherCode"], []
    )
    assert lvl_watch == "Watch"


def test_safety_rules_heavy_rain_watch():
    h = _build_hour(precip=8.0)
    lvl, reasons, _ = plant_impacts._evaluate_common_safety(
        h["temperature"], h["windGusts10m"], h["precipitation"], h["weatherCode"], []
    )
    assert lvl == "Watch"
    assert any("Heavy rainfall" in r["text"] for r in reasons)


def test_safety_rules_temperature_extremes():
    # 41 °C -> Warning
    h_hot = _build_hour(temp=41.0)
    lvl_hot, _, _ = plant_impacts._evaluate_common_safety(
        h_hot["temperature"], h_hot["windGusts10m"], h_hot["precipitation"], h_hot["weatherCode"], []
    )
    assert lvl_hot == "Warning"

    # -11 °C -> Warning
    h_cold = _build_hour(temp=-11.0)
    lvl_cold, _, _ = plant_impacts._evaluate_common_safety(
        h_cold["temperature"], h_cold["windGusts10m"], h_cold["precipitation"], h_cold["weatherCode"], []
    )
    assert lvl_cold == "Warning"


def test_safety_rules_severe_nws_alert_warning():
    h = _build_hour()
    alerts = [{"severity": "Severe", "headline": "Tornado Warning in effect"}]
    lvl, reasons, _ = plant_impacts._evaluate_common_safety(
        h["temperature"], h["windGusts10m"], h["precipitation"], h["weatherCode"], alerts
    )
    assert lvl == "Warning"
    alert_reason = next(r for r in reasons if "Tornado Warning" in r["text"])
    assert alert_reason["source"] == "National Weather Service alert"


def test_natural_gas_derating_at_35c():
    h = _build_hour(temp=35.0)
    res = plant_impacts.evaluate_natural_gas_impact(h, [])
    # 100 - (35 - 15) * 0.7 = 86.0%
    assert res["estimatedOutputPct"] == 86.0
    assert "~86% of rated" in res["outputLabel"]
    assert any("reduces intake air density" in r["text"] for r in res["reasons"])

    # At 26 °C (approx 92% output), test warm air slightly lowers output wording
    h_mild = _build_hour(temp=26.0)
    res_mild = plant_impacts.evaluate_natural_gas_impact(h_mild, [])
    assert "warm air slightly lowers gas turbine output" in res_mild["outputLabel"]

    # Test diverse mix status for both mild heat (>=90%) and strong heat (<90%)
    mix_mild = plant_impacts.evaluate_mix_impact(h_mild, [])
    assert mix_mild["components"]["natural_gas"]["status"] == "Slightly reduced (warm air)"

    mix_hot = plant_impacts.evaluate_mix_impact(h, [])
    assert mix_hot["components"]["natural_gas"]["status"] == "Reduced in heat"


def test_solar_night_and_radiation_and_hail():
    # Night: rad = 0 -> 0.0
    h_night = _build_hour(rad=0.0)
    res_night = plant_impacts.evaluate_solar_impact(h_night, [])
    assert res_night["estimatedOutputIndex"] == 0.0

    # 800 W/m² at 25 °C -> 0.8
    h_day = _build_hour(temp=25.0, rad=800.0)
    res_day = plant_impacts.evaluate_solar_impact(h_day, [])
    assert res_day["estimatedOutputIndex"] == 0.8

    # Hail code 96 -> Warning
    h_hail = _build_hour(code=96, rad=300.0)
    res_hail = plant_impacts.evaluate_solar_impact(h_hail, [])
    assert res_hail["impactLevel"] == "Warning"
    assert any("Hailstorm" in r["text"] for r in res_hail["reasons"])


def test_wind_power_curve_and_cutout():
    # 2 m/s -> 0.0 (below cut-in)
    h_low = _build_hour(ws80=2.0)
    res_low = plant_impacts.evaluate_wind_impact(h_low, [])
    assert res_low["estimatedOutputIndex"] == 0.0

    # 12 m/s -> 1.0 (rated)
    h_rated = _build_hour(ws80=12.0)
    res_rated = plant_impacts.evaluate_wind_impact(h_rated, [])
    assert res_rated["estimatedOutputIndex"] == 1.0

    # 26 m/s -> 0.0 with shutdown reason
    h_cutout = _build_hour(ws80=26.0)
    res_cutout = plant_impacts.evaluate_wind_impact(h_cutout, [])
    assert res_cutout["estimatedOutputIndex"] == 0.0
    assert res_cutout["impactLevel"] == "Warning"
    assert any("prevent mechanical failure" in r["text"] for r in res_cutout["reasons"])


def test_nuclear_steady_output_and_cooling_note():
    h = _build_hour(temp=36.0)
    res = plant_impacts.evaluate_nuclear_impact(h, [])
    assert res["estimatedOutputPct"] is None
    assert "steady" in res["outputLabel"].lower()
    heat_reason = next(r for r in res["reasons"] if "Ultimate Heat Sink" in r["text"])
    assert "water temp is not in this forecast" in heat_reason["text"]


def test_every_reason_has_valid_source_and_config_is_centralized():
    # Verify thresholds exist in documented config
    assert "thresholds" not in plant_impacts.PLANT_IMPACT_CONFIG  # nested by domain
    assert "safety" in plant_impacts.PLANT_IMPACT_CONFIG
    assert "natural_gas" in plant_impacts.PLANT_IMPACT_CONFIG
    assert "solar" in plant_impacts.PLANT_IMPACT_CONFIG
    assert "wind" in plant_impacts.PLANT_IMPACT_CONFIG

    valid_sources = set(plant_impacts.PLANT_IMPACT_CONFIG["sources"].values())

    h = _build_hour(temp=37.0, gust=27.0, code=95)
    for evaluator in [
        plant_impacts.evaluate_natural_gas_impact,
        plant_impacts.evaluate_nuclear_impact,
        plant_impacts.evaluate_solar_impact,
        plant_impacts.evaluate_wind_impact,
        plant_impacts.evaluate_battery_impact,
    ]:
        res = evaluator(h, [])
        for r in res["reasons"]:
            assert "source" in r
            assert r["source"] in valid_sources, f"Source '{r['source']}' not in configured sources"


def test_invalid_plant_type_returns_422():
    response = client.get("/api/weather/plant-impacts?lat=28.5&lon=-81.3&plant=fusion")
    assert response.status_code == 422
    assert "Invalid plant type" in response.text
