/**
 * severity.ts — Shared severity configurations, rankings, and visual themes
 * for SPOTSight, standardized to exactly 3 status levels:
 *   1. Green  = Nominal (no issues)
 *   2. Yellow = Warning (lower priority issues: MEDIUM, LOW)
 *   3. Red    = Critical-High Priority (high priority issues: CRITICAL, HIGH)
 *
 * Backed by centralized status source of truth: '@/lib/status'.
 */

import {
  Status,
  toStatus,
  STATUS_CONFIG,
  STATUS_RANKS,
} from './status';

export interface SeverityTheme {
  textColor: string;        // Tailwind text color (e.g. 'text-red-400')
  badgeBg: string;          // Tailwind badge background
  badgeBorder: string;      // Tailwind badge border
  cardBorderLeft: string;   // Tailwind card left accent
  markerColor: string;      // Hex border color for Leaflet markers
  markerFill: string;       // Hex fill color for Leaflet markers
  pulse: boolean;           // Whether marker should pulse (CRITICAL only)
  label: string;            // Standard display label
  rank: number;             // Numeric ranking for worst-severity comparisons
}

/**
 * Standardized 3-level ranking constants:
 * CRITICAL / HIGH = 2
 * MEDIUM / LOW = 1
 * NOMINAL / UNKNOWN = 0
 */
export const SEVERITY_RANKS = {
  CRITICAL: 2,
  HIGH: 2,
  MEDIUM: 1,
  LOW: 1,
  UNKNOWN: 0,
} as const;

export const NOMINAL_THEME: SeverityTheme = {
  textColor: STATUS_CONFIG.nominal.textClass,
  badgeBg: STATUS_CONFIG.nominal.bgClass,
  badgeBorder: STATUS_CONFIG.nominal.borderClass,
  cardBorderLeft: STATUS_CONFIG.nominal.cardBorderLeftClass,
  markerColor: STATUS_CONFIG.nominal.hex,
  markerFill: STATUS_CONFIG.nominal.fillHex,
  pulse: false,
  label: 'NOMINAL',
  rank: 0,
};

export const WARNING_THEME: SeverityTheme = {
  textColor: STATUS_CONFIG.warning.textClass,
  badgeBg: STATUS_CONFIG.warning.bgClass,
  badgeBorder: STATUS_CONFIG.warning.borderClass,
  cardBorderLeft: STATUS_CONFIG.warning.cardBorderLeftClass,
  markerColor: STATUS_CONFIG.warning.hex,
  markerFill: STATUS_CONFIG.warning.fillHex,
  pulse: false,
  label: 'WARNING',
  rank: 1,
};

export const CRITICAL_THEME: SeverityTheme = {
  textColor: STATUS_CONFIG.critical.textClass,
  badgeBg: STATUS_CONFIG.critical.bgClass,
  badgeBorder: STATUS_CONFIG.critical.borderClass,
  cardBorderLeft: STATUS_CONFIG.critical.cardBorderLeftClass,
  markerColor: STATUS_CONFIG.critical.hex,
  markerFill: STATUS_CONFIG.critical.fillHex,
  pulse: true,
  label: 'CRITICAL',
  rank: 2,
};

export const DEFAULT_SEVERITY_THEME: SeverityTheme = NOMINAL_THEME;

/**
 * Case-insensitive lookup table for severity themes mapped to 3 levels.
 */
export const SEVERITY_CONFIG: Record<string, SeverityTheme> = {
  critical: {
    ...CRITICAL_THEME,
    label: 'CRITICAL',
  },
  high: {
    ...CRITICAL_THEME,
    pulse: false,
    label: 'HIGH',
  },
  medium: {
    ...WARNING_THEME,
    label: 'MEDIUM',
  },
  low: {
    ...WARNING_THEME,
    label: 'LOW',
  },
  warning: {
    ...WARNING_THEME,
    label: 'WARNING',
  },
  nominal: {
    ...NOMINAL_THEME,
    label: 'NOMINAL',
  },
};

/**
 * Returns the SeverityTheme for a given severity string (case-insensitive).
 */
export function getSeverityTheme(severity?: string | null): SeverityTheme {
  if (!severity) return NOMINAL_THEME;
  const key = severity.toLowerCase().trim();
  if (SEVERITY_CONFIG[key]) {
    return SEVERITY_CONFIG[key];
  }

  const status: Status = toStatus(severity);
  const base =
    status === 'critical'
      ? CRITICAL_THEME
      : status === 'warning'
      ? WARNING_THEME
      : NOMINAL_THEME;

  return {
    ...base,
    label: severity.toUpperCase().trim(),
  };
}

/**
 * Returns the appropriate SeverityTheme for a waypoint.
 * If no open anomalies exist (or severity is 'nominal'), returns NOMINAL_THEME (green).
 */
export function getWaypointSeverityTheme(worstSeverity?: string | null): SeverityTheme {
  if (!worstSeverity || worstSeverity.toLowerCase().trim() === 'nominal') {
    return NOMINAL_THEME;
  }
  return getSeverityTheme(worstSeverity);
}

/**
 * Returns numeric priority rank for severity comparison (case-insensitive).
 */
export function getSeverityRank(severity?: string | null): number {
  if (!severity) return 0;
  const key = severity.toUpperCase().trim();
  if (key in SEVERITY_RANKS) {
    return SEVERITY_RANKS[key as keyof typeof SEVERITY_RANKS];
  }
  return STATUS_RANKS[toStatus(severity)];
}
