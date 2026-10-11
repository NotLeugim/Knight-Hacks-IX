"""
backend/app/api/weather.py

FastAPI router for weather forecast, geocoding, and power plant impact endpoints.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.services import plant_impacts as plant_service
from app.services import weather as weather_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("/geocode")
async def geocode_query(
    q: str = Query(..., description="Location search query (minimum 2 characters)"),
) -> dict[str, Any]:
    """Searches for geographical locations using Open-Meteo geocoding."""
    clean_q = q.strip()
    if len(clean_q) < 2:
        raise HTTPException(
            status_code=422,
            detail="Search query 'q' must contain at least 2 characters.",
        )

    try:
        results = await weather_service.geocode_location(clean_q, limit=5)
        return {"query": clean_q, "results": results}
    except RuntimeError as exc:
        logger.error("Geocoding failed for '%s': %s", clean_q, exc)
        raise HTTPException(status_code=503, detail="Weather is unavailable right now.") from exc
    except Exception as exc:
        logger.error("Unexpected geocoding error: %s", exc)
        raise HTTPException(status_code=503, detail="Weather is unavailable right now.") from exc


@router.get("/forecast")
async def get_forecast(
    lat: float = Query(..., description="Latitude between -90 and 90"),
    lon: float = Query(..., description="Longitude between -180 and 180"),
    name: str | None = Query(None, description="Optional human-readable location label"),
) -> dict[str, Any]:
    """Retrieves 7-day weather forecast, 48-hour hourly outlook, and NWS official alerts."""
    if not (-90.0 <= lat <= 90.0):
        raise HTTPException(status_code=422, detail="Latitude must be between -90 and 90 degrees.")
    if not (-180.0 <= lon <= 180.0):
        raise HTTPException(status_code=422, detail="Longitude must be between -180 and 180 degrees.")

    try:
        return await weather_service.get_weather_forecast(lat=lat, lon=lon, location_name=name)
    except RuntimeError as exc:
        logger.error("Forecast failed for (%s, %s): %s", lat, lon, exc)
        raise HTTPException(status_code=503, detail="Weather is unavailable right now.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Unexpected forecast error: %s", exc)
        raise HTTPException(status_code=503, detail="Weather is unavailable right now.") from exc


@router.get("/plant-impacts")
async def get_plant_impacts(
    lat: float = Query(..., description="Latitude between -90 and 90"),
    lon: float = Query(..., description="Longitude between -180 and 180"),
    plant: str = Query(
        "mix",
        description="Power plant type: mix, natural_gas, nuclear, solar, wind, battery_storage",
    ),
    name: str | None = Query(None, description="Optional human-readable location label"),
) -> dict[str, Any]:
    """Evaluates weather impacts and operational indicators for a chosen generation technology."""
    if not (-90.0 <= lat <= 90.0):
        raise HTTPException(status_code=422, detail="Latitude must be between -90 and 90 degrees.")
    if not (-180.0 <= lon <= 180.0):
        raise HTTPException(status_code=422, detail="Longitude must be between -180 and 180 degrees.")

    clean_plant = plant.lower().strip()
    if clean_plant not in plant_service.VALID_PLANT_TYPES:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Invalid plant type '{plant}'. Must be one of: "
                f"{', '.join(sorted(plant_service.VALID_PLANT_TYPES))}"
            ),
        )

    try:
        forecast = await weather_service.get_weather_forecast(lat=lat, lon=lon, location_name=name)
        return plant_service.compute_plant_impacts(forecast, clean_plant)
    except RuntimeError as exc:
        logger.error("Plant impacts forecast failed for (%s, %s): %s", lat, lon, exc)
        raise HTTPException(status_code=503, detail="Weather is unavailable right now.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Unexpected plant impacts error: %s", exc)
        raise HTTPException(status_code=503, detail="Weather is unavailable right now.") from exc
