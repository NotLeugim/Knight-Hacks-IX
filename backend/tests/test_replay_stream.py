"""
Automated verification test suite for SPOTSight Replay Streamer (/api/stream/live).

Verifies the three required pass checks:
1. Endpoint accessibility via SSE with proper headers.
2. Parsed payloads are deep-equal to objects in replay.ndjson (count & content).
3. MISSION_COMPLETED events appear in the stream at the end of each run block
   in identical order and position.
4. Edge cases: missing file, blank lines, and malformed JSON lines.
"""

import os
import sys
import json
import tempfile
from pathlib import Path

# Ensure backend root is in sys.path
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.services.replay import (
    get_replay_file_path,
    iter_replay_events,
    REPLAY_DELAY_SECONDS,
)


def load_raw_replay_lines(file_path: Path):
    """Loads all non-blank parsed lines directly from replay.ndjson."""
    with open(file_path, "r", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def test_pass_check_1_and_2_deep_equality():
    """
    Pass Check 1 & 2:
    Streams /api/stream/live and verifies every received payload is deep-equal
    to the corresponding object in replay.ndjson (count and content).
    """
    client = TestClient(app)
    replay_path = get_replay_file_path()
    expected_events = load_raw_replay_lines(replay_path)
    total_expected = len(expected_events)

    print(f"\n[Test] Verifying SSE stream against {total_expected} lines in {replay_path.name}...")

    # Stream with delay=0 for fast automated verification
    response = client.get("/api/stream/live?delay=0")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    # Check SSE headers
    assert "text/event-stream" in response.headers["content-type"], (
        f"Expected text/event-stream, got {response.headers['content-type']}"
    )
    assert response.headers.get("cache-control") == "no-cache"
    assert response.headers.get("x-accel-buffering") == "no"

    # Parse SSE data events
    received_events = []
    for line in response.iter_lines():
        if line.startswith("data: "):
            payload_str = line[len("data: "):]
            received_events.append(json.loads(payload_str))

    assert len(received_events) == total_expected, (
        f"Event count mismatch: expected {total_expected}, got {len(received_events)}"
    )

    # Deep equality assertion for every event
    for idx, (expected, actual) in enumerate(zip(expected_events, received_events)):
        assert expected == actual, (
            f"Payload mismatch at index {idx}:\nExpected: {expected}\nActual: {actual}"
        )

    print(f"[Pass Check 1 & 2 PASSED] Received {len(received_events)} events, all deep-equal to file.")


def test_pass_check_3_mission_completed_ordering():
    """
    Pass Check 3:
    Asserts MISSION_COMPLETED events appear in the stream at the end of each run block
    in their original position and count.
    """
    client = TestClient(app)
    replay_path = get_replay_file_path()
    expected_events = load_raw_replay_lines(replay_path)

    response = client.get("/api/stream/live?delay=0")
    assert response.status_code == 200

    received_events = []
    for line in response.iter_lines():
        if line.startswith("data: "):
            received_events.append(json.loads(line[len("data: "):]))

    expected_completions = [
        (idx, e["mission_id"], e["event_id"])
        for idx, e in enumerate(expected_events)
        if e.get("event_type") == "MISSION_COMPLETED"
    ]
    received_completions = [
        (idx, e["mission_id"], e["event_id"])
        for idx, e in enumerate(received_events)
        if e.get("event_type") == "MISSION_COMPLETED"
    ]

    assert len(received_completions) == len(expected_completions), (
        f"MISSION_COMPLETED count mismatch: expected {len(expected_completions)}, "
        f"got {len(received_completions)}"
    )
    assert received_completions == expected_completions, (
        f"MISSION_COMPLETED ordering/indices mismatch:\nExpected: {expected_completions}\nReceived: {received_completions}"
    )

    # Verify that each MISSION_COMPLETED marks the boundary of a run block
    # (i.e. the next event, if any, belongs to a new mission)
    for idx, mission_id, _event_id in received_completions:
        if idx + 1 < len(received_events):
            next_event = received_events[idx + 1]
            assert next_event["mission_id"] != mission_id, (
                f"Expected event after MISSION_COMPLETED at index {idx} to be a new mission, "
                f"but found same mission_id: {next_event['mission_id']}"
            )
            assert next_event["event_type"] == "MISSION_STARTED", (
                f"Expected event after MISSION_COMPLETED at index {idx} to be MISSION_STARTED, "
                f"got {next_event['event_type']}"
            )

    print(f"[Pass Check 3 PASSED] All {len(received_completions)} MISSION_COMPLETED events in exact position.")


def test_edge_case_malformed_and_blank_lines():
    """
    Edge case: Skips blank lines and malformed JSON lines without crashing.
    """
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, suffix=".ndjson") as tmp:
        tmp.write("\n")  # Blank line
        tmp.write('{"event_id": "T001", "event_type": "MISSION_STARTED"}\n')
        tmp.write("\n")  # Blank line
        tmp.write("MALFORMED NON-JSON LINE HERE\n")
        tmp.write('{"event_id": "T002", "event_type": "ACTION_STARTED"}\n')
        tmp.write('{"unclosed": json\n')
        tmp.write('{"event_id": "T003", "event_type": "MISSION_COMPLETED"}\n')
        tmp.write("   \n")  # Whitespace blank line
        tmp_path = Path(tmp.name)

    try:
        events = list(iter_replay_events(tmp_path))
        assert len(events) == 3, f"Expected 3 valid events, got {len(events)}"
        assert events[0][1]["event_id"] == "T001"
        assert events[1][1]["event_id"] == "T002"
        assert events[2][1]["event_id"] == "T003"
        print("[Edge Case PASSED] Blank and malformed lines handled gracefully.")
    finally:
        os.unlink(tmp_path)


def test_edge_case_missing_file():
    """
    Edge case: Missing file returns clear 404 error.
    """
    orig_env = os.environ.get("REPLAY_FILE")
    try:
        os.environ["REPLAY_FILE"] = "non_existent_path_for_testing_123.ndjson"
        client = TestClient(app)
        response = client.get("/api/stream/live")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
        print("[Edge Case PASSED] Missing file returns 404 with clear message.")
    finally:
        if orig_env is not None:
            os.environ["REPLAY_FILE"] = orig_env
        else:
            os.environ.pop("REPLAY_FILE", None)


if __name__ == "__main__":
    print("Running SPOTSight Replay Streamer Test Suite...")
    test_pass_check_1_and_2_deep_equality()
    test_pass_check_3_mission_completed_ordering()
    test_edge_case_malformed_and_blank_lines()
    test_edge_case_missing_file()
    print("\nALL VERIFICATION CHECKS PASSED SUCCESSFULLY!")
