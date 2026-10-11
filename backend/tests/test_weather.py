"""
backend/tests/test_weather.py

Unit tests for weather forecasting, geocoding, and caching.
All external network calls to Open-Meteo and NWS are mocked.
Tests NEVER invoke live external APIs.
"""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
import httpx
import pytest

from app.main import app
from app.services import weather as weather_service

client = TestClient(app)

MOCK_GEOCODE_RESPONSE = {
    "results": [
        {
            "id": 4167147,
            "name": "Orlando",
            "latitude": 28.5383,
            "longitude": -81.3792,
            "country_code": "US",
            "timezone": "America/New_York",
            "country": "United States",
            "admin1": "Florida",
        }
    ]
}

MOCK_FORECAST_RESPONSE = {
    "latitude": 28.54,
    "longitude": -81.38,
    "timezone": "America/New_York",
    "elevation": 32.0,
    "hourly": {
        "time": [f"2026-10-11T{h:02d}:00" for h in range(48)],
        "temperature_2m": [25.0 + (h % 5) for h in range(48)],
        "apparent_temperature": [26.0 + (h % 5) for h in range(48)],
        "relative_humidity_2m": [60.0 for _ in range(48)],
        "precipitation": [0.0 for _ in range(48)],
        "precipitation_probability": [10.0 for _ in range(48)],
        "weather_code": [0 for _ in range(48)],
        "cloud_cover": [20.0 for _ in range(48)],
        "shortwave_radiation": [500.0 if 7 <= (h % 24) <= 18 else 0.0 for h in range(48)],
        "wind_speed_10m": [4.0 for _ in range(48)],
        "wind_gusts_10m": [7.0 for _ in range(48)],
        "wind_speed_80m": [6.0 for _ in range(48)],
    },
    "daily": {
        "time": [f"2026-10-{11+d:02d}" for d in range(7)],
        "temperature_2m_max": [30.0 for _ in range(7)],
        "temperature_2m_min": [20.0 for _ in range(7)],
        "precipitation_sum": [0.0 for _ in range(7)],
        "weather_code": [0 for _ in range(7)],
        "wind_gusts_10m_max": [8.0 for _ in range(7)],
        "sunrise": ["2026-10-11T07:15" for _ in range(7)],
        "sunset": ["2026-10-11T19:00" for _ in range(7)],
    },
}

MOCK_NWS_ALERTS = {
    "features": [
        {
            "id": "urn:oid:2.49.0.1.840.0.mock",
            "properties": {
                "id": "NWS-TEST-001",
                "event": "Flood Watch",
                "severity": "Moderate",
                "headline": "Flood Watch issued October 11 at 4:00AM EDT",
                "description": "Flooding possible in low-lying areas.",
                "effective": "2026-10-11T08:00:00-04:00",
                "expires": "2026-10-12T08:00:00-04:00",
            },
        }
    ]
}


@pytest.fixture(autouse=True)
def clear_cache():
    weather_service.clear_weather_cache()


def test_geocode_short_query_returns_422():
    response = client.get("/api/weather/geocode?q=a")
    assert response.status_code == 422
    assert "at least 2 characters" in response.text


def test_forecast_invalid_coordinates_returns_422():
    # Lat out of range
    res_lat = client.get("/api/weather/forecast?lat=95.0&lon=0.0")
    assert res_lat.status_code == 422

    # Lon out of range
    res_lon = client.get("/api/weather/forecast?lat=0.0&lon=200.0")
    assert res_lon.status_code == 422


def test_forecast_upstream_timeout_returns_503():
    with patch("httpx.AsyncClient.get", side_effect=httpx.TimeoutException("Mock connection timed out")):
        response = client.get("/api/weather/forecast?lat=28.5383&lon=-81.3792")
        assert response.status_code == 503
        assert "Weather is unavailable right now." in response.json()["detail"]


def test_geocode_success_with_mock():
    mock_resp = AsyncMock()
    mock_resp.status_code = 200
    mock_resp.json = lambda: MOCK_GEOCODE_RESPONSE
    mock_resp.raise_for_status = lambda: None

    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        response = client.get("/api/weather/geocode?q=Orlando")
        assert response.status_code == 200
        data = response.json()
        assert data["query"] == "Orlando"
        assert len(data["results"]) == 1
        assert data["results"][0]["name"] == "Orlando"
        assert data["results"][0]["country"] == "United States"


def test_forecast_caching_makes_only_one_upstream_call():
    forecast_mock = AsyncMock()
    forecast_mock.status_code = 200
    forecast_mock.json = lambda: MOCK_FORECAST_RESPONSE
    forecast_mock.raise_for_status = lambda: None

    nws_mock = AsyncMock()
    nws_mock.status_code = 200
    nws_mock.json = lambda: MOCK_NWS_ALERTS
    nws_mock.raise_for_status = lambda: None

    call_count = 0

    async def mock_get(url, *args, **kwargs):
        nonlocal call_count
        call_count += 1
        if "weather.gov" in url:
            return nws_mock
        return forecast_mock

    with patch("httpx.AsyncClient.get", side_effect=mock_get):
        # 1st request
        res1 = client.get("/api/weather/forecast?lat=28.5383&lon=-81.3792&name=Orlando")
        assert res1.status_code == 200
        first_calls = call_count
        assert first_calls >= 1

        # 2nd request with same rounded coordinates
        res2 = client.get("/api/weather/forecast?lat=28.5390&lon=-81.3801&name=Orlando")
        assert res2.status_code == 200
        # Call count should not have increased because of 15-minute cache
        assert call_count == first_calls

        # Verify parsed payload
        data = res2.json()
        assert data["location"]["name"] == "Orlando"
        assert len(data["hourly"]) == 48
        assert len(data["daily"]) == 7
        assert len(data["alerts"]) == 1
        assert data["alerts"][0]["event"] == "Flood Watch"
        assert "Open-Meteo" in data["credits"]["forecast"]
