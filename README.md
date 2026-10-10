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

## Assumptions
* The provided dataset in `data/` is synthetic and representative of the data expected in production.
* Path reconstruction relies on the sequence of waypoints provided in the replay events.
* The Confidence Score starts at 100 and deducts points based on severity of anomalies and asset criticality.
* The system is designed to scale: the sliding window logic and data storage can transition to TimescaleDB for production volumes.

## Setup Instructions
(To be added once coding is completed)
