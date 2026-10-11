/**
 * actionFailureCauses.ts — Rule-based failure grouping and possible-cause inference.
 *
 * Implements deterministic, transparent causal hypothesis generation
 * for Spot robot action failures (exposing the Completed Mission Paradox):
 * - Groups failed actions by action type (Navigation, Thermal, Acoustic, etc.)
 * - Discovers possible failure causes from contextual signals:
 *   - Robot state (battery depletion < 25%)
 *   - Equipment / single-asset hardware clustering
 *   - Navigation obstacles & localization loss
 *   - Equipment / sensor timeouts & unreliable telemetry
 *   - Environmental thermal or vibration extremes
 *   - Unknown / needs investigation (when no supporting evidence exists)
 * - Computes fleet-level failure summary across all missions
 */

import { ActionRecord } from './actionMode';

export type CauseCategory =
  | 'Environmental'
  | 'Equipment/Sensor'
  | 'Navigation/Obstacle'
  | 'Robot state (battery)'
  | 'Unknown';

export interface PossibleCauseHypothesis {
  id: string;
  category: CauseCategory;
  hypothesis: string;
  evidence: string;
  explainedCount: number;
  explainedPercentage: number;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface FailedActionTypeBreakdown {
  actionType: string;
  count: number;
  percentage: number;
  failureTypes: string[];
}

export interface WaypointFailureDetails {
  waypointId: string;
  totalCount: number;
  failedCount: number;
  failureRate: number; // 0.0 to 1.0
  actionTypeBreakdown: FailedActionTypeBreakdown[];
  failedActions: ActionRecord[];
  possibleCauses: PossibleCauseHypothesis[];
  topCauseCategory?: CauseCategory;
}

export interface FleetFailureSummary {
  totalActions: number;
  totalFailedActions: number;
  fleetFailureRate: number;
  missionsWithFailuresCount: number;
  totalMissionsCount: number;
  topFailingWaypoints: Array<{
    waypointId: string;
    failedCount: number;
    totalCount: number;
    failureRate: number;
  }>;
  topFailedActionTypes: Array<{ actionType: string; count: number }>;
  topCauseCategories: Array<{ category: CauseCategory; count: number }>;
}

/**
 * Normalizes action type names for consistent display (e.g. NAVIGATION -> Navigation).
 */
export function formatActionTypeName(rawType?: string): string {
  if (!rawType) return 'Unspecified';
  const clean = rawType.replace(/_/g, ' ').toLowerCase();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Groups failed actions by action type and summarizes failure reasons.
 */
export function groupFailedActionsByType(
  failedActions: ActionRecord[]
): FailedActionTypeBreakdown[] {
  if (!failedActions || failedActions.length === 0) return [];

  const counts: Record<string, { count: number; failureTypes: Set<string> }> = {};
  const total = failedActions.length;

  for (const act of failedActions) {
    const rawType = act.action_type || 'UNSPECIFIED';
    const normType = formatActionTypeName(rawType);

    if (!counts[normType]) {
      counts[normType] = { count: 0, failureTypes: new Set<string>() };
    }
    counts[normType].count++;
    if (act.failure_type) {
      counts[normType].failureTypes.add(act.failure_type);
    }
  }

  return Object.entries(counts)
    .map(([actionType, item]) => ({
      actionType,
      count: item.count,
      percentage: Math.round((item.count / total) * 100),
      failureTypes: Array.from(item.failureTypes),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Infers possible cause hypotheses from failed actions using transparent rule-based logic.
 * Every hypothesis is backed by observable evidence from the data.
 * Failures without supporting signals are placed in "Unknown / needs investigation".
 */
export function inferPossibleCauses(
  failedActions: ActionRecord[]
): PossibleCauseHypothesis[] {
  if (!failedActions || failedActions.length === 0) return [];

  const total = failedActions.length;
  const hypotheses: PossibleCauseHypothesis[] = [];
  const explainedActionIds = new Set<string>();

  // 1. Robot state (battery depletion < 25%)
  const lowBatActions = failedActions.filter((a) => {
    const b = Number(a.battery_pct);
    return !isNaN(b) && b > 0 && b < 25;
  });
  if (lowBatActions.length > 0) {
    const count = lowBatActions.length;
    lowBatActions.forEach((a) => explainedActionIds.add(a.action_id));
    hypotheses.push({
      id: 'cause-battery',
      category: 'Robot state (battery)',
      hypothesis: 'Battery depletion below operational threshold (< 25%)',
      evidence:
        count === total
          ? `All ${total} failures occurred when battery was low (< 25%)`
          : `${count} of ${total} failures occurred when battery < 25%`,
      explainedCount: count,
      explainedPercentage: Math.round((count / total) * 100),
      confidence: count === total ? 'High' : count / total >= 0.5 ? 'Medium' : 'Low',
    });
  }

  // 2. Equipment / Single-Asset Hardware Clustering
  const assetCounts: Record<string, { count: number; actions: ActionRecord[] }> = {};
  for (const a of failedActions) {
    if (a.asset_id) {
      if (!assetCounts[a.asset_id]) {
        assetCounts[a.asset_id] = { count: 0, actions: [] };
      }
      assetCounts[a.asset_id].count++;
      assetCounts[a.asset_id].actions.push(a);
    }
  }

  for (const [assetId, entry] of Object.entries(assetCounts)) {
    // Flag asset clustering if asset accounts for >= 2 failures or all failures
    if (entry.count >= 2 || (total === 1 && entry.count === 1)) {
      const isAll = entry.count === total;
      entry.actions.forEach((a) => explainedActionIds.add(a.action_id));
      hypotheses.push({
        id: `cause-asset-${assetId}`,
        category: 'Equipment/Sensor',
        hypothesis: `Repeated failure cluster on asset ${assetId}`,
        evidence: isAll
          ? `All ${total} failures occurred on asset ${assetId}`
          : `${entry.count} of ${total} failures clustered on asset ${assetId}`,
        explainedCount: entry.count,
        explainedPercentage: Math.round((entry.count / total) * 100),
        confidence: isAll ? 'High' : entry.count / total >= 0.5 ? 'Medium' : 'Low',
      });
    }
  }

  // 3. Navigation / Obstacle & Localization Failures
  const navFailures = failedActions.filter((a) => {
    const ft = (a.failure_type || '').toUpperCase();
    const at = (a.action_type || '').toUpperCase();
    const ant = (a.anomaly_type || '').toUpperCase();
    return (
      ['OBSTACLE_DETECTION', 'PATH_BLOCKED', 'LOCALIZATION_FAILURE'].includes(ft) ||
      at === 'NAVIGATION' ||
      ant.includes('OBSTRUCTION') ||
      ant.includes('LOCALIZATION')
    );
  });
  if (navFailures.length > 0) {
    const count = navFailures.length;
    navFailures.forEach((a) => explainedActionIds.add(a.action_id));
    const reasons = Array.from(
      new Set(navFailures.map((a) => a.failure_type || 'NAVIGATION').filter(Boolean))
    );
    hypotheses.push({
      id: 'cause-navigation',
      category: 'Navigation/Obstacle',
      hypothesis: 'Path obstruction or spatial localization failure',
      evidence: `${count} of ${total} failures involved navigation obstacles or localization loss (${reasons.join(', ')})`,
      explainedCount: count,
      explainedPercentage: Math.round((count / total) * 100),
      confidence: count === total ? 'High' : count / total >= 0.5 ? 'Medium' : 'Low',
    });
  }

  // 4. Equipment / Sensor Faults & Unreliable Readings
  const sensorFailures = failedActions.filter((a) => {
    const ft = (a.failure_type || '').toUpperCase();
    return [
      'SENSOR_TIMEOUT',
      'READING_UNRELIABLE',
      'SIGNAL_NOISE',
      'TARGET_NOT_DETECTED',
      'COMMUNICATION_LOSS',
    ].includes(ft);
  });
  if (sensorFailures.length > 0) {
    const count = sensorFailures.length;
    sensorFailures.forEach((a) => explainedActionIds.add(a.action_id));
    const reasons = Array.from(
      new Set(sensorFailures.map((a) => a.failure_type).filter(Boolean))
    );
    hypotheses.push({
      id: 'cause-sensor',
      category: 'Equipment/Sensor',
      hypothesis: 'Sensor telemetry timeout or unreliable signal',
      evidence: `${count} of ${total} failures triggered by sensor timeouts or unreliable readings (${reasons.join(', ')})`,
      explainedCount: count,
      explainedPercentage: Math.round((count / total) * 100),
      confidence: count === total ? 'High' : count / total >= 0.5 ? 'Medium' : 'Low',
    });
  }

  // 5. Environmental Extremes (Abnormal thermal or vibration readings)
  const envFailures = failedActions.filter((a) => {
    const ant = (a.anomaly_type || '').toUpperCase();
    return ant.includes('TEMPERATURE') || ant.includes('VIBRATION');
  });
  if (envFailures.length > 0) {
    const count = envFailures.length;
    envFailures.forEach((a) => explainedActionIds.add(a.action_id));
    hypotheses.push({
      id: 'cause-environmental',
      category: 'Environmental',
      hypothesis: 'Environmental thermal or vibration extremes',
      evidence: `${count} of ${total} failures coincided with abnormal temperature or vibration conditions`,
      explainedCount: count,
      explainedPercentage: Math.round((count / total) * 100),
      confidence: count === total ? 'High' : count / total >= 0.5 ? 'Medium' : 'Low',
    });
  }

  // 6. Unknown / Needs Investigation
  // Identifies failures with no recorded failure reason, normal battery, no asset clustering, no environmental anomaly
  const unexplained = failedActions.filter((a) => !explainedActionIds.has(a.action_id));
  if (unexplained.length > 0) {
    hypotheses.push({
      id: 'cause-unknown',
      category: 'Unknown',
      hypothesis: 'Unknown / needs investigation',
      evidence: `${unexplained.length} of ${total} failures have no supporting sensor reason or telemetry signal`,
      explainedCount: unexplained.length,
      explainedPercentage: Math.round((unexplained.length / total) * 100),
      confidence: 'Low',
    });
  }

  // Rank hypotheses by explainedCount descending
  return hypotheses.sort((a, b) => b.explainedCount - a.explainedCount);
}

/**
 * Resolves complete failure details for a single waypoint.
 */
export function resolveWaypointFailureDetails(
  waypointId: string,
  actions: ActionRecord[]
): WaypointFailureDetails {
  const normTarget = waypointId.trim().toUpperCase().replace(/[-_]/g, '');

  const matching = actions.filter((a) => {
    const normLoc = (a.location_id || '').trim().toUpperCase().replace(/[-_]/g, '');
    return normLoc === normTarget;
  });

  const failedActions: ActionRecord[] = [];
  for (const act of matching) {
    const status = (act.status || '').trim().toUpperCase();
    const eventType = (act.event_type || '').trim().toUpperCase();
    if (status === 'FAILED' || eventType === 'ACTION_FAILED') {
      failedActions.push(act);
    }
  }

  const totalCount = matching.length;
  const failedCount = failedActions.length;
  const failureRate = totalCount > 0 ? failedCount / totalCount : 0;

  const actionTypeBreakdown = groupFailedActionsByType(failedActions);
  const possibleCauses = inferPossibleCauses(failedActions);
  const topCauseCategory = possibleCauses[0]?.category;

  return {
    waypointId,
    totalCount,
    failedCount,
    failureRate,
    actionTypeBreakdown,
    failedActions,
    possibleCauses,
    topCauseCategory,
  };
}

/**
 * Computes fleet-level failure summary across all actions and missions.
 */
export function computeFleetFailureSummary(
  actions: ActionRecord[]
): FleetFailureSummary {
  const allMissions = new Set<string>();
  const missionsWithFailures = new Set<string>();
  const failedActions: ActionRecord[] = [];
  const waypointStats: Record<string, { total: number; failed: number }> = {};

  for (const act of actions) {
    if (act.mission_id) allMissions.add(act.mission_id);

    const wp = act.location_id ? act.location_id.toUpperCase().replace(/[-_]/g, '') : 'UNKNOWN';
    if (!waypointStats[wp]) waypointStats[wp] = { total: 0, failed: 0 };
    waypointStats[wp].total++;

    const status = (act.status || '').trim().toUpperCase();
    const eventType = (act.event_type || '').trim().toUpperCase();
    if (status === 'FAILED' || eventType === 'ACTION_FAILED') {
      failedActions.push(act);
      if (act.mission_id) missionsWithFailures.add(act.mission_id);
      waypointStats[wp].failed++;
    }
  }

  const totalActions = actions.length;
  const totalFailedActions = failedActions.length;
  const fleetFailureRate = totalActions > 0 ? totalFailedActions / totalActions : 0;

  // Top failing waypoints
  const topFailingWaypoints = Object.entries(waypointStats)
    .filter(([_, stats]) => stats.failed > 0)
    .map(([wpId, stats]) => ({
      waypointId: wpId,
      failedCount: stats.failed,
      totalCount: stats.total,
      failureRate: stats.total > 0 ? stats.failed / stats.total : 0,
    }))
    .sort((a, b) => b.failedCount - a.failedCount);

  // Top failed action types
  const typeBreakdown = groupFailedActionsByType(failedActions);
  const topFailedActionTypes = typeBreakdown.map((t) => ({
    actionType: t.actionType,
    count: t.count,
  }));

  // Top cause categories
  const categoryCounts: Record<CauseCategory, number> = {
    Environmental: 0,
    'Equipment/Sensor': 0,
    'Navigation/Obstacle': 0,
    'Robot state (battery)': 0,
    Unknown: 0,
  };

  const fleetCauses = inferPossibleCauses(failedActions);
  for (const cause of fleetCauses) {
    categoryCounts[cause.category] = (categoryCounts[cause.category] || 0) + cause.explainedCount;
  }

  const topCauseCategories = Object.entries(categoryCounts)
    .map(([cat, count]) => ({ category: cat as CauseCategory, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalActions,
    totalFailedActions,
    fleetFailureRate,
    missionsWithFailuresCount: missionsWithFailures.size,
    totalMissionsCount: allMissions.size,
    topFailingWaypoints,
    topFailedActionTypes,
    topCauseCategories,
  };
}
