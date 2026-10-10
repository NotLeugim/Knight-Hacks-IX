import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import endpoints
from app.services.gemini import upload_guide

# Paths to the Spot User Guide PDFs provided in the challenge kit
# main.py lives at: backend/app/main.py
# PDFs live at:     data/SPOT_KnightHacks_Challenge_Kit Part Two/
_HERE = os.path.dirname(os.path.abspath(__file__))  # .../backend/app
GUIDE_DIR = os.path.normpath(os.path.join(_HERE, "..", "..", "data", "SPOT_KnightHacks_Challenge_Kit Part Two"))
GUIDE_FILES = [
    "Spot User Guide - 1-20.pdf",
    "Spot User Guide - 21-23.pdf",
    "Spot User Guide - 24-30.pdf",
    "Spot User Guide - 31-72.pdf",
]


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """On startup: create DB tables (issue #1), then upload the Spot User Guides to Gemini.

    Neither step can crash the server: failures are logged and startup continues.
    """
    # 1. Database tables
    try:
        from app.db.database import Base, engine
        from app.db import models  # noqa: F401 - registers models on Base (avoids shadowing `app`)

        if engine is not None:
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created / verified.")
        else:
            logger.warning("Skipping table creation: DATABASE_URL is not configured.")
    except Exception as exc:
        logger.error("Error during DB table creation: %s", exc)

    # 2. Gemini guide upload (cached on app.state for the AI endpoints)
    app.state.spot_guides = []
    if not os.environ.get("GEMINI_API_KEY"):
        logger.warning("Skipping Spot User Guide upload: GEMINI_API_KEY is not configured.")
    else:
        try:
            print("[SPOTSight] Uploading Spot User Guides to Gemini Files API...")
            for filename in GUIDE_FILES:
                path = os.path.normpath(os.path.join(GUIDE_DIR, filename))
                file_obj = upload_guide(path)
                app.state.spot_guides.append(file_obj)
                print(f"[SPOTSight] Uploaded: {filename} -> {file_obj.uri}")
            print(f"[SPOTSight] {len(app.state.spot_guides)} guides ready.")
        except Exception as exc:
            logger.error("Error uploading Spot User Guides to Gemini: %s", exc)
            app.state.spot_guides = []

    yield
    # Nothing to clean up — Gemini files expire automatically after 48h


app = FastAPI(
    title="SPOTSight Backend API",
    description="Processes SPOT robot mission data and surfaces insights for the NextEra Operator Dashboard.",
    version="0.1.0",
    lifespan=lifespan,
)

# Allow the Next.js dev server to call this API without CORS errors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(endpoints.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to the SPOTSight NextEra Operator Dashboard API"}
