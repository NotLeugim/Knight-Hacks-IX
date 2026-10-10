"""
Replay events generator and CLI streamer for replay.ndjson.

Sequential generator for reading replay events line-by-line.
One JSON object exists per line.
"""

import os
import json
import time
import logging
from pathlib import Path
from typing import Generator, Tuple, Dict, Any, Optional

logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[1]
REPLAY_FILE = ROOT / "02_DATA" / "replay.ndjson"

REPLAY_DELAY_SECONDS = float(os.getenv("REPLAY_DELAY_SECONDS", "0.10"))


def iter_replay_events(
    file_path: Optional[Path] = None,
) -> Generator[Tuple[str, Dict[str, Any]], None, None]:
    """
    Generator that yields (raw_json_line, parsed_event_dict) line-by-line
    from replay.ndjson without loading the entire file into memory.

    Skips blank lines. Logs and skips malformed JSON lines without crashing.
    """
    path = Path(file_path) if file_path else REPLAY_FILE
    if not path.is_file():
        raise FileNotFoundError(f"Replay file not found at: {path}")

    with open(path, mode="r", encoding="utf-8") as f:
        line_num = 0
        for line in f:
            line_num += 1
            raw = line.strip()
            if not raw:
                continue

            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError as exc:
                logger.warning(
                    "Skipping malformed JSON line %d in %s: %s",
                    line_num,
                    path.name,
                    exc,
                )
                continue

            yield raw, parsed


def read_replay_events(
    file_path: Optional[Path] = None,
    delay_seconds: Optional[float] = None,
    loop: bool = False,
) -> Generator[Dict[str, Any], None, None]:
    """
    Reusable synchronous generator that yields parsed event dictionaries
    with a delay between yields.

    Useful for scripts, background tasks, or local CLI replay.
    """
    delay = delay_seconds if delay_seconds is not None else REPLAY_DELAY_SECONDS
    path = Path(file_path) if file_path else REPLAY_FILE

    while True:
        for _raw_line, event in iter_replay_events(path):
            yield event
            if delay > 0:
                time.sleep(delay)

        if not loop:
            break


if __name__ == "__main__":
    print(f"Streaming events from {REPLAY_FILE} (delay={REPLAY_DELAY_SECONDS}s)...")
    for event in read_replay_events():
        print(
            event.get("timestamp"),
            event.get("mission_id"),
            event.get("event_type"),
            event.get("details", {}),
        )
