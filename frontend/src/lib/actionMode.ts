/**
 * actionMode.ts — Pure helper module for Action Mode failure heat map evaluation.
 *
 * Exposes the "Completed Mission Paradox" by visualizing action failure outcomes:
 * - Source of truth = action outcome (failed status / ACTION_FAILED)
 * - Anomaly or concern severity does NOT dictate heat color
 * - Continuous color ramp: Low failure rate (green) -> Medium (yellow/orange) -> High (red)
 * - Intensity & radius scale with failedCount so high-frequency failure points read hotter
 * - Zero failure waypoints remain a calm, low-intensity green
 */

export interface ActionRecord {
  action_id: string;
  mission_id?: string;
  sequence?: string | number;
  timestamp?: string;
  location_id: string; // e.g. 'WP05'
  asset_id?: string;
  action_type?: string;
  battery_pct?: string | number;
  status: string; // 'SUCCESS' | 'FAILED'
  failure_type?: string;
  duration_sec?: string | number;
  event_type?: string;
  // Anomaly metadata may exist in data, but is ignored for Action Mode heat calculation
  anomaly_id?: string | null;
  severity?: string | null;
  anomaly_type?: string | null;
  description?: string;
}

export interface FailedActionItem {
  action_id: string;
  action_type?: string;
  failure_type?: string;
  timestamp?: string;
  mission_id?: string;
}

export interface WaypointHeatMetrics {
  waypointId: string;
  totalCount: number;
  failedCount: number;
  failureRate: number; // 0.0 to 1.0
  heatScore: number;   // 0.0 to 1.0
  color: string;       // Hex string (#10b981 -> #eab308 -> #f97316 -> #ef4444)
  glowRgba: string;    // rgba string for radial gradient and halo
  glowRadius: number;  // pixel radius for glow halo (24px to 85px)
  glowOpacity: number; // 0.2 to 0.85
  failedActions: FailedActionItem[];
  isFailing: boolean;
}

/**
 * Linearly interpolates between two RGB colors [r, g, b].
 */
function interpolateRgb(
  colorA: [number, number, number],
  colorB: [number, number, number],
  t: number
): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  return [
    Math.round(colorA[0] + (colorB[0] - colorA[0]) * clamped),
    Math.round(colorA[1] + (colorB[1] - colorA[1]) * clamped),
    Math.round(colorA[2] + (colorB[2] - colorA[2]) * clamped),
  ];
}

function rgbToHex(rgb: [number, number, number]): string {
  return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');
}

/**
 * Continuous color ramp driven by failure heat standardized to 3 status levels:
 * 0.00: Emerald green (#10b981) - Zero failures / Nominal
 * 0.35: Yellow (#eab308)        - Moderate failure rate / Warning
 * 0.70+: Bright Red (#ef4444)   - High failure rate / Critical
 */
export function getHeatColor(heatScore: number): string {
  if (heatScore <= 0) {
    return '#10b981';
  }

  const STOPS: Array<{ at: number; rgb: [number, number, number] }> = [
    { at: 0.0, rgb: [16, 185, 129] },  // #10b981 (Green - Nominal)
    { at: 0.35, rgb: [234, 179, 8] },  // #eab308 (Yellow - Warning)
    { at: 0.70, rgb: [239, 68, 68] },  // #ef4444 (Red - Critical)
    { at: 1.0, rgb: [239, 68, 68] },   // #ef4444 (Red - Critical)
  ];

  for (let i = 0; i < STOPS.length - 1; i++) {
    const cur = STOPS[i];
    const nxt = STOPS[i + 1];
    if (heatScore >= cur.at && heatScore <= nxt.at) {
      const localT = (heatScore - cur.at) / (nxt.at - cur.at);
      const rgb = interpolateRgb(cur.rgb, nxt.rgb, localT);
      return rgbToHex(rgb);
    }
  }

  return '#ef4444';
}

/**
 * Computes heat ramp metrics (color, radius, opacity, glow) from action failure counts.
 * - If failedCount === 0: calm low-intensity green, compact radius.
 * - If failedCount > 0: heat scales with failureRate and count intensity.
 */
export function computeHeatRamp(
  failedCount: number,
  totalCount: number,
  failureRate: number
): {
  heatScore: number;
  color: string;
  glowRgba: string;
  glowRadius: number;
  glowOpacity: number;
} {
  if (totalCount === 0 || failedCount === 0) {
    return {
      heatScore: 0,
      color: '#10b981',
      glowRgba: 'rgba(16, 185, 129, 0.25)',
      glowRadius: 24,
      glowOpacity: 0.2,
    };
  }

  // Weight failureRate heavily (70%), blended with volume scaling (30% up to 10 failures)
  const volumeFactor = Math.min(1.0, failedCount / 10);
  const heatScore = Math.min(1.0, failureRate * 0.7 + volumeFactor * 0.3);

  const color = getHeatColor(heatScore);

  // Radius scales from 38px up to 85px to merge with neighboring hot zones
  const glowRadius = Math.round(38 + volumeFactor * 35 + failureRate * 12);

  // Opacity scales from 0.45 up to 0.85
  const glowOpacity = Math.round((0.45 + heatScore * 0.4) * 100) / 100;

  // Convert hex color to rgba glow
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const glowRgba = `rgba(${r}, ${g}, ${b}, ${glowOpacity})`;

  return {
    heatScore,
    color,
    glowRgba,
    glowRadius,
    glowOpacity,
  };
}

/**
 * Aggregates all action records for a single waypoint based strictly on failure status.
 * Any anomaly flags or concern indicators are deliberately ignored.
 */
export function aggregateWaypointActions(
  waypointId: string,
  actions: ActionRecord[]
): {
  waypointId: string;
  totalCount: number;
  failedCount: number;
  failureRate: number;
  failedActions: FailedActionItem[];
} {
  const targetNorm = waypointId.trim().toUpperCase().replace(/[-_]/g, '');

  const matching = actions.filter((a) => {
    const locNorm = (a.location_id || '').trim().toUpperCase().replace(/[-_]/g, '');
    return locNorm === targetNorm;
  });

  const failedItems: FailedActionItem[] = [];
  let failedCount = 0;

  for (const act of matching) {
    const status = (act.status || '').trim().toUpperCase();
    const eventType = (act.event_type || '').trim().toUpperCase();

    const isFailed = status === 'FAILED' || eventType === 'ACTION_FAILED';
    if (isFailed) {
      failedCount++;
      failedItems.push({
        action_id: act.action_id,
        action_type: act.action_type,
        failure_type: act.failure_type,
        timestamp: act.timestamp,
        mission_id: act.mission_id,
      });
    }
  }

  const totalCount = matching.length;
  const failureRate = totalCount > 0 ? failedCount / totalCount : 0;

  return {
    waypointId,
    totalCount,
    failedCount,
    failureRate,
    failedActions: failedItems,
  };
}

/**
 * Resolves full heat metrics and style attributes for a waypoint in Action Mode.
 */
export function resolveWaypointHeat(
  waypointId: string,
  actions: ActionRecord[]
): WaypointHeatMetrics {
  const aggregated = aggregateWaypointActions(waypointId, actions);
  const ramp = computeHeatRamp(
    aggregated.failedCount,
    aggregated.totalCount,
    aggregated.failureRate
  );

  return {
    waypointId,
    totalCount: aggregated.totalCount,
    failedCount: aggregated.failedCount,
    failureRate: aggregated.failureRate,
    heatScore: ramp.heatScore,
    color: ramp.color,
    glowRgba: ramp.glowRgba,
    glowRadius: ramp.glowRadius,
    glowOpacity: ramp.glowOpacity,
    failedActions: aggregated.failedActions,
    isFailing: aggregated.failedCount > 0,
  };
}

/**
 * Precomputes heat summaries across all given waypoint IDs.
 */
export function computeAllWaypointsHeat(
  waypointIds: string[],
  actions: ActionRecord[]
): Record<string, WaypointHeatMetrics> {
  const result: Record<string, WaypointHeatMetrics> = {};
  for (const wpId of waypointIds) {
    result[wpId] = resolveWaypointHeat(wpId, actions);
  }
  return result;
}

export * from './actionFailureCauses';
