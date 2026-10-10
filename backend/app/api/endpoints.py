from fastapi import APIRouter

router = APIRouter()

@router.get("/missions/{id}/path")
def get_mission_path(id: str):
    # Returns a timestamped polyline from the action sequence and replay events
    return {"id": id, "path": []}

@router.get("/findings")
def get_findings():
    # Returns metrics for the Findings page
    return {"findings": {}}

@router.get("/triage")
def get_triage_queue():
    # Returns ranked open issues
    return {"queue": []}
