"""
Tests for the predictions model warm-up at server startup.

Run from backend/:  python -m pytest tests/test_predictions_warmup.py -v
"""
import sys
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.main import app as fastapi_app, _should_warm_predictions  # noqa: E402
from app.services import predictions  # noqa: E402


def test_warmup_disabled_by_default(monkeypatch):
    monkeypatch.delenv("RENDER", raising=False)
    monkeypatch.delenv("PREDICTIONS_WARMUP", raising=False)
    assert _should_warm_predictions() is False


def test_warmup_enabled_on_render(monkeypatch):
    monkeypatch.setenv("RENDER", "true")
    monkeypatch.delenv("PREDICTIONS_WARMUP", raising=False)
    assert _should_warm_predictions() is True


def test_warmup_can_be_forced_off(monkeypatch):
    monkeypatch.setenv("RENDER", "true")
    monkeypatch.setenv("PREDICTIONS_WARMUP", "0")
    assert _should_warm_predictions() is False


def test_startup_warmup_fills_model_cache(monkeypatch):
    monkeypatch.setenv("ANALYTICS_FORCE_CSV", "1")
    monkeypatch.setenv("PREDICTIONS_WARMUP", "1")
    predictions.clear_predictions_cache()
    try:
        with TestClient(fastapi_app) as client:
            thread = fastapi_app.state.predictions_warmup
            assert thread is not None
            thread.join(timeout=120)
            assert not thread.is_alive()
            assert predictions._cached_loo_backtest is not None
            r = client.get("/api/predictions/missions/M006/forecast")
            assert r.status_code == 200
            assert r.json()["missionId"] == "M006"
    finally:
        predictions.clear_predictions_cache()


def test_no_warmup_thread_when_disabled(monkeypatch):
    monkeypatch.delenv("RENDER", raising=False)
    monkeypatch.delenv("PREDICTIONS_WARMUP", raising=False)
    with TestClient(fastapi_app):
        assert fastapi_app.state.predictions_warmup is None
