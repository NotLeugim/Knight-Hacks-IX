"""
backend/app/api/summary.py

FastAPI router for SPOTSight shift summaries and replay event triggers (issue #15 / AI-2).
Routes:
- GET /api/missions/{mission_id}/summary
- GET /api/shift-handoff
- POST /api/events/replay
"""

import logging
from typing import Any
from fastapi import APIRouter, HTTPException, Query, Request

from app.services.summary import (
    generate_mission_summary_async,
    get_shift_handoff_summaries,
    handle_replay_event,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["summary"])


@router.get("/api/summary")
@router.get("/summary")
async def get_summary(
    mission_id: str | None = Query(default=None, description="Optional mission ID. If omitted, returns latest mission summary."),
    regenerate: bool = Query(default=False, description="Bypass cache and regenerate summary"),
):
    """
    Returns an AI mission summary.
    If mission_id is omitted, returns the latest mission summary.
    """
    try:
        if mission_id:
            return await generate_mission_summary_async(mission_id, regenerate=regenerate)
        summaries = await get_shift_handoff_summaries(limit=1)
        if not summaries:
            raise HTTPException(status_code=404, detail="No mission summaries available.")
        return summaries[0]
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Mission '{mission_id}' not found.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to generate summary: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=f"Summary service unavailable: unable to load data ({exc})",
        )


@router.get("/api/missions/{mission_id}/summary")
async def get_mission_summary(
    mission_id: str,
    regenerate: bool = Query(default=False, description="Bypass cache and regenerate summary"),
):
    """
    Returns an end-of-mission shift summary for the specified mission.
    Returns 404 for unknown missions, 503 if backend data fails to load.
    """
    try:
        return await generate_mission_summary_async(mission_id, regenerate=regenerate)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Mission '{mission_id}' not found.")
    except Exception as exc:
        logger.error("Failed to generate summary for mission %s: %s", mission_id, exc)
        raise HTTPException(
            status_code=503,
            detail=f"Summary service unavailable: unable to load data ({exc})",
        )


@router.get("/api/shift-handoff")
async def get_shift_handoff(
    limit: int = Query(default=3, ge=1, le=10, description="Number of recent missions (1-10)"),
):
    """
    Returns shift summary objects for the most recent missions by end time, newest first.
    """
    try:
        summaries = await get_shift_handoff_summaries(limit=limit)
        return {"missions": summaries}
    except Exception as exc:
        logger.error("Failed to fetch shift handoff: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=f"Shift handoff service unavailable: unable to load data ({exc})",
        )


@router.post("/api/events/replay")
async def process_replay_event(request: Request):
    """
    Accepts a replay event JSON payload.
    If event_type is MISSION_COMPLETED, generates or retrieves the mission summary.
    Returns { triggered: true, summary } or { triggered: false }.
    """
    try:
        event = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {exc}")

    try:
        summary = await handle_replay_event(event)
        if summary is not None:
            return {"triggered": True, "summary": summary}
        return {"triggered": False}
    except Exception as exc:
        logger.error("Failed to process replay event %s: %s", event, exc)
        raise HTTPException(
            status_code=503,
            detail=f"Replay event summary generation failed: {exc}",
        )
