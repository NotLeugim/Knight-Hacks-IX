"""
backend/app/api/predictions.py

FastAPI router exposing predictive endpoints (issue #16 / AI-3):
1. GET /api/predictions/trends - Active Trend Watch alerts
2. GET /api/predictions/trends/backtest - Walk-forward anomaly backtest
3. GET /api/predictions/model - Risk forecast model metadata & honest backtest
4. GET /api/predictions/missions/{mission_id}/forecast - Mission route risk forecast & reordering
"""

from datetime import datetime, timezone
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.services import predictions as predictions_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


@router.get("/trends")
async def get_trend_alerts(
    as_of: str | None = Query(
        None,
        description="Optional ISO timestamp cutoff for historical trend evaluation",
    ),
) -> dict[str, Any]:
    """Surfaces active wear and anomaly trends based on sliding-window reading history."""
    try:
        alerts = await predictions_service.get_trend_alerts(as_of=as_of)
        return {
            "alerts": alerts,
            "totalAlerts": len(alerts),
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        }
    except FileNotFoundError as exc:
        logger.error("Data files missing for trend alerts: %s", exc)
        raise HTTPException(status_code=503, detail="Prediction data files unavailable")
    except Exception as exc:
        logger.error("Error generating trend alerts: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to compute trend alerts")


@router.get("/trends/backtest")
def get_trend_backtest() -> dict[str, Any]:
    """Walks forward through readings without hindsight to backtest wear anomaly predictive power."""
    try:
        return predictions_service.get_trend_backtest()
    except FileNotFoundError as exc:
        logger.error("Data files missing for trend backtest: %s", exc)
        raise HTTPException(status_code=503, detail="Prediction data files unavailable")
    except Exception as exc:
        logger.error("Error computing trend backtest: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to run trend backtest")


@router.get("/model")
def get_model_metadata() -> dict[str, Any]:
    """Returns L2 logistic regression model metadata, leave-one-mission-out backtest, and factor analysis."""
    try:
        return predictions_service.get_model_metadata()
    except FileNotFoundError as exc:
        logger.error("Data files missing for model metadata: %s", exc)
        raise HTTPException(status_code=503, detail="Prediction data files unavailable")
    except Exception as exc:
        logger.error("Error generating model metadata: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve model metadata")


@router.get("/missions/{mission_id}/forecast")
def get_mission_forecast(
    mission_id: str,
    start_battery: float | None = Query(
        None,
        description="Simulated start battery percentage between 20 and 100",
    ),
    config: str | None = Query(
        None,
        description="Simulated configuration version ('V1' or 'V2')",
    ),
) -> dict[str, Any]:
    """Generates pre-mission risk forecast and suggested route reordering."""
    if start_battery is not None and not (20.0 <= start_battery <= 100.0):
        raise HTTPException(
            status_code=422,
            detail="start_battery must be between 20 and 100",
        )

    if config is not None and config not in ("V1", "V2"):
        raise HTTPException(
            status_code=422,
            detail="config must be 'V1' or 'V2'",
        )

    try:
        forecast = predictions_service.get_mission_forecast(
            mission_id=mission_id,
            start_battery=start_battery,
            config=config,
        )
    except FileNotFoundError as exc:
        logger.error("Data files missing for mission forecast: %s", exc)
        raise HTTPException(status_code=503, detail="Prediction data files unavailable")
    except Exception as exc:
        logger.error("Error computing mission forecast for %s: %s", mission_id, exc)
        raise HTTPException(status_code=500, detail="Failed to compute mission forecast")

    if forecast is None:
        raise HTTPException(
            status_code=404,
            detail=f"Mission not found: {mission_id}",
        )

    return forecast
