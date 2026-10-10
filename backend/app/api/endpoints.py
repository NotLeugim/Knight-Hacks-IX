from fastapi import APIRouter

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
