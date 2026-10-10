# SPOTSight: NextEra Operator Dashboard

This project is a dashboard that translates Boston Dynamics SPOT robot mission data into a clear, readable view of locations, timestamps, readings, and anomaly flags. It surfaces operational insights hidden inside the data for non-technical plant operators.

## Tech Stack
* **Frontend:** Next.js, React, Tailwind CSS, Framer Motion, three.js (react-three-fiber), Recharts
* **Backend:** Python (FastAPI), pandas, TimescaleDB (future)
* **AI:** Gemini API (RAG architecture)

## Project Structure
* `frontend/`: Next.js application containing the UI, 3D/2D views, and charts.
* `backend/`: FastAPI application handling data ingestion, API endpoints, and the Gemini AI agent.
* `data/`: Extracted challenge kit data.

## Replay Streamer (Simulated Live Feed)

The live telemetry streamer replays recorded mission telemetry and robot events from `replay.ndjson` to simulate real-time fleet operations.

### Endpoint
- **URL:** `GET /api/stream/live`
- **Protocol:** Server-Sent Events (SSE)
- **Headers:**
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
  - `X-Accel-Buffering: no`

### Event Format
Each SSE message contains exactly one JSON object matching its line in `replay.ndjson` with zero field renaming or omissions:

```text
data: {"event_id": "E00001", "mission_id": "M001", "timestamp": "2026-09-01T18:00:00", "event_type": "MISSION_STARTED", "details": {"scenario": "BASELINE", "configuration_version": "V1", "battery_pct": 82}}

data: {"event_id": "E00002", "mission_id": "M001", "timestamp": "2026-09-01T18:03:06", "event_type": "ACTION_STARTED", "details": {"action_id": "A0001", "location_id": "WP05", "asset_id": "HX-201", "action_type": "NAVIGATION", "battery_pct": 75}}
```

Supported event types:
- `MISSION_STARTED`: Start of a mission run block.
- `ACTION_STARTED`: Spot begins waypoint transit or inspection.
- `ACTION_COMPLETED`: Successful action with telemetry reading.
- `ACTION_FAILED`: Obstacle, temperature anomaly, or sensor fault flagged.
- `MISSION_COMPLETED`: End of a run block (persisted in original file position).

### Configuration & Query Parameters
- `REPLAY_DELAY_SECONDS` (env var): Default delay between events in seconds (default: `0.10`).
- `REPLAY_FILE` / `REPLAY_DATA_PATH` (env var): Path to `replay.ndjson` if not using default `data/.../replay.ndjson`.
- `delay` (query param): Override delay for the request (e.g. `?delay=0` for tests).
- `loop` (query param): Loop stream indefinitely (`?loop=true`). Defaults to `false` (stream closes cleanly after the final event).

### Running the Backend
```bash
cd backend
python -m uvicorn app.main:app --port 8000 --reload
```

### Subscribing via cURL
```bash
curl -N http://localhost:8000/api/stream/live
```

### Subscribing in the Frontend
```typescript
import { subscribeLiveStream } from '@/lib/api';

const unsubscribe = subscribeLiveStream({
  onEvent: (event) => {
    console.log('Received telemetry event:', event.event_type, event);
  },
  onError: (err) => console.error('Stream error:', err),
});

// Clean up when component unmounts:
// unsubscribe();
```

### Running Automated Verification Tests
```bash
python backend/tests/test_replay_stream.py
```
