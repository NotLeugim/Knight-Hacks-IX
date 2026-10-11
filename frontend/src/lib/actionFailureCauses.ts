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

/**
 * 2D Bounding Box for keep-out zones and collision detection
 */
export interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TooltipLayoutInput {
  containerWidth: number;
  containerHeight: number;
  nodeX: number;
  nodeY: number;
  tooltipWidth?: number;
  tooltipHeight?: number;
  keepOutZones?: BoundingBox[];
  pinOffset?: number;
  margin?: number;
}

export interface TooltipLayoutResult {
  x: number;
  y: number;
  width: number;
  height: number;
  placement: 'top' | 'bottom';
  arrowLeft: number;
  arrowPlacement: 'top' | 'bottom';
}

/**
 * Checks whether two 2D axis-aligned bounding boxes intersect.
 */
export function rectsIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.left + a.width <= b.left ||
    b.left + b.width <= a.left ||
    a.top + a.height <= b.top ||
    b.top + b.height <= a.top
  );
}

/**
 * Computes deterministic collision-safe coordinates for Action Mode waypoints.
 * - Flips below node if top placement collides with container bounds or top overlay keep-out zones
 * - Shifts left or right away from keep-out zones (e.g. Failure Rate legend, Mission Paradox card)
 * - Clamps strictly within the container margins on all sides
 * - Dynamically anchors pointer arrow to always point directly at nodeX
 */
export function computeTooltipLayout(input: TooltipLayoutInput): TooltipLayoutResult {
  const {
    containerWidth,
    containerHeight,
    nodeX,
    nodeY,
    tooltipWidth = 290,
    tooltipHeight = 140,
    keepOutZones = [],
    pinOffset = 18,
    margin = 12,
  } = input;

  const w = Math.min(tooltipWidth, Math.max(100, containerWidth - margin * 2));
  const h = tooltipHeight;

  // Horizontal candidate: center on nodeX
  let candX = nodeX - w / 2;
  // Initial clamp inside container boundaries
  candX = Math.max(margin, Math.min(containerWidth - w - margin, candX));

  // Test placement = 'top'
  const topY = nodeY - pinOffset - h;
  const topRect: BoundingBox = { left: candX, top: topY, width: w, height: h };
  const topHitsBoundary = topY < margin;
  const topHitsKeepOut = keepOutZones.some((zone) => rectsIntersect(topRect, zone));

  let placement: 'top' | 'bottom' = 'top';
  let candY = topY;

  if (topHitsBoundary || topHitsKeepOut) {
    // Flip below the node
    placement = 'bottom';
    candY = nodeY + pinOffset;
  }

  // Check collision for the chosen candidate against keep-out zones
  let chosenRect: BoundingBox = { left: candX, top: candY, width: w, height: h };

  for (const zone of keepOutZones) {
    if (rectsIntersect(chosenRect, zone)) {
      // If keep-out zone is in the right half (e.g. legend / summary card), shift left
      if (zone.left + zone.width / 2 > containerWidth / 2) {
        const shiftedX = zone.left - w - margin;
        if (shiftedX >= margin) {
          candX = shiftedX;
          chosenRect.left = candX;
        }
      } else {
        // If keep-out zone is in the left half (e.g. mode toggle / floor switcher), shift right
        const shiftedX = zone.left + zone.width + margin;
        if (shiftedX + w <= containerWidth - margin) {
          candX = shiftedX;
          chosenRect.left = candX;
        }
      }
    }
  }

  // Final clamp strictly inside container bounds on all 4 sides
  const finalX = Math.max(margin, Math.min(containerWidth - w - margin, candX));
  const finalY = Math.max(margin, Math.min(containerHeight - h - margin, candY));

  // Pointer arrow position relative to tooltip box left edge:
  // Points directly at nodeX, clamped inside tooltip borders and corner radii
  const rawArrow = nodeX - finalX;
  const arrowPadding = 16;
  const arrowLeft = Math.max(arrowPadding, Math.min(w - arrowPadding, rawArrow));

  return {
    x: Math.round(finalX),
    y: Math.round(finalY),
    width: Math.round(w),
    height: Math.round(h),
    placement,
    arrowLeft: Math.round(arrowLeft),
    arrowPlacement: placement === 'top' ? 'bottom' : 'top',
  };
}

export interface PinnedPanelLayoutInput {
  containerWidth: number;
  containerHeight: number;
  waypointId?: string | null;
  nodeX?: number | null;
  nodeY?: number | null;
  panelWidth?: number;
  margin?: number;
}

export interface PinnedPanelLayoutResult {
  x: number;
  y: number;
  bottom: number;
  left?: number;
  right?: number;
  width: number;
  maxHeight: number;
  dock: 'bottom-left' | 'bottom-right' | 'bottom-sheet';
  side: 'left' | 'right' | 'bottom-sheet';
  isBottomSheet: boolean;
}

/**
 * Computes docked coordinates and bounded dimensions for the Action Mode pinned failure panel.
 * - Fixed bottom-left dock by default inside map container (left: 12px, bottom: 12px).
 * - Compact dimensions: width 320px, maxHeight capped at 50-55% of container height.
 * - If the bottom-left dock would cover the selected node (e.g. WP01 / Loading Dock or bottom-left area),
 *   mirrors to bottom-right (right: 12px, bottom: 12px) and stays fixed there.
 * - Narrow container fallback (< 640px wide): Full-width bottom sheet capped at 40% height.
 */
export function computePinnedPanelLayout(input: PinnedPanelLayoutInput): PinnedPanelLayoutResult {
  const {
    containerWidth,
    containerHeight,
    waypointId,
    nodeX,
    nodeY,
    panelWidth = 320,
    margin = 12,
  } = input;

  // Narrow container fallback (< 640px wide): Bottom sheet capped at 40% container height
  if (containerWidth < 640) {
    const width = Math.max(200, containerWidth - margin * 2);
    const maxHeight = Math.round(containerHeight * 0.40);
    const x = margin;
    const y = Math.max(margin, containerHeight - maxHeight - margin);
    return {
      x,
      y,
      bottom: margin,
      left: margin,
      right: margin,
      width,
      maxHeight,
      dock: 'bottom-sheet',
      side: 'bottom-sheet',
      isBottomSheet: true,
    };
  }

  // Normal / Desktop container: Docked at bottom, capped at 50-55% (52%) container height
  const width = Math.min(panelWidth, containerWidth - margin * 2);
  const maxHeight = Math.round(containerHeight * 0.52);

  // Check if the selected node sits in the bottom-left corner and would be covered by bottom-left dock
  // WP01 is explicitly at the loading dock / staging area at the bottom-left corner.
  // In addition, if nodeX / nodeY fall within the bottom-left dock boundary:
  const isBottomLeftNode =
    waypointId === 'WP01' ||
    (nodeX != null &&
      nodeY != null &&
      nodeX >= 0 &&
      nodeX <= margin + width + 24 &&
      nodeY >= containerHeight - maxHeight - margin - 24);

  if (isBottomLeftNode) {
    // Mirror to bottom-right so the selected node is not covered
    const x = containerWidth - width - margin;
    const y = Math.max(margin, containerHeight - maxHeight - margin);
    return {
      x,
      y,
      bottom: margin,
      right: margin,
      width,
      maxHeight,
      dock: 'bottom-right',
      side: 'right',
      isBottomSheet: false,
    };
  }

  // Default: Fixed bottom-left dock
  const x = margin;
  const y = Math.max(margin, containerHeight - maxHeight - margin);
  return {
    x,
    y,
    bottom: margin,
    left: margin,
    width,
    maxHeight,
    dock: 'bottom-left',
    side: 'left',
    isBottomSheet: false,
  };
}
