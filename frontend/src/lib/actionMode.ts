/**
 * Pure helper module for Action Mode overlay status evaluation.
 * Evaluates actions at waypoints against the Completed Mission Paradox:
 * - Green: Action succeeded (no anomalies)
 * - Yellow: Medium or Low anomaly
 * - Red: High or Critical anomaly, or a failed action
 * Precedence when multiple actions exist: Red > Yellow > Green > Neutral.
 */

export type ActionModeColor = 'red' | 'yellow' | 'green' | 'neutral';

export interface ActionRecord {
  action_id: string;
  mission_id?: string;
  sequence?: string | number;
  timestamp?: string;
  location_id: string; // e.g. 'WP01'
  asset_id?: string;
  action_type?: string;
  battery_pct?: string | number;
  status: string; // 'SUCCESS' | 'FAILED' (case-insensitive)
  failure_type?: string;
  duration_sec?: string | number;
  anomaly_id?: string | null;
  severity?: string | null; // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' (case-insensitive)
  anomaly_type?: string | null;
  description?: string;
}

export interface WaypointActionSummary {
  waypointId: string;
  color: ActionModeColor;
  statusLabel: string;
  badgeHex: string;
  glowRgba: string;
  totalActions: number;
  failedCount: number;
  anomaliesCount: number;
  worstAction: ActionRecord | null;
  isRed: boolean;
}

export const ACTION_MODE_THEME: Record<
  ActionModeColor,
  {
    hex: string;
    glow: string;
    label: string;
    ringClass: string;
    badgeBg: string;
    badgeBorder: string;
  }
> = {
  red: {
    hex: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.9)',
    label: 'Failed Action / High Critical Anomaly',
    ringClass: 'ring-red-500',
    badgeBg: 'bg-red-500/20',
    badgeBorder: 'border-red-500/50',
  },
  yellow: {
    hex: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.85)',
    label: 'Medium / Low Anomaly',
    ringClass: 'ring-amber-500',
    badgeBg: 'bg-amber-500/20',
    badgeBorder: 'border-amber-500/50',
  },
  green: {
    hex: '#10b981',
    glow: 'rgba(16, 185, 129, 0.85)',
    label: 'Action Succeeded',
    ringClass: 'ring-emerald-500',
    badgeBg: 'bg-emerald-500/20',
    badgeBorder: 'border-emerald-500/50',
  },
  neutral: {
    hex: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.5)',
    label: 'No Actions Logged',
    ringClass: 'ring-sky-400',
    badgeBg: 'bg-sky-500/20',
    badgeBorder: 'border-sky-500/50',
  },
};

/**
 * Evaluates a single action row according to the specification:
 * - Red: High or Critical anomaly, or a failed action
 * - Yellow: Medium or Low anomaly
 * - Green: Action succeeded
 * - Neutral: None of the above
 */
export function evaluateSingleAction(action: ActionRecord): ActionModeColor {
  const status = (action.status || '').trim().toUpperCase();
  const severity = (action.severity || '').trim().toUpperCase();

  // Red: High or Critical anomaly, or a failed action
  if (status === 'FAILED' || severity === 'HIGH' || severity === 'CRITICAL') {
    return 'red';
  }

  // Yellow: Medium or Low anomaly
  if (severity === 'MEDIUM' || severity === 'LOW') {
    return 'yellow';
  }

  // Green: Action succeeded
  if (status === 'SUCCESS') {
    return 'green';
  }

  return 'neutral';
}

/**
 * Returns numeric precedence for comparison: Red > Yellow > Green > Neutral.
 */
function getColorPriority(color: ActionModeColor): number {
  switch (color) {
    case 'red':
      return 3;
    case 'yellow':
      return 2;
    case 'green':
      return 1;
    case 'neutral':
    default:
      return 0;
  }
}

/**
 * Evaluates a list of actions for a given waypoint.
 * If multiple actions exist, the worst severity (Red > Yellow > Green) wins.
 * Returns a detailed summary including the highest-priority action payload.
 */
export function resolveWaypointActionStatus(
  waypointId: string,
  actions: ActionRecord[]
): WaypointActionSummary {
  const normTarget = waypointId.trim().toUpperCase().replace(/[-_]/g, '');

  const matchingActions = actions.filter((act) => {
    const normLoc = (act.location_id || '').trim().toUpperCase().replace(/[-_]/g, '');
    return normLoc === normTarget;
  });

  if (matchingActions.length === 0) {
    return {
      waypointId,
      color: 'neutral',
      statusLabel: 'NO ACTIONS',
      badgeHex: ACTION_MODE_THEME.neutral.hex,
      glowRgba: ACTION_MODE_THEME.neutral.glow,
      totalActions: 0,
      failedCount: 0,
      anomaliesCount: 0,
      worstAction: null,
      isRed: false,
    };
  }

  let worstColor: ActionModeColor = 'neutral';
  let worstAction: ActionRecord | null = null;
  let failedCount = 0;
  let anomaliesCount = 0;

  for (const act of matchingActions) {
    const actColor = evaluateSingleAction(act);
    if ((act.status || '').trim().toUpperCase() === 'FAILED') {
      failedCount++;
    }
    if (act.severity) {
      anomaliesCount++;
    }

    if (getColorPriority(actColor) > getColorPriority(worstColor)) {
      worstColor = actColor;
      worstAction = act;
    } else if (worstAction === null) {
      worstAction = act;
    }
  }

  const theme = ACTION_MODE_THEME[worstColor];

  return {
    waypointId,
    color: worstColor,
    statusLabel: worstColor.toUpperCase(),
    badgeHex: theme.hex,
    glowRgba: theme.glow,
    totalActions: matchingActions.length,
    failedCount,
    anomaliesCount,
    worstAction,
    isRed: worstColor === 'red',
  };
}

/**
 * Builds a map of waypointId -> WaypointActionSummary for quick lookup.
 */
export function computeAllWaypointsActionSummaries(
  waypointIds: string[],
  actions: ActionRecord[]
): Record<string, WaypointActionSummary> {
  const result: Record<string, WaypointActionSummary> = {};
  for (const wpId of waypointIds) {
    result[wpId] = resolveWaypointActionStatus(wpId, actions);
  }
  return result;
}
