"""
backend/tests/test_worker_safety.py

Unit tests for the Worker Safety advisory service and endpoint:
1. M015 follow-up locations, route order, and inspection summary
2. Exact hazards and PPE per location
3. No-hindsight temporal filtering (no future readings leak into mission hazards)
4. M005 clean mission (no follow-up visits needed)
5. Disclaimer, OSHA source citations, and human-readable titles (no raw enum codes)
6. 404 handling for unknown missions
"""

from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.services.worker_safety import evaluate_worker_safety

client = TestClient(app)


def test_m015_worker_safety_summary():
    """M015 has 10 planned actions: 7 completed, 3 failed; 4 follow-up locations needed."""
    data = evaluate_worker_safety("M015")

    assert data["missionId"] == "M015"
    assert data["totalInspections"] == 10
    assert data["inspectionsCompleted"] == 7
    assert data["summary"] == "SPOT completed 7 of 10 inspections, so people only need to visit 4 locations."
    assert "disclaimer" in data
    assert data["disclaimer"] == "General guidance only. Follow your site's safety program, job hazard analysis, and work permits."


def test_m015_follow_up_locations_route_order():
    """Follow-up locations must appear in mission route order: WP05, WP11, WP04, WP07."""
    data = evaluate_worker_safety("M015")
    locations = data["followUpLocations"]

    assert len(locations) == 4
    route_order = [loc["locationId"] for loc in locations]
    assert route_order == ["WP05", "WP11", "WP04", "WP07"]

    # Verify friendly names and zone labels
    assert locations[0]["locationName"] == "Pipe Gallery"
    assert locations[0]["zoneType"] == "Process"
    assert locations[0]["environment"] == "High noise"

    assert locations[1]["locationName"] == "Battery Room"
    assert locations[1]["zoneType"] == "Electrical"
    assert locations[1]["environment"] == "Dry"

    assert locations[2]["locationName"] == "Pump Bay"
    assert locations[2]["zoneType"] == "Mechanical"
    assert locations[2]["environment"] == "Low light"

    assert locations[3]["locationName"] == "Control Room Corridor"
    assert locations[3]["zoneType"] == "Access"
    assert locations[3]["environment"] == "Low light"


def test_m015_location_hazards_and_ppe():
    """Verify detailed hazards, severities, and PPE requirements for M015 locations."""
    data = evaluate_worker_safety("M015")
    by_wp = {loc["locationId"]: loc for loc in data["followUpLocations"]}

    # Pump Bay (WP04)
    pb = by_wp["WP04"]
    pb_texts = [h["text"] for h in pb["hazards"]]
    assert any("Rotating and moving equipment" in t for t in pb_texts)
    assert any("Low light" in t for t in pb_texts)
    assert any("Hot surfaces" in t and "65.3" in t for t in pb_texts)
    assert any("Pressurized equipment" in t for t in pb_texts)
    assert any("Compressor 14" in t for t in pb_texts)
    assert "portable lighting" in pb["protectiveEquipment"]
    assert "heat-resistant gloves" in pb["protectiveEquipment"]
    assert "lockout/tagout devices" in pb["protectiveEquipment"]
    assert "safety glasses" in pb["protectiveEquipment"]

    # Battery Room (WP11)
    br = by_wp["WP11"]
    br_texts = [h["text"] for h in br["hazards"]]
    assert any("Shock and arc-flash" in t for t in br_texts)
    assert any("Hot surfaces" in t and "65.6" in t for t in br_texts)
    assert any("Heat Exchanger 10" in t for t in br_texts)
    assert "arc-rated PPE per your site's arc-flash assessment" in br["protectiveEquipment"]
    assert "heat-resistant gloves" in br["protectiveEquipment"]

    # Pipe Gallery (WP05)
    pg = by_wp["WP05"]
    pg_texts = [h["text"] for h in pg["hazards"]]
    assert any("High-noise" in t for t in pg_texts)
    assert any("Pressurized lines" in t for t in pg_texts)
    assert any("Electrical Panel 03" in t for t in pg_texts)
    assert "hearing protection" in pg["protectiveEquipment"]


def test_no_hindsight_filtering_for_readings():
    """
    WP05 (Pipe Gallery) had a 75.5 °C temp reading recorded on M016 (18:15:36),
    after M015 finished at 10:34:00.
    Under strict no-hindsight, WP05 during M015 must NOT have a hot-surface hazard.
    """
    data = evaluate_worker_safety("M015")
    by_wp = {loc["locationId"]: loc for loc in data["followUpLocations"]}
    pg = by_wp["WP05"]

    hot_surface_hazards = [h for h in pg["hazards"] if "Hot surface" in h["text"]]
    assert len(hot_surface_hazards) == 0


def test_m005_clean_mission():
    """M005 completed all actions cleanly with no anomalies: no follow-up needed."""
    data = evaluate_worker_safety("M005")

    assert data["missionId"] == "M005"
    assert data["inspectionsCompleted"] == 10
    assert data["totalInspections"] == 10
    assert len(data["followUpLocations"]) == 0
    assert data["summary"] == "No follow-up visits needed for this mission."


def test_sources_and_plain_language():
    """All hazard items must cite standard sources (OSHA or general safety) and use human-readable text."""
    data = evaluate_worker_safety("M015")
    for loc in data["followUpLocations"]:
        for hazard in loc["hazards"]:
            assert hazard["source"], f"Missing source citation for {hazard['text']}"
            assert ("OSHA" in hazard["source"]) or ("safety guidance" in hazard["source"])
            # Ensure no raw internal codes
            assert "PROCESS_HOT" not in hazard["text"]
            assert "HIGH_NOISE" not in hazard["text"]
            assert "LOW_LIGHT" not in hazard["text"]


def test_api_endpoint_m015_and_404():
    """Test FastAPI GET endpoint for M015 and 404 for nonexistent mission."""
    resp = client.get("/api/worker-safety/missions/M015")
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["missionId"] == "M015"
    assert len(res_data["followUpLocations"]) == 4

    resp_404 = client.get("/api/worker-safety/missions/M999_NONEXISTENT")
    assert resp_404.status_code == 404
    assert "not found" in resp_404.json()["detail"].lower()
