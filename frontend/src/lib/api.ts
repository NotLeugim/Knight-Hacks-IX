/**
 * api.ts — Fetch wrapper for the SPOTSight FastAPI backend.
 * Base URL is configured via NEXT_PUBLIC_API_URL env var (falls back to localhost).
 */

import { AnalyticsResponse } from './analyticsTypes';
import { analyticsFixture } from './analyticsFixture';
import { TriageAnomaly, TriageQueueResponse } from './triageTypes';
import { triageFixture } from './triageFixture';

export * from './triageTypes';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

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
    console.log('[SPOTSight] Backend health:', data);
  } catch (err) {
    console.warn('[SPOTSight] Backend unreachable — running in frontend-only mode.', err);
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
      console.warn('[SPOTSight] Failed to parse SSE event payload:', err);
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
      '[SPOTSight] GET /api/triage returned empty queue or stub. Falling back to local triage fixture.'
    );
    return { queue: triageFixture, source: 'fixture' };
  } catch (err) {
    console.warn(
      '[SPOTSight] Failed to fetch /api/triage. Falling back to local triage fixture.',
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
      '[SPOTSight] GET /api/analytics returned invalid shape. Falling back to local fixture.',
      data
    );
    return { data: analyticsFixture, source: 'fixture' };
  } catch (err) {
    console.warn(
      '[SPOTSight] Failed to fetch /api/analytics. Falling back to local fixture.',
      err
    );
    return { data: analyticsFixture, source: 'fixture' };
  }
}

