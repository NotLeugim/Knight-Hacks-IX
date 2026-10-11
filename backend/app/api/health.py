"""
backend/app/api/health.py

FastAPI router for the live Mission Health Score (issue #12 / API-3).
Routes:
- GET /api/missions/{mission_id}/health
The live version is GET /api/stream/live?health=true (separate `event: health` SSE messages).
"""
import logging

from fastapi import APIRouter, HTTPException

from app.services.health import get_mission_health

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health score"])


@router.get("/api/missions/{mission_id}/health")
def mission_health(mission_id: str):
    """0-100 health score for one mission, with the score after each action."""
    try:
        result = get_mission_health(mission_id)
    except Exception as exc:
        logger.error("Failed to compute health for %s: %s", mission_id, exc)
        raise HTTPException(status_code=503, detail="Health data is unavailable.")
    if result is None:
        raise HTTPException(status_code=404, detail=f"Mission '{mission_id}' not found.")
    return result
