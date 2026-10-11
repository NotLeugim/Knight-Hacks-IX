"""
backend/app/services/weather.py

Service for retrieving external weather forecasts and geocoding via Open-Meteo
and official alerts via the National Weather Service (weather.gov).
Features:
- Free, no-key endpoints
- 15-minute in-memory cache rounded to 2 decimals for latitude/longitude
- 10-second request timeout via httpx
- Graceful degradation on missing variables or non-US alert queries
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import logging
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)

OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
NWS_ALERTS_URL = "https://api.weather.gov/alerts/active"

NWS_USER_AGENT = "SPOTSight hackathon project (contact@spotsight.internal)"
HTTP_TIMEOUT_SECONDS = 10.0
CACHE_TTL_SECONDS = 900  # 15 minutes

# In-memory cache: (round(lat, 2), round(lon, 2)) -> (timestamp, data_dict)
_forecast_cache: dict[tuple[float, float], tuple[float, dict[str, Any]]] = {}


def clear_weather_cache() -> None:
    """Clears the in-memory weather forecast cache (useful for testing)."""
    _forecast_cache.clear()


async def geocode_location(query: str, limit: int = 5) -> list[dict[str, Any]]:
    """
    Searches for locations matching the query using Open-Meteo geocoding.
    Returns up to `limit` matches with name, region (admin1), country, lat, lon.
    """
    clean_q = query.strip()
    if len(clean_q) < 2:
        raise ValueError("Query string must be at least 2 characters")

    params = {
        "name": clean_q,
        "count": min(max(1, limit), 10),
        "language": "en",
        "format": "json",
    }

    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
            resp = await client.get(OPEN_METEO_GEOCODING_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except (httpx.RequestError, httpx.HTTPStatusError) as exc:
        logger.warning("Geocoding request failed for '%s': %s", clean_q, exc)
        raise RuntimeError("Geocoding service unavailable") from exc

    results: list[dict[str, Any]] = []
    raw_results = data.get("results") or []
    for item in raw_results[:limit]:
        results.append(
            {
                "id": item.get("id"),
                "name": item.get("name", clean_q),
                "region": item.get("admin1") or item.get("admin2") or "",
                "country": item.get("country") or "",
                "countryCode": item.get("country_code") or "",
                "latitude": float(item.get("latitude", 0.0)),
                "longitude": float(item.get("longitude", 0.0)),
                "timezone": item.get("timezone") or "UTC",
            }
        )

    return results


async def _fetch_nws_alerts(client: httpx.AsyncClient, lat: float, lon: float) -> list[dict[str, Any]]:
    """
    Queries the National Weather Service active alerts for a coordinate point.
    Returns parsed alerts list, or empty list if outside the US or on upstream failure.
    """
    # Only US coords roughly fall within (-180..-65) lon and (18..72) lat
    if not (18.0 <= lat <= 72.0 and -180.0 <= lon <= -65.0):
        return []

    url = f"{NWS_ALERTS_URL}?point={lat:.4f},{lon:.4f}"
    headers = {
        "User-Agent": NWS_USER_AGENT,
        "Accept": "application/geo+json",
    }

    try:
        resp = await client.get(url, headers=headers)
        if resp.status_code == 404 or resp.status_code >= 400:
            # Point outside NWS forecast zones or temporary error
            return []
        data = resp.json()
        features = data.get("features") or []
        alerts: list[dict[str, Any]] = []

        for feat in features:
            props = feat.get("properties") or {}
            alerts.append(
                {
                    "id": props.get("id") or str(feat.get("id") or ""),
                    "event": props.get("event") or "Weather Alert",
                    "severity": props.get("severity") or "Unknown",
                    "urgency": props.get("urgency") or "Unknown",
                    "certainty": props.get("certainty") or "Unknown",
                    "headline": props.get("headline") or props.get("description") or "",
                    "description": props.get("description") or "",
                    "instruction": props.get("instruction") or "",
                    "effective": props.get("effective") or "",
                    "expires": props.get("expires") or "",
                }
            )

        # Sort alerts: Extreme -> Severe -> Moderate -> Minor -> Unknown
        severity_rank = {"Extreme": 0, "Severe": 1, "Moderate": 2, "Minor": 3, "Unknown": 4}
        alerts.sort(key=lambda a: severity_rank.get(a["severity"], 5))
        return alerts
    except Exception as exc:
        logger.debug("NWS alerts fetch failed for point (%s, %s): %s", lat, lon, exc)
        return []


async def get_weather_forecast(
    lat: float,
    lon: float,
    location_name: str | None = None,
) -> dict[str, Any]:
    """
    Retrieves the 7-day weather forecast with hourly conditions and official alerts.
    Cached for 15 minutes by rounded (lat, lon).
    """
    if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
        raise ValueError(f"Invalid coordinates: lat={lat}, lon={lon}")

    cache_key = (round(lat, 2), round(lon, 2))
    now = time.time()

    if cache_key in _forecast_cache:
        cached_time, cached_data = _forecast_cache[cache_key]
        if now - cached_time < CACHE_TTL_SECONDS:
            logger.debug("Returning cached weather for %s", cache_key)
            # If a specific location name was passed and differs from cache, update it for display
            if location_name and location_name != cached_data["location"]["name"]:
                cached_data = dict(cached_data)
                cached_data["location"] = dict(cached_data["location"], name=location_name)
            return cached_data

    params = {
        "latitude": lat,
        "longitude": lon,
        "timezone": "auto",
        "forecast_days": 7,
        "wind_speed_unit": "ms",
        "hourly": (
            "temperature_2m,apparent_temperature,relative_humidity_2m,"
            "precipitation,precipitation_probability,weather_code,cloud_cover,"
            "shortwave_radiation,wind_speed_10m,wind_gusts_10m,wind_speed_80m"
        ),
        "daily": (
            "temperature_2m_max,temperature_2m_min,precipitation_sum,"
            "weather_code,wind_gusts_10m_max,sunrise,sunset"
        ),
    }

    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
            forecast_task = client.get(OPEN_METEO_FORECAST_URL, params=params)
            alerts_task = _fetch_nws_alerts(client, lat, lon)
            forecast_resp, alerts = await asyncio.gather(forecast_task, alerts_task)
            forecast_resp.raise_for_status()
            forecast_json = forecast_resp.json()
    except (httpx.RequestError, httpx.HTTPStatusError) as exc:
        logger.error("Weather upstream request failed for (%s, %s): %s", lat, lon, exc)
        raise RuntimeError("Weather is unavailable right now.") from exc

    # Parse Hourly (48 hours ahead)
    hourly_raw = forecast_json.get("hourly") or {}
    hourly_times = hourly_raw.get("time") or []

    hourly_list: list[dict[str, Any]] = []
    limit_hours = min(len(hourly_times), 48)

    for i in range(limit_hours):
        # Extract optional 80m wind; fallback to 10m * 1.25 if omitted by API
        ws_10m = _get_safe_float(hourly_raw.get("wind_speed_10m"), i, 0.0)
        ws_80m = _get_safe_float(hourly_raw.get("wind_speed_80m"), i, round(ws_10m * 1.25, 1))

        hourly_list.append(
            {
                "time": hourly_times[i],
                "temperature": _get_safe_float(hourly_raw.get("temperature_2m"), i, 0.0),
                "apparentTemperature": _get_safe_float(hourly_raw.get("apparent_temperature"), i, 0.0),
                "relativeHumidity": _get_safe_float(hourly_raw.get("relative_humidity_2m"), i, 50.0),
                "precipitation": _get_safe_float(hourly_raw.get("precipitation"), i, 0.0),
                "precipitationProbability": _get_safe_float(hourly_raw.get("precipitation_probability"), i, 0.0),
                "weatherCode": _get_safe_int(hourly_raw.get("weather_code"), i, 0),
                "cloudCover": _get_safe_float(hourly_raw.get("cloud_cover"), i, 0.0),
                "shortwaveRadiation": _get_safe_float(hourly_raw.get("shortwave_radiation"), i, 0.0),
                "windSpeed10m": ws_10m,
                "windGusts10m": _get_safe_float(hourly_raw.get("wind_gusts_10m"), i, ws_10m),
                "windSpeed80m": ws_80m,
            }
        )

    # Parse Daily (7 days)
    daily_raw = forecast_json.get("daily") or {}
    daily_times = daily_raw.get("time") or []
    daily_list: list[dict[str, Any]] = []

    for i in range(len(daily_times)):
        daily_list.append(
            {
                "date": daily_times[i],
                "temperatureMax": _get_safe_float(daily_raw.get("temperature_2m_max"), i, 0.0),
                "temperatureMin": _get_safe_float(daily_raw.get("temperature_2m_min"), i, 0.0),
                "precipitationSum": _get_safe_float(daily_raw.get("precipitation_sum"), i, 0.0),
                "weatherCode": _get_safe_int(daily_raw.get("weather_code"), i, 0),
                "windGustsMax": _get_safe_float(daily_raw.get("wind_gusts_10m_max"), i, 0.0),
                "sunrise": _get_safe_str(daily_raw.get("sunrise"), i, ""),
                "sunset": _get_safe_str(daily_raw.get("sunset"), i, ""),
            }
        )

    current_conditions = hourly_list[0] if hourly_list else {}

    result = {
        "location": {
            "name": location_name or f"{lat:.2f}, {lon:.2f}",
            "latitude": lat,
            "longitude": lon,
            "timezone": forecast_json.get("timezone", "auto"),
            "elevation": forecast_json.get("elevation", 0.0),
        },
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "current": current_conditions,
        "hourly": hourly_list,
        "daily": daily_list,
        "alerts": alerts,
        "alertsAvailable": len(alerts) > 0 or (18.0 <= lat <= 72.0 and -180.0 <= lon <= -65.0),
        "credits": {
            "forecast": "Weather data by Open-Meteo.com",
            "forecastUrl": "https://open-meteo.com/",
            "alerts": "Official alerts from the National Weather Service",
            "disclaimer": "Not an official forecast. Follow official warnings and your plant's procedures.",
        },
    }

    _forecast_cache[cache_key] = (now, result)
    return result


def _get_safe_float(arr: list[Any] | None, idx: int, default: float) -> float:
    if arr and idx < len(arr) and arr[idx] is not None:
        try:
            return float(arr[idx])
        except (ValueError, TypeError):
            return default
    return default


def _get_safe_int(arr: list[Any] | None, idx: int, default: int) -> int:
    if arr and idx < len(arr) and arr[idx] is not None:
        try:
            return int(arr[idx])
        except (ValueError, TypeError):
            return default
    return default


def _get_safe_str(arr: list[Any] | None, idx: int, default: str) -> str:
    if arr and idx < len(arr) and arr[idx] is not None:
        return str(arr[idx])
    return default
