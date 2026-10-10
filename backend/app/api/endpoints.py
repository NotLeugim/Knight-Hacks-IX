from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from app.services.gemini import test_gemini, analyze_anomaly

router = APIRouter()


# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/api/health", tags=["health"])
def health_check():
    """Liveness probe — used by the frontend to verify CORS + connectivity."""
    return {"status": "ok", "message": "Backend connected"}


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
