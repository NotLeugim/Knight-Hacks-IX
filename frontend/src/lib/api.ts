/**
 * api.ts — Fetch wrapper for the SPOTSight FastAPI backend.
 * Base URL is configured via NEXT_PUBLIC_API_URL env var (falls back to localhost).
 */

import { AnalyticsResponse } from './analyticsTypes';
import { analyticsFixture } from './analyticsFixture';

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

// ── Missions ────────────────────────────────────────────────────────────────

export async function fetchMissionPath(id: string) {
  return get<{ id: string; path: unknown[] }>(`/missions/${id}/path`);
}

// ── Findings ────────────────────────────────────────────────────────────────

export async function fetchFindings() {
  return get<{ findings: unknown }>('/findings');
}

// ── Triage ──────────────────────────────────────────────────────────────────

export async function fetchTriageQueue() {
  return get<{ queue: unknown[] }>('/triage');
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

