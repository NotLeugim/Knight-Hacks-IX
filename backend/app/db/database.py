"""
backend/app/db/database.py

SQLAlchemy engine, session factory, declarative Base, and get_db dependency.
Loads DATABASE_URL from backend/.env via python-dotenv.
If DATABASE_URL is missing the server still starts (engine = None).
"""
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

logger = logging.getLogger(__name__)

# Load .env from the backend/ directory (one level above this file's package root)
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)

DATABASE_URL: str | None = os.getenv("DATABASE_URL")
# SQLAlchemy 2.1+ defaults "postgresql://" to the psycopg (v3) driver;
# we install psycopg2-binary, so pin the driver explicitly.
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

if DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Neon drops idle connections; pre-ping keeps them alive
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.info("SQLAlchemy engine created successfully.")
else:
    engine = None
    SessionLocal = None  # type: ignore[assignment]
    logger.warning(
        "DATABASE_URL is not set. Database features are disabled. "
        "Copy backend/.env.example to backend/.env and fill in your Neon connection string."
    )


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


def get_db():
    """
    FastAPI dependency that yields a database session.
    Usage (in a router):
        db: Session = Depends(get_db)
    Not wired to any endpoint yet — reserved for issues #2+.
    """
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL is not configured; cannot open a DB session.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
