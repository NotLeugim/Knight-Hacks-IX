"""
backend/app/api/analytics.py

FastAPI router for SPOTSight analytics and mission confidence endpoints (issue #3 / DATA-2).
Routes:
- GET /api/analytics
- GET /api/missions/{mission_id}/confidence
"""

import logging
from fastapi import APIRouter, HTTPException

from app.services.analytics import get_analytics_payload, get_mission_confidence

logger = logging.getLogger(__name__)

router = APIRouter(tags=["analytics"])


@router.get("/api/analytics")
def get_analytics():
    """
    Returns fleet analytics metrics:
    - batteryReliability: 7 half-open battery bands with failure rates
    - missionParadox: reported vs. actual completion metrics
    - configComparison: V1 vs. V2 fleet performance and equal-battery analysis
    - confidence: fleet confidence scoring and per-mission scores
    - source: 'database' or 'csv'
    """
    try:
        return get_analytics_payload()
    except Exception as exc:
        logger.error("Failed to compute analytics: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=f"Analytics service unavailable: unable to load data ({exc})",
        )


@router.get("/api/missions/{mission_id}/confidence")
def get_single_mission_confidence(mission_id: str):
    """
    Returns confidence score and itemized deduction breakdown for a specific mission.
    Returns 404 if the mission ID does not exist.
    """
    try:
        result = get_mission_confidence(mission_id)
    except Exception as exc:
        logger.error("Failed to fetch mission confidence for %s: %s", mission_id, exc)
        raise HTTPException(
            status_code=503,
            detail=f"Analytics service unavailable: unable to load data ({exc})",
        )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Mission '{mission_id}' not found.",
        )

    return result
