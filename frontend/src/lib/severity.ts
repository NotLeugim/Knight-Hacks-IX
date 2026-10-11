/**
 * severity.ts — Shared severity configurations, rankings, and visual themes
 * for SPOTCheck (Triage Queue & Facility Map integration).
 *
 * Single source of truth for:
 *   - Tailwind color tokens (Sidebar cards)
 *   - Hex & RGB colors (Leaflet map markers)
 *   - Severity ranking (CRITICAL > HIGH > MEDIUM > LOW > UNKNOWN)
 */

export interface SeverityTheme {
  textColor: string;        // Tailwind text color (e.g. 'text-red-500')
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
 * Severity ranking constants (higher = more severe).
 * CRITICAL (4) > HIGH (3) > MEDIUM (2) > LOW (1) > UNKNOWN (0)
 */
export const SEVERITY_RANKS = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  UNKNOWN: 0,
} as const;

/**
 * Case-insensitive lookup table for severity themes.
 */
export const SEVERITY_CONFIG: Record<string, SeverityTheme> = {
  critical: {
    textColor: 'text-red-500',
    badgeBg: 'bg-red-500/15',
    badgeBorder: 'border-red-500/30',
    cardBorderLeft: 'border-l-red-500',
    markerColor: '#ef4444',
    markerFill: '#dc2626',
    pulse: true,
    label: 'CRITICAL',
    rank: SEVERITY_RANKS.CRITICAL,
  },
  high: {
    textColor: 'text-orange-500',
    badgeBg: 'bg-orange-500/15',
    badgeBorder: 'border-orange-500/30',
    cardBorderLeft: 'border-l-orange-500',
    markerColor: '#f97316',
    markerFill: '#ea580c',
    pulse: false,
    label: 'HIGH',
    rank: SEVERITY_RANKS.HIGH,
  },
  medium: {
    textColor: 'text-yellow-500',
    badgeBg: 'bg-yellow-500/15',
    badgeBorder: 'border-yellow-500/30',
    cardBorderLeft: 'border-l-yellow-500',
    markerColor: '#eab308',
    markerFill: '#ca8a04',
    pulse: false,
    label: 'MEDIUM',
    rank: SEVERITY_RANKS.MEDIUM,
  },
  low: {
    textColor: 'text-blue-500',
    badgeBg: 'bg-blue-500/15',
    badgeBorder: 'border-blue-500/30',
    cardBorderLeft: 'border-l-blue-500',
    markerColor: '#3b82f6',
    markerFill: '#2563eb',
    pulse: false,
    label: 'LOW',
    rank: SEVERITY_RANKS.LOW,
  },
  nominal: {
    textColor: 'text-green-500',
    badgeBg: 'bg-green-500/15',
    badgeBorder: 'border-green-500/30',
    cardBorderLeft: 'border-l-green-500',
    markerColor: '#22c55e',       // Tailwind green-500
    markerFill: '#16a34a',        // Tailwind green-600
    pulse: false,
    label: 'NOMINAL',
    rank: 0,
  },
};

export const NOMINAL_THEME: SeverityTheme = {
  textColor: 'text-green-500',
  badgeBg: 'bg-green-500/15',
  badgeBorder: 'border-green-500/30',
  cardBorderLeft: 'border-l-green-500',
  markerColor: '#22c55e',
  markerFill: '#16a34a',
  pulse: false,
  label: 'NOMINAL',
  rank: 0,
};

export const DEFAULT_SEVERITY_THEME: SeverityTheme = {
  textColor: 'text-slate-400',
  badgeBg: 'bg-slate-500/15',
  badgeBorder: 'border-slate-500/30',
  cardBorderLeft: 'border-l-slate-400',
  markerColor: '#64748b',
  markerFill: '#334155',
  pulse: false,
  label: 'UNKNOWN',
  rank: SEVERITY_RANKS.UNKNOWN,
};

/**
 * Returns the SeverityTheme for a given severity string (case-insensitive).
 * Safe fallback to DEFAULT_SEVERITY_THEME for undefined, null, or unrecognized values.
 */
export function getSeverityTheme(severity?: string | null): SeverityTheme {
  if (!severity) return DEFAULT_SEVERITY_THEME;
  const key = severity.toLowerCase().trim();
  return (
    SEVERITY_CONFIG[key] ?? {
      ...DEFAULT_SEVERITY_THEME,
      label: severity.toUpperCase().trim(),
    }
  );
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
  return getSeverityTheme(severity).rank;
}

