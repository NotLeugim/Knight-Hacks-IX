"""
backend/app/api/triage.py

FastAPI router for the risk-ranked triage queue (issue #10 / API-2).
Routes:
- GET /api/triage            (optional ?limit=N for the top N)
- GET /triage                (legacy alias used by the frontend fallback)
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.triage import get_triage_queue

logger = logging.getLogger(__name__)

router = APIRouter(tags=["triage"])


@router.get("/api/triage")
@router.get("/triage")
def triage_queue(
    limit: Optional[int] = Query(default=None, ge=1, le=500, description="Return only the top N anomalies"),
):
    """Open anomalies ranked by severity x asset criticality (highest risk first)."""
    try:
        return get_triage_queue(limit=limit)
    except Exception as exc:
        logger.error("Failed to build triage queue: %s", exc)
        raise HTTPException(status_code=503, detail="Triage data is unavailable.")
