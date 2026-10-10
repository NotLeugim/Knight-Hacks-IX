import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import endpoints

logger = logging.getLogger(__name__)

# Paths to the Spot User Guide PDFs provided in the challenge kit
_HERE = os.path.dirname(os.path.abspath(__file__))  # .../backend/app
GUIDE_DIR = os.path.normpath(os.path.join(_HERE, "..", "..", "data", "SPOT_KnightHacks_Challenge_Kit Part Two"))
GUIDE_FILES = [
    "Spot User Guide - 1-20.pdf",
    "Spot User Guide - 21-23.pdf",
    "Spot User Guide - 24-30.pdf",
    "Spot User Guide - 31-72.pdf",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: database initialization and optional Gemini guides upload."""
    app.state.spot_guides = []

    # 1. DB initialization if configured
    try:
        from app.db.database import Base, engine
        import app.db.models  # noqa: F401 - registers models on Base

        if engine is not None:
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created / verified.")
        else:
            logger.info("Skipping table creation: DATABASE_URL is not configured.")
    except Exception as exc:
        logger.warning("DB table creation skipped or encountered: %s", exc)

    # 2. Upload Spot User Guides to Gemini if API key is present
    if os.getenv("GEMINI_API_KEY"):
        try:
            from app.services.gemini import upload_guide
            logger.info("[SPOTSight] Uploading Spot User Guides to Gemini Files API...")
            for filename in GUIDE_FILES:
                path = os.path.normpath(os.path.join(GUIDE_DIR, filename))
                if os.path.isfile(path):
                    file_obj = upload_guide(path)
                    app.state.spot_guides.append(file_obj)
                    logger.info("[SPOTSight] Uploaded: %s -> %s", filename, getattr(file_obj, "uri", "ready"))
            logger.info("[SPOTSight] %d guides ready.", len(app.state.spot_guides))
        except Exception as exc:
            logger.warning("[SPOTSight] Could not pre-upload Spot User Guides: %s", exc)

    yield


app = FastAPI(
    title="SPOTSight Backend API",
    description="Processes SPOT robot mission data and surfaces insights for the NextEra Operator Dashboard.",
    version="0.1.0",
    lifespan=lifespan,
)

# Allow the Next.js dev server to call this API without CORS errors
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(endpoints.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to the SPOTSight NextEra Operator Dashboard API"}
