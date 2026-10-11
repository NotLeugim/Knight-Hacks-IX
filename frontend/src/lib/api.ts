/**
 * api.ts — Fetch wrapper for the SPOTCheck FastAPI backend.
 * Base URL is configured via NEXT_PUBLIC_API_URL env var (falls back to localhost).
 */

import { AnalyticsResponse } from './analyticsTypes';
import { analyticsFixture } from './analyticsFixture';
import { TriageAnomaly, TriageQueueResponse } from './triageTypes';
import { triageFixture } from './triageFixture';

export * from './triageTypes';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000');

// ── Generic helper ──────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status} on GET ${path}`);
  }
  return res.json() as Promise<T>;
}

// ── Health ──────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  message: string;
}

/** Called on page mount to verify CORS + backend connectivity. */
export async function checkHealth(): Promise<void> {
  try {
    const data = await get<HealthResponse>('/api/health');
    console.log('[SPOTCheck] Backend health:', data);
  } catch (err) {
    console.warn('[SPOTCheck] Backend unreachable — running in frontend-only mode.', err);
  }
}

// ── Live Telemetry Stream (SSE) ──────────────────────────────────────────────

export type ReplayEventType =
  | 'MISSION_STARTED'
  | 'ACTION_STARTED'
  | 'ACTION_FAILED'
  | 'ACTION_COMPLETED'
  | 'MISSION_COMPLETED';

export interface ReplayEvent<TDetails = Record<string, unknown>> {
  event_id: string;
  mission_id: string;
  timestamp: string;
  event_type: ReplayEventType;
  details: TDetails;
}

export interface LiveStreamOptions {
  delay?: number;
  loop?: boolean;
  onEvent: (event: ReplayEvent) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
}

/**
 * Subscribes to the /api/stream/live SSE endpoint.
 * Returns an unsubscribe function to close the connection.
 */
export function subscribeLiveStream(options: LiveStreamOptions): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const params = new URLSearchParams();
  if (options.delay !== undefined) {
    params.set('delay', options.delay.toString());
  }
  if (options.loop) {
    params.set('loop', 'true');
  }

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const url = `${API_BASE}/api/stream/live${queryStr}`;

  const eventSource = new EventSource(url);

  eventSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data) as ReplayEvent;
      options.onEvent(data);
    } catch (err) {
      console.warn('[SPOTCheck] Failed to parse SSE event payload:', err);
    }
  };

  eventSource.onerror = (err) => {
    options.onError?.(err);
  };

  return () => {
    eventSource.close();
    options.onClose?.();
  };
}

// ── Missions ────────────────────────────────────────────────────────────────

export async function fetchMissionPath(id: string) {
  return get<{ id: string; path: unknown[] }>(`/missions/${id}/path`);
}

// ── Findings ────────────────────────────────────────────────────────────────

export async function fetchFindings() {
  return get<{ findings: unknown }>('/findings');
}

// ── Triage ──────────────────────────────────────────────────────────────────

export async function fetchTriageQueue(): Promise<{
  queue: TriageAnomaly[];
  source: 'api' | 'fixture';
}> {
  try {
    // Try /api/triage first; if 404/fails, try legacy /triage
    let data: TriageQueueResponse;
    try {
      data = await get<TriageQueueResponse>('/api/triage');
    } catch {
      data = await get<TriageQueueResponse>('/triage');
    }

    if (Array.isArray(data?.queue) && data.queue.length > 0) {
      return { queue: data.queue, source: 'api' };
    }

    console.warn(
      '[SPOTCheck] GET /api/triage returned empty queue or stub. Falling back to local triage fixture.'
    );
    return { queue: triageFixture, source: 'fixture' };
  } catch (err) {
    console.warn(
      '[SPOTCheck] Failed to fetch /api/triage. Falling back to local triage fixture.',
      err
    );
    return { queue: triageFixture, source: 'fixture' };
  }
}

// ── Analytics ───────────────────────────────────────────────────────────────

export async function fetchAnalytics(): Promise<{
  data: AnalyticsResponse;
  source: 'api' | 'fixture';
}> {
  try {
    const data = await get<AnalyticsResponse>('/api/analytics');
    if (
      Array.isArray(data?.batteryReliability) &&
      Array.isArray(data?.missionParadox?.missions)
    ) {
      return { data, source: 'api' };
    }
    console.warn(
      '[SPOTCheck] GET /api/analytics returned invalid shape. Falling back to local fixture.',
      data
    );
    return { data: analyticsFixture, source: 'fixture' };
  } catch (err) {
    console.warn(
      '[SPOTCheck] Failed to fetch /api/analytics. Falling back to local fixture.',
      err
    );
    return { data: analyticsFixture, source: 'fixture' };
  }
}

// ── Actions ─────────────────────────────────────────────────────────────────

import { ActionRecord } from './actionMode';
import { actionsFixture } from './actionsFixture';

export async function fetchActions(): Promise<{
  actions: ActionRecord[];
  source: 'api' | 'fixture';
}> {
  try {
    const data = await get<{ actions: ActionRecord[] }>('/api/actions');
    if (Array.isArray(data?.actions) && data.actions.length > 0) {
      return { actions: data.actions, source: 'api' };
    }
    return { actions: actionsFixture, source: 'fixture' };
  } catch (err) {
    return { actions: actionsFixture, source: 'fixture' };
  }
}

// ── Shift Summaries (issue #15 / AI-2) ──────────────────────────────────────

import type { MissionSummary, ShiftHandoffResponse, ReplayEventResponse } from './summaryTypes';
export * from './summaryTypes';

/**
 * Fetches an AI mission summary from /api/summary.
 * If missionId is specified, appends ?mission_id={missionId}.
 * Returns { data: MissionSummary | null; source: 'api' | 'offline'; error?: string }.
 */
export async function fetchSummary(
  missionId?: string,
  regenerate = false
): Promise<{ data: MissionSummary | null; source: 'api' | 'offline'; error?: string }> {
  try {
    const params = new URLSearchParams();
    if (missionId) params.append('mission_id', missionId);
    if (regenerate) params.append('regenerate', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await get<MissionSummary>(`/api/summary${query}`);
    return { data, source: 'api' };
  } catch (err: any) {
    console.warn('[SPOTCheck] Failed to fetch summary from /api/summary:', err);
    return { data: null, source: 'offline', error: err?.message || 'Failed to fetch summary' };
  }
}

export const fetchLatestSummary = fetchSummary;

/**
 * Fetches an end-of-mission shift summary for a specific mission.
 * Returns { data: null, source: 'offline' } if the backend is unreachable.
 */
export async function fetchMissionSummary(
  missionId: string,
  regenerate = false
): Promise<{ data: MissionSummary | null; source: 'api' | 'offline' }> {
  try {
    const query = regenerate ? '?regenerate=true' : '';
    const data = await get<MissionSummary>(`/api/missions/${missionId}/summary${query}`);
    return { data, source: 'api' };
  } catch (err) {
    console.warn(`[SPOTCheck] Failed to fetch summary for mission ${missionId}:`, err);
    return { data: null, source: 'offline' };
  }
}

/**
 * Fetches the most recent shift handoff summaries (newest first).
 * Returns { missions: [], source: 'offline' } if the backend is unreachable.
 */
export async function fetchShiftHandoff(
  limit = 3
): Promise<{ missions: MissionSummary[]; source: 'api' | 'offline' }> {
  try {
    const res = await get<ShiftHandoffResponse>(`/api/shift-handoff?limit=${limit}`);
    if (Array.isArray(res?.missions)) {
      return { missions: res.missions, source: 'api' };
    }
    return { missions: [], source: 'api' };
  } catch (err) {
    console.warn('[SPOTCheck] Failed to fetch shift handoff:', err);
    return { missions: [], source: 'offline' };
  }
}

/**
 * Posts a replay telemetry event to the backend trigger endpoint.
 */
export async function postReplayEvent(
  event: Record<string, unknown>
): Promise<ReplayEventResponse> {
  const res = await fetch(`${API_BASE}/api/events/replay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status} on POST /api/events/replay`);
  }
  return res.json() as Promise<ReplayEventResponse>;
}

// ── Predictions & Forecast (issue #16 / AI-3) ──────────────────────────────────

import type {
  TrendAlertsResponse,
  TrendBacktestResponse,
  PredictionModelResponse,
  MissionForecastResponse,
} from './predictionsTypes';
import {
  predictionsTrendsFixture,
  predictionsBacktestFixture,
  predictionsModelFixture,
} from './predictionsFixture';
export * from './predictionsTypes';

/**
 * Fetches active sliding-window wear alerts.
 * Returns { data, source: 'api' } on success, or { data: predictionsTrendsFixture, source: 'offline' }.
 */
export async function fetchTrendAlerts(
  asOf?: string
): Promise<{ data: TrendAlertsResponse; source: 'api' | 'offline' }> {
  try {
    const query = asOf ? `?as_of=${encodeURIComponent(asOf)}` : '';
    const data = await get<TrendAlertsResponse>(`/api/predictions/trends${query}`);
    return { data, source: 'api' };
  } catch (err) {
    console.warn('[SPOTCheck] Failed to fetch trend alerts, falling back to fixture:', err);
    return { data: predictionsTrendsFixture, source: 'offline' };
  }
}

/**
 * Fetches the walk-forward wear alerts backtest.
 * Returns { data, source: 'api' } on success, or { data: predictionsBacktestFixture, source: 'offline' }.
 */
export async function fetchTrendBacktest(): Promise<{
  data: TrendBacktestResponse;
  source: 'api' | 'offline';
}> {
  try {
    const data = await get<TrendBacktestResponse>('/api/predictions/trends/backtest');
    return { data, source: 'api' };
  } catch (err) {
    console.warn('[SPOTCheck] Failed to fetch trend backtest, falling back to fixture:', err);
    return { data: predictionsBacktestFixture, source: 'offline' };
  }
}

/**
 * Fetches the L2 regularized logistic regression model specs and honest LOO backtest.
 * Returns { data, source: 'api' } on success, or { data: predictionsModelFixture, source: 'offline' }.
 */
export async function fetchPredictionModel(): Promise<{
  data: PredictionModelResponse;
  source: 'api' | 'offline';
}> {
  try {
    const data = await get<PredictionModelResponse>('/api/predictions/model');
    return { data, source: 'api' };
  } catch (err) {
    console.warn('[SPOTCheck] Failed to fetch prediction model, falling back to fixture:', err);
    return { data: predictionsModelFixture, source: 'offline' };
  }
}

/**
 * Fetches the pre-mission Risk Forecast for a given mission route.
 * Supports what-if starting battery (20-100) and configuration override (V1/V2).
 * Returns { data: null, source: 'offline' } if server is unreachable (no fixture).
 */
export async function fetchMissionForecast(
  missionId: string,
  startBattery?: number,
  config?: string
): Promise<{ data: MissionForecastResponse | null; source: 'api' | 'offline' }> {
  try {
    const params = new URLSearchParams();
    if (startBattery !== undefined) {
      params.append('start_battery', String(startBattery));
    }
    if (config) {
      params.append('config', config);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    const data = await get<MissionForecastResponse>(
      `/api/predictions/missions/${missionId}/forecast${qs}`
    );
    return { data, source: 'api' };
  } catch (err) {
    console.warn(`[SPOTCheck] Failed to fetch forecast for mission ${missionId}:`, err);
    return { data: null, source: 'offline' };
  }
}

// ── Weather & Plant Impacts ──────────────────────────────────────────────────

import type {
  GeocodeResponse,
  WeatherForecastResponse,
  PlantImpactResponse,
} from './weatherTypes';
export * from './weatherTypes';

/**
 * Searches for locations matching a query using the Open-Meteo geocoding backend endpoint.
 * Returns { results: [], source: 'offline' } on network failure or if query is too short.
 */
export async function fetchWeatherGeocode(
  query: string
): Promise<{ results: GeocodeResponse['results']; source: 'api' | 'offline' }> {
  const cleanQ = query.trim();
  if (cleanQ.length < 2) {
    return { results: [], source: 'api' };
  }
  try {
    const data = await get<GeocodeResponse>(
      `/api/weather/geocode?q=${encodeURIComponent(cleanQ)}`
    );
    return { results: data?.results || [], source: 'api' };
  } catch (err) {
    console.warn(`[SPOTCheck] Failed to geocode query '${cleanQ}':`, err);
    return { results: [], source: 'offline' };
  }
}

/**
 * Fetches the 7-day forecast, 48-hour hourly series, and NWS alerts for coordinates.
 * Returns { data: null, source: 'offline' } if the backend is unreachable.
 * Never invents mock weather data.
 */
export async function fetchWeatherForecast(
  lat: number,
  lon: number,
  name?: string
): Promise<{ data: WeatherForecastResponse | null; source: 'api' | 'offline' }> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
    });
    if (name) {
      params.append('name', name);
    }
    const data = await get<WeatherForecastResponse>(`/api/weather/forecast?${params.toString()}`);
    return { data, source: 'api' };
  } catch (err) {
    console.warn(`[SPOTCheck] Failed to fetch forecast for (${lat}, ${lon}):`, err);
    return { data: null, source: 'offline' };
  }
}

/**
 * Fetches power plant impact analysis (safety thresholds, output indicators, recommended actions).
 * Returns { data: null, source: 'offline' } if the backend is unreachable.
 */
export async function fetchPlantImpacts(
  lat: number,
  lon: number,
  plant: string = 'mix',
  name?: string
): Promise<{ data: PlantImpactResponse | null; source: 'api' | 'offline' }> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      plant,
    });
    if (name) {
      params.append('name', name);
    }
    const data = await get<PlantImpactResponse>(`/api/weather/plant-impacts?${params.toString()}`);
    return { data, source: 'api' };
  } catch (err) {
    console.warn(`[SPOTCheck] Failed to fetch plant impacts for ${plant} at (${lat}, ${lon}):`, err);
    return { data: null, source: 'offline' };
  }
}





// ── Worker Safety Advisory ──────────────────────────────────────────────────

import type { WorkerSafetyData, WorkerSafetyResponse } from './workerSafetyTypes';
export * from './workerSafetyTypes';

/**
 * Fetches worker occupational safety recommendations for follow-up visits.
 * Returns { data, source: 'live' } on success, or { data: null, source: 'offline' } if unreachable.
 */
export async function fetchWorkerSafety(
  missionId: string
): Promise<WorkerSafetyResponse> {
  try {
    const data = await get<WorkerSafetyData>(`/api/worker-safety/missions/${encodeURIComponent(missionId)}`);
    return { data, source: 'live' };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn(`[SPOTCheck] Failed to fetch worker safety for mission ${missionId}:`, err);
    return { data: null, source: 'offline', error: errorMessage };
  }
}
