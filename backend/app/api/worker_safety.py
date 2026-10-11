"""
backend/app/api/worker_safety.py

FastAPI router exposing worker occupational safety recommendations for post-mission follow-up visits:
1. GET /api/worker-safety/missions/{mission_id} - Follow-up locations, occupational hazards, and required PPE
"""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException

from app.services import worker_safety as worker_safety_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/worker-safety", tags=["worker-safety"])


@router.get("/missions/{mission_id}")
def get_mission_worker_safety(mission_id: str) -> dict[str, Any]:
    """
    Returns occupational safety recommendations for technician follow-up visits
    at locations with failed actions or detected anomalies during the mission.
    """
    try:
        return worker_safety_service.evaluate_worker_safety(mission_id)
    except KeyError as exc:
        logger.warning("Mission not found for worker safety evaluation: %s", exc)
        raise HTTPException(status_code=404, detail=f"Mission {mission_id} not found")
    except FileNotFoundError as exc:
        logger.error("Data files missing for worker safety evaluation: %s", exc)
        raise HTTPException(status_code=503, detail="Worker safety data files unavailable")
    except Exception as exc:
        logger.error("Error evaluating worker safety for mission %s: %s", mission_id, exc)
        raise HTTPException(status_code=500, detail="Failed to evaluate worker safety")
