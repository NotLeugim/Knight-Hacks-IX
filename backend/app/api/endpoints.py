from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.gemini import test_gemini, analyze_anomaly
from app.services.replay import sse_event_generator, get_replay_file_path

router = APIRouter()


# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/api/health", tags=["health"])
def health_check():
    """Liveness probe — used by the frontend to verify CORS + connectivity."""
    return {"status": "ok", "message": "Backend connected"}


# ── Live Telemetry Stream (SSE) ───────────────────────────────────────────────

@router.get("/api/stream/live", tags=["stream"])
async def stream_live_events(
    request: Request,
    delay: Optional[float] = Query(
        default=None,
        description="Delay in seconds between emitted events (defaults to REPLAY_DELAY_SECONDS / 0.10s)",
    ),
    loop: bool = Query(
        default=False,
        description="Whether to loop the stream when reaching the end of replay.ndjson (defaults to False)",
    ),
):
    """
    Server-Sent Events (SSE) live replay stream of Spot robot telemetry and mission events.

    Reads replay.ndjson line-by-line via a generator without loading the entire file into memory.
    Emits events in file order (chronological), each payload exactly matching the original JSON line.
    MISSION_COMPLETED events are pushed at the end of each run block in their original position.
    """
    try:
        replay_path = get_replay_file_path()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return StreamingResponse(
        sse_event_generator(
            file_path=replay_path,
            delay_seconds=delay,
            loop=loop,
            request=request,
        ),
        media_type="text/event-stream",
        headers={
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Missions ──────────────────────────────────────────────────────────────────

@router.get("/missions/{mission_id}/path", tags=["missions"])
def get_mission_path(mission_id: str):
    """Returns a timestamped polyline from the action sequence and replay events."""
    return {"id": mission_id, "path": []}


# ── Findings ──────────────────────────────────────────────────────────────────

@router.get("/findings", tags=["findings"])
def get_findings():
    """Returns aggregated metrics for the Findings page."""
    return {"findings": {}}


# ── Triage ────────────────────────────────────────────────────────────────────

@router.get("/api/triage", tags=["triage"])
@router.get("/triage", tags=["triage"])
def get_triage_queue():
    """Returns risk-ranked open issues (severity × criticality × failure rate)."""
    return {"queue": []}


# ── AI ────────────────────────────────────────────────────────────────────────

class PromptRequest(BaseModel):
    prompt: str


class AnomalyRequest(BaseModel):
    mission_id: str
    battery_pct: float
    failure_type: str


@router.post("/api/ai/test", tags=["ai"])
async def ai_test(body: PromptRequest):
    """Send a prompt to Gemini 1.5 Flash and return the generated response."""
    try:
        result = await test_gemini(body.prompt)
        return {"response": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/api/ai/analyze", tags=["ai"])
async def ai_analyze(body: AnomalyRequest, request: Request):
    """Analyze a telemetry anomaly against the pre-loaded Spot User Guides."""
    try:
        # Use the troubleshooting guide (pp. 31-72) — the most relevant section for anomaly diagnosis.
        # Sending all 4 PDFs at once (~40 MB) causes Gemini to hang.
        guides = getattr(request.app.state, "spot_guides", [])
        if len(guides) < 4:
            raise HTTPException(status_code=503, detail="Spot User Guides are not loaded (check GEMINI_API_KEY and server logs).")
        guide = guides[3]
        payload = {
            "mission_id": body.mission_id,
            "battery_pct": body.battery_pct,
            "failure_type": body.failure_type,
        }
        result = await analyze_anomaly(payload, guide)
        return {"mission_id": body.mission_id, "analysis": result}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
