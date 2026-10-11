# SPOTCheck: NextEra Operator Dashboard

**Live demo:** https://spotcheck-chi.vercel.app
**Backend API:** https://knight-hacks-ix.onrender.com (free tier: the first request after idle can take ~50 s to wake up)

SPOTCheck turns Boston Dynamics SPOT robot mission data into a clear view of locations, timestamps, readings, and anomaly flags, and surfaces the operational insights hidden inside that data for non-technical plant operators.

> Orbit says 26 of 27 missions completed. SPOTCheck shows what actually went wrong, and what to fix first.

In the challenge data, 21 of the 26 "completed" missions still had failed actions (49 of 270 actions failed, 40 anomalies recorded). SPOTCheck makes that visible.

## Features

### Live Mission
- **Interactive facility floor plan** with SPOT's route (Pathfinding mode) and a color-coded **Action mode** that highlights failed actions and their likely causes.
- **Risk-ranked triage queue**: every anomaly ranked by `severity weight × asset criticality weight` (each LOW=1 … CRITICAL=4, score 1–16), so the most important issue is always at the top.
- **Simulated live feed**: the recorded `replay.ndjson` mission stream is replayed over Server-Sent Events, with a toast when a mission completes.

### Missions
- **Mission history** with a per-mission **shift summary** of every failure and location.
- **Shift handoff** card with the most recent missions.
- **Pre-mission risk forecast**: per-action failure risk, projected battery, and a suggested reordering of the route. You can try a different start battery or configuration (V1/V2).
- **Worker safety guidance**: which locations still need a human visit after a mission.

### Insights
- **Battery vs. reliability**: failure rate by battery band.
- **Configuration comparison**: V1 (baseline) vs. V2 (improved). Action success rose from 77.2% to 91.1% and mission completion from 94.4% to 100%.
- **Mission confidence score**: starts at 100, minus 10 per failed action and minus 15/10/5/2 per CRITICAL/HIGH/MEDIUM/LOW anomaly, clamped to 0–100. The fleet average is shown in the top bar.
- **Trend watch**: flags assets whose last three GOOD readings move steadily in a risky direction by at least a set threshold, with a walk-forward backtest of how often those trends were followed by a failure.
- **Model accuracy**: an L2-regularized logistic regression (NumPy) evaluated with leave-one-mission-out cross-validation.

### Weather
- **Site forecast** (Open-Meteo) with official **NWS alerts**, a 7-day outlook, and a 48-hour hourly chart.
- **Plant impact view** for nuclear, natural gas, solar, wind, or battery storage sites.

### Operator Copilot
- A chat assistant (RAIA chatbot widget) opened from the top bar.

## Tech Stack
- **Frontend:** Next.js, React, Tailwind CSS, Recharts. Deployed on **Vercel**.
- **Backend:** Python, FastAPI, pandas, NumPy, SQLAlchemy. Deployed on **Render**.
- **Database:** **Neon** (serverless PostgreSQL). The challenge CSVs are loaded into Neon, and every metric is computed live from it, with a CSV fallback if the database is unavailable.
- **AI:** Google Gemini. The Spot User Guide PDFs are uploaded at startup for the anomaly analysis endpoint. Gemini also writes plain-language trend alerts and summaries, with deterministic templates as a fallback.
- **External data:** Open-Meteo (forecast and geocoding) and the National Weather Service (alerts).

## Project Structure
- `frontend/`: Next.js app (pages: Live Mission, Missions, Insights, Weather).
- `backend/`: FastAPI app (`app/api` routers, `app/services` logic, `app/db` models, `scripts/seed_db.py`, `tests/`).
- `data/`: Challenge kit data (CSVs, `replay.ndjson`, Spot User Guide PDFs with Markdown copies).

## API Overview
| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Backend status |
| `GET /api/stream/live` | Replayed mission event stream (SSE). `?health=true` adds live health events |
| `GET /api/triage` | Risk-ranked anomaly queue (`?limit=N`) |
| `GET /api/analytics` | Battery reliability, mission paradox, V1/V2 comparison, confidence scores |
| `GET /api/missions/{id}/confidence` | Confidence score breakdown for one mission |
| `GET /api/missions/{id}/health` | Mission health score timeline (HEALTHY ≥ 90, DEGRADED ≥ 60, else CRITICAL) |
| `GET /api/missions/{id}/summary`, `GET /api/shift-handoff` | Shift summaries |
| `GET /api/predictions/trends`, `/trends/backtest`, `/model` | Trend watch and model evaluation |
| `GET /api/predictions/missions/{id}/forecast` | Pre-mission risk forecast |
| `GET /api/worker-safety/missions/{id}` | Post-mission worker safety guidance |
| `GET /api/weather/forecast`, `/geocode`, `/plant-impacts` | Weather and plant impact data |
| `POST /api/ai/analyze` | Gemini analysis of an anomaly against the Spot User Guide |

## Running Locally

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows Git Bash: source .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env             # add your Neon DATABASE_URL and GEMINI_API_KEY
python scripts/seed_db.py        # load the challenge CSVs into Neon
python -m uvicorn app.main:app --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm ci
npm run dev                      # http://localhost:3000 (calls the backend at http://localhost:8000)
```

### Tests
```bash
cd backend && python -m pytest tests -q
cd frontend && npx tsc --noEmit && npm test
```

## Assumptions
- The challenge dataset is synthetic but representative of production data.
- SPOT's route is reconstructed from the waypoint sequence (snap-to-waypoint).
- The challenge data has no "resolved" status, so every anomaly is treated as open in the triage queue.
- On Render, the predictions model starts building in the background as soon as the server starts, so forecasts are ready shortly after a cold start instead of being built on the first request.
- Production scale: the same endpoints can read a growing Neon database. Metrics are computed per request from the stored tables, not hard-coded.
