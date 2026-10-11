import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  LucideIcon,
} from 'lucide-react';

/**
 * Status — Standardized 3-level status type across SPOTSight.
 * 1. Green  = Nominal
 * 2. Yellow = Warning (lower priority issue)
 * 3. Red    = Critical-High Priority (high priority issue)
 */
export type Status = 'nominal' | 'warning' | 'critical';

export interface StatusColorTokens {
  /** Hex color for Leaflet, three.js, Canvas, and Recharts */
  hex: string;
  /** Slightly darker fill hex for markers */
  fillHex: string;
  /** Badge container background color */
  bgFill: string;
  /** Badge border color */
  borderTint: string;
  /** Tailwind text color class */
  textClass: string;
  /** Tailwind background color class */
  bgClass: string;
  /** Tailwind border color class */
  borderClass: string;
  /** Tailwind left accent border class for sidebar cards */
  cardBorderLeftClass: string;
  /** Standard display label */
  label: string;
  /** Accessible text representation of the symbol */
  symbol: string;
}

export const STATUS_RANKS: Record<Status, number> = {
  nominal: 0,
  warning: 1,
  critical: 2,
};

export const STATUS_CONFIG: Record<
  Status,
  StatusColorTokens & {
    icon: LucideIcon;
    contrastRatio: string;
    pulse: boolean;
  }
> = {
  nominal: {
    hex: '#22c55e',          // Vibrant green (nominal baseline)
    fillHex: '#16a34a',
    bgFill: '#113523',       // Dark high-contrast green container (WCAG AA >= 4.5:1)
    borderTint: 'rgba(34, 197, 94, 0.40)',
    textClass: 'text-green-400',
    bgClass: 'bg-green-500/15',
    borderClass: 'border-green-500/30',
    cardBorderLeftClass: 'border-l-green-500',
    label: 'Nominal',
    symbol: '●',
    icon: CheckCircle2,
    contrastRatio: '6.09:1',
    pulse: false,
  },
  warning: {
    hex: '#eab308',          // Vibrant yellow (lower priority issue)
    fillHex: '#ca8a04',
    bgFill: '#3D2E0B',       // Dark high-contrast amber/yellow container
    borderTint: 'rgba(234, 179, 8, 0.40)',
    textClass: 'text-yellow-400',
    bgClass: 'bg-yellow-500/15',
    borderClass: 'border-yellow-500/30',
    cardBorderLeftClass: 'border-l-yellow-500',
    label: 'Warning',
    symbol: '▲',
    icon: AlertTriangle,
    contrastRatio: '8.30:1',
    pulse: false,
  },
  critical: {
    hex: '#ef4444',          // Vibrant red (high priority issue)
    fillHex: '#dc2626',
    bgFill: '#3E1B19',       // Dark high-contrast red container
    borderTint: 'rgba(239, 68, 68, 0.40)',
    textClass: 'text-red-400',
    bgClass: 'bg-red-500/15',
    borderClass: 'border-red-500/30',
    cardBorderLeftClass: 'border-l-red-500',
    label: 'Critical-High Priority',
    symbol: '🛑',
    icon: AlertOctagon,
    contrastRatio: '5.29:1',
    pulse: true,
  },
};

/**
 * Converts any raw data input into a standardized 3-level Status:
 * - Nominal = green, only when there's no issue.
 * - Yellow  = Warning (lower-priority issues: MEDIUM, LOW, WATCH, INFO).
 * - Red     = Critical-High Priority (high-priority issues: CRITICAL, HIGH, EXTREME, SEVERE, FAILED).
 * - When multiple items or issues exist, the highest severity wins.
 */
export function toStatus(raw: unknown): Status {
  if (raw === null || raw === undefined) {
    return 'nominal';
  }

  // Handle boolean flags (e.g. isFailing, isError)
  if (typeof raw === 'boolean') {
    return raw ? 'critical' : 'nominal';
  }

  // Handle number (e.g. failure rate or failed action count)
  if (typeof raw === 'number') {
    if (raw <= 0) return 'nominal';
    if (raw >= 2 || raw >= 0.5) return 'critical';
    return 'warning';
  }

  // Handle string severity / status
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (!s) return 'nominal';

    // High priority issues -> critical
    if (
      s === 'critical' ||
      s === 'high' ||
      s === 'extreme' ||
      s === 'severe' ||
      s === 'failed' ||
      s === 'danger' ||
      s.includes('critical') ||
      s.includes('high priority')
    ) {
      return 'critical';
    }

    // Lower priority issues -> warning
    if (
      s === 'warning' ||
      s === 'warn' ||
      s === 'medium' ||
      s === 'low' ||
      s === 'moderate' ||
      s === 'minor' ||
      s === 'watch' ||
      s === 'info' ||
      s === 'paradox' ||
      s.includes('warn')
    ) {
      return 'warning';
    }

    // Nominal / Clean / Operational states
    if (
      s === 'nominal' ||
      s === 'success' ||
      s === 'ok' ||
      s === 'clean' ||
      s === 'normal' ||
      s === 'completed' ||
      s === 'operational'
    ) {
      return 'nominal';
    }

    // Fallback: if unknown or inactive with no issue, default to nominal
    return 'nominal';
  }

  // Handle Arrays of anomalies or action items
  if (Array.isArray(raw)) {
    if (raw.length === 0) return 'nominal';
    let worst: Status = 'nominal';
    for (const item of raw) {
      const itemStatus = toStatus(item);
      if (STATUS_RANKS[itemStatus] > STATUS_RANKS[worst]) {
        worst = itemStatus;
      }
    }
    return worst;
  }

  // Handle Object data structures
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;

    // 1. Explicit severity field (e.g. TriageAnomaly, AnomalyRecord)
    if (obj.severity !== undefined) {
      return toStatus(obj.severity);
    }

    // 2. Mission or Action objects
    const reportedStatus = String(obj.reportedStatus || obj.status || '').toUpperCase();
    const failedCount =
      typeof obj.actionsFailed === 'number'
        ? obj.actionsFailed
        : typeof obj.failedCount === 'number'
        ? obj.failedCount
        : Array.isArray(obj.failedActions)
        ? obj.failedActions.length
        : 0;

    if (reportedStatus === 'FAILED' || failedCount >= 3) {
      return 'critical';
    }
    if (failedCount > 0 || reportedStatus === 'PARADOX') {
      return 'warning';
    }

    // 3. Child anomaly list
    if (Array.isArray(obj.anomalies)) {
      return toStatus(obj.anomalies);
    }

    // 4. Fallback status field
    if (obj.status !== undefined) {
      return toStatus(obj.status);
    }
  }

  return 'nominal';
}

/**
 * Returns the theme tokens for a given Status or raw value.
 */
export function getStatusTokens(statusOrRaw: unknown) {
  const status = typeof statusOrRaw === 'string' && (statusOrRaw === 'nominal' || statusOrRaw === 'warning' || statusOrRaw === 'critical')
    ? (statusOrRaw as Status)
    : toStatus(statusOrRaw);
  return STATUS_CONFIG[status];
}

/**
 * Compares two statuses or raw values and returns the worse (higher severity) of the two.
 */
export function getWorstStatus(statusA: unknown, statusB: unknown): Status {
  const a = toStatus(statusA);
  const b = toStatus(statusB);
  return STATUS_RANKS[a] >= STATUS_RANKS[b] ? a : b;
}

/**
 * Returns numeric priority rank (higher = more severe).
 * critical (2) > warning (1) > nominal (0)
 */
export function getStatusRank(statusOrRaw: unknown): number {
  return STATUS_RANKS[toStatus(statusOrRaw)];
}

export { CheckCircle2, AlertTriangle, AlertOctagon };
export default toStatus;

