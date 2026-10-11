/**
 * triageSelectors.ts — Selectors and normalization helpers for SPOTCheck Triage Queue
 * and Map integration.
 *
 * All functions are pure, non-mutating, and preserve original array order.
 */

import { TriageAnomaly } from './triageTypes';
import { getSeverityRank, SEVERITY_RANKS } from './severity';
import { toStatus } from './status';

/**
 * Normalizes any waypoint identifier representation to standard uppercase 'WP##' format.
 * Examples:
 *   - 'wp7' -> 'WP07'
 *   - 'WP-07' -> 'WP07'
 *   - 'wp_7' -> 'WP07'
 *   - 'WP07' -> 'WP07'
 *   - '  wp09  ' -> 'WP09'
 *   - 'ZONE-A' -> 'ZONE-A' (fallback preserves non-standard format trimmed and uppercase)
 */
export function normalizeWaypointId(rawId?: string | null): string {
  if (!rawId) return '';
  const trimmed = rawId.trim().toUpperCase();
  const match = trimmed.match(/^WP[-_]?(\d+)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    return `WP${num.toString().padStart(2, '0')}`;
  }
  return trimmed;
}

/**
 * Extract normalized waypoint ID from an anomaly object.
 */
export function getAnomalyWaypointId(anomaly: TriageAnomaly): string {
  return normalizeWaypointId(anomaly.location_id);
}

/**
 * Returns anomalies at a given waypoint, preserving backend order.
 */
export function anomaliesByWaypoint(
  anomalies: TriageAnomaly[],
  waypointId?: string | null
): TriageAnomaly[] {
  if (!waypointId) return [];
  const normalizedTarget = normalizeWaypointId(waypointId);
  return anomalies.filter((a) => getAnomalyWaypointId(a) === normalizedTarget);
}

/**
 * Computes the highest severity at a waypoint.
 * Returns null if no anomalies exist at that waypoint.
 */
export function worstSeverityByWaypoint(
  anomalies: TriageAnomaly[],
  waypointId?: string | null
): string | null {
  const items = anomaliesByWaypoint(anomalies, waypointId);
  if (items.length === 0) return null;

  let worst = items[0].severity;
  let maxRank = getSeverityRank(worst);

  for (let i = 1; i < items.length; i++) {
    const rank = getSeverityRank(items[i].severity);
    if (rank > maxRank) {
      maxRank = rank;
      worst = items[i].severity;
    }
  }

  return worst;
}

/**
 * Returns count of open anomalies at a waypoint.
 */
export function countByWaypoint(
  anomalies: TriageAnomaly[],
  waypointId?: string | null
): number {
  return anomaliesByWaypoint(anomalies, waypointId).length;
}

/**
 * Precomputes summary statistics for every waypoint with anomalies.
 * Returns a Record mapping normalized waypoint ID to summary info.
 */
export interface WaypointAnomalySummary {
  count: number;
  worstSeverity: string;
  hasCritical: boolean;
  reviewRequiredCount: number;
  anomalies: TriageAnomaly[];
}

export function computeWaypointSummaries(
  anomalies: TriageAnomaly[]
): Record<string, WaypointAnomalySummary> {
  const summaries: Record<string, WaypointAnomalySummary> = {};

  for (const anomaly of anomalies) {
    const wpId = getAnomalyWaypointId(anomaly);
    if (!wpId) continue;

    if (!summaries[wpId]) {
      summaries[wpId] = {
        count: 0,
        worstSeverity: anomaly.severity,
        hasCritical: false,
        reviewRequiredCount: 0,
        anomalies: [],
      };
    }

    const summary = summaries[wpId];
    summary.count += 1;
    summary.anomalies.push(anomaly);

    if (Boolean(anomaly.operator_review_required)) {
      summary.reviewRequiredCount += 1;
    }

    if (getSeverityRank(anomaly.severity) > getSeverityRank(summary.worstSeverity)) {
      summary.worstSeverity = anomaly.severity;
    }

    if (toStatus(anomaly.severity) === 'critical') {
      summary.hasCritical = true;
    }
  }

  return summaries;
}

/**
 * Multi-criteria filter preserving original backend order:
 *   - waypointId: if set, filters to that waypoint
 *   - reviewRequiredOnly: if true, filters to items with operator_review_required === true
 */
export interface TriageFilterOptions {
  waypointId?: string | null;
  reviewRequiredOnly?: boolean;
}

export function filterAnomalies(
  anomalies: TriageAnomaly[],
  filters: TriageFilterOptions
): TriageAnomaly[] {
  const { waypointId, reviewRequiredOnly } = filters;
  const normalizedWp = waypointId ? normalizeWaypointId(waypointId) : null;

  return anomalies.filter((item) => {
    if (normalizedWp && getAnomalyWaypointId(item) !== normalizedWp) {
      return false;
    }
    if (reviewRequiredOnly && !item.operator_review_required) {
      return false;
    }
    return true;
  });
}
