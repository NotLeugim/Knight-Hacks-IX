"""
backend/app/db/models.py

SQLAlchemy 2.0-style ORM models for SPOTSight.
Column names match the challenge CSVs in
  data/SPOT_KnightHacks_Challenge_Kit Part One/02_DATA/
Table names are lowercase plural.
Only failure_type is nullable; every other column is NOT NULL.
"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


# ---------------------------------------------------------------------------
# Locations
# ---------------------------------------------------------------------------
class Location(Base):
    __tablename__ = "locations"

    location_id: Mapped[str] = mapped_column(String, primary_key=True)
    location_name: Mapped[str] = mapped_column(String, nullable=False)
    zone_type: Mapped[str] = mapped_column(String, nullable=False)
    floor: Mapped[int] = mapped_column(Integer, nullable=False)
    x_coord: Mapped[float] = mapped_column(Float, nullable=False)
    y_coord: Mapped[float] = mapped_column(Float, nullable=False)
    environment: Mapped[str] = mapped_column(String, nullable=False)
    synthetic: Mapped[bool] = mapped_column(Boolean, nullable=False)


# ---------------------------------------------------------------------------
# Assets
# ---------------------------------------------------------------------------
class Asset(Base):
    __tablename__ = "assets"

    asset_id: Mapped[str] = mapped_column(String, primary_key=True)
    asset_name: Mapped[str] = mapped_column(String, nullable=False)
    asset_type: Mapped[str] = mapped_column(String, nullable=False)
    location_id: Mapped[str] = mapped_column(
        String, ForeignKey("locations.location_id"), nullable=False
    )
    criticality: Mapped[str] = mapped_column(String, nullable=False)
    synthetic: Mapped[bool] = mapped_column(Boolean, nullable=False)


# ---------------------------------------------------------------------------
# Missions
# ---------------------------------------------------------------------------
class Mission(Base):
    __tablename__ = "missions"

    mission_id: Mapped[str] = mapped_column(String, primary_key=True)
    mission_name: Mapped[str] = mapped_column(String, nullable=False)
    scenario: Mapped[str] = mapped_column(String, nullable=False)
    configuration_version: Mapped[str] = mapped_column(String, nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    duration_min: Mapped[int] = mapped_column(Integer, nullable=False)
    start_battery_pct: Mapped[int] = mapped_column(Integer, nullable=False)
    end_battery_pct: Mapped[int] = mapped_column(Integer, nullable=False)
    mission_status: Mapped[str] = mapped_column(String, nullable=False)
    operator_mode: Mapped[str] = mapped_column(String, nullable=False)
    synthetic: Mapped[bool] = mapped_column(Boolean, nullable=False)


# ---------------------------------------------------------------------------
# Actions
# ---------------------------------------------------------------------------
class Action(Base):
    __tablename__ = "actions"

    action_id: Mapped[str] = mapped_column(String, primary_key=True)
    mission_id: Mapped[str] = mapped_column(
        String, ForeignKey("missions.mission_id"), nullable=False
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    location_id: Mapped[str] = mapped_column(
        String, ForeignKey("locations.location_id"), nullable=False
    )
    asset_id: Mapped[str] = mapped_column(
        String, ForeignKey("assets.asset_id"), nullable=False
    )
    action_type: Mapped[str] = mapped_column(String, nullable=False)
    battery_pct: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    failure_type: Mapped[str | None] = mapped_column(String, nullable=True)
    duration_sec: Mapped[int] = mapped_column(Integer, nullable=False)
    scenario: Mapped[str] = mapped_column(String, nullable=False)
    configuration_version: Mapped[str] = mapped_column(String, nullable=False)
    synthetic: Mapped[bool] = mapped_column(Boolean, nullable=False)


# ---------------------------------------------------------------------------
# Readings
# ---------------------------------------------------------------------------
class Reading(Base):
    __tablename__ = "readings"

    reading_id: Mapped[str] = mapped_column(String, primary_key=True)
    action_id: Mapped[str] = mapped_column(
        String, ForeignKey("actions.action_id"), nullable=False
    )
    mission_id: Mapped[str] = mapped_column(
        String, ForeignKey("missions.mission_id"), nullable=False
    )
    asset_id: Mapped[str] = mapped_column(
        String, ForeignKey("assets.asset_id"), nullable=False
    )
    location_id: Mapped[str] = mapped_column(
        String, ForeignKey("locations.location_id"), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    measurement_type: Mapped[str] = mapped_column(String, nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String, nullable=False)
    quality: Mapped[str] = mapped_column(String, nullable=False)
    synthetic: Mapped[bool] = mapped_column(Boolean, nullable=False)


# ---------------------------------------------------------------------------
# Anomalies
# ---------------------------------------------------------------------------
class Anomaly(Base):
    __tablename__ = "anomalies"

    anomaly_id: Mapped[str] = mapped_column(String, primary_key=True)
    action_id: Mapped[str] = mapped_column(
        String, ForeignKey("actions.action_id"), nullable=False
    )
    mission_id: Mapped[str] = mapped_column(
        String, ForeignKey("missions.mission_id"), nullable=False
    )
    location_id: Mapped[str] = mapped_column(
        String, ForeignKey("locations.location_id"), nullable=False
    )
    asset_id: Mapped[str] = mapped_column(
        String, ForeignKey("assets.asset_id"), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    anomaly_type: Mapped[str] = mapped_column(String, nullable=False)
    severity: Mapped[str] = mapped_column(String, nullable=False)
    operator_review_required: Mapped[bool] = mapped_column(Boolean, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    synthetic: Mapped[bool] = mapped_column(Boolean, nullable=False)
