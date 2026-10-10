"""
Replay event streaming service for SPOTSight.

Reads recorded robot telemetry and mission events from replay.ndjson line-by-line
(generator) and streams them via Server-Sent Events (SSE).
"""

import os
import json
import asyncio
import logging
import importlib.util
from pathlib import Path
from typing import AsyncGenerator, Generator, Optional, Tuple, Any, Dict
from fastapi import Request

logger = logging.getLogger(__name__)

# Configurable replay delay between emitted events (seconds)
REPLAY_DELAY_SECONDS: float = float(os.getenv("REPLAY_DELAY_SECONDS", "0.10"))


def get_replay_file_path(custom_path: Optional[str] = None) -> Path:
    """
    Resolve the path to replay.ndjson.

    Checks in order:
    1. Explicit custom_path argument
    2. REPLAY_FILE or REPLAY_DATA_PATH environment variable
    3. Standard repository data directory relative to this service file
    4. Fallback locations
    """
    if custom_path:
        path = Path(custom_path)
        if not path.is_file():
            raise FileNotFoundError(f"Specified replay file not found: {path}")
        return path.resolve()

    env_path = os.getenv("REPLAY_FILE") or os.getenv("REPLAY_DATA_PATH")
    if env_path:
        path = Path(env_path)
        if not path.is_file():
            raise FileNotFoundError(f"Configured replay file not found: {path}")
        return path.resolve()

    # Relative to this file: backend/app/services/replay.py -> project root
    root = Path(__file__).resolve().parents[3]
    candidates = [
        root / "data" / "SPOT_KnightHacks_Challenge_Kit Part One" / "02_DATA" / "replay.ndjson",
        root / "data" / "02_DATA" / "replay.ndjson",
        root / "data" / "replay.ndjson",
        Path("data/SPOT_KnightHacks_Challenge_Kit Part One/02_DATA/replay.ndjson"),
        Path("replay.ndjson"),
    ]

    for candidate in candidates:
        if candidate.is_file():
            return candidate.resolve()

    searched = [str(c) for c in candidates]
    raise FileNotFoundError(
        f"Replay data file 'replay.ndjson' not found. Searched locations: {searched}"
    )


# ── Load shared generator from replay_events.py to prevent duplicated logic ──
_STARTER_PATH = (
    Path(__file__).resolve().parents[3]
    / "data"
    / "SPOT_KnightHacks_Challenge_Kit Part One"
    / "05_STARTER_CODE"
    / "replay_events.py"
)

if _STARTER_PATH.is_file():
    _spec = importlib.util.spec_from_file_location("starter_replay_events", _STARTER_PATH)
    _starter_module = importlib.util.module_from_spec(_spec)
    _spec.loader.exec_module(_starter_module)
    iter_replay_events = _starter_module.iter_replay_events
else:
    def iter_replay_events(
        file_path: Optional[Path] = None,
    ) -> Generator[Tuple[str, Dict[str, Any]], None, None]:
        resolved_path = file_path or get_replay_file_path()
        with open(resolved_path, mode="r", encoding="utf-8") as f:
            line_num = 0
            for line in f:
                line_num += 1
                raw = line.strip()
                if not raw:
                    continue
                try:
                    parsed = json.loads(raw)
                except json.JSONDecodeError as exc:
                    logger.warning("Skipping malformed line %d: %s", line_num, exc)
                    continue
                yield raw, parsed


async def sse_event_generator(
    file_path: Optional[Path] = None,
    delay_seconds: Optional[float] = None,
    loop: bool = False,
    request: Optional[Request] = None,
) -> AsyncGenerator[str, None]:
    """
    Asynchronous SSE generator yielding 'data: <original JSON>\\n\\n'.

    - Emits events in chronological file order.
    - Preserves exact JSON payload from each line (no field renaming/dropping).
    - Preserves MISSION_COMPLETED events at their original position at the end of each run block.
    - Yields delay (asyncio.sleep) between events so the event loop is not blocked.
    - Handles client disconnects cleanly via request.is_disconnected().
    - Closes after the last event by default (or loops if loop=True).
    """
    delay = delay_seconds if delay_seconds is not None else REPLAY_DELAY_SECONDS
    resolved_path = file_path or get_replay_file_path()

    iteration = 0
    try:
        while True:
            iteration += 1
            logger.info("Starting replay stream iteration %d from %s", iteration, resolved_path.name)

            for raw_json, _ in iter_replay_events(resolved_path):
                # Clean client disconnect detection
                if request and await request.is_disconnected():
                    logger.info("Client disconnected from SSE stream.")
                    return

                # Format payload according to SSE specification
                yield f"data: {raw_json}\n\n"

                if delay > 0:
                    await asyncio.sleep(delay)

            if not loop:
                logger.info("Replay stream reached end of file; closing stream.")
                break

    except asyncio.CancelledError:
        logger.info("SSE client connection cancelled.")
        raise
