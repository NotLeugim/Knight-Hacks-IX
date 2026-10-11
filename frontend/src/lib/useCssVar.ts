'use client';

import { useState, useEffect } from 'react';

/**
 * Default fallback colors matching SPOTCheck design tokens.
 * Used during SSR or initial render before client-side style resolution.
 */
const DEFAULT_HEX_FALLBACKS: Record<string, string> = {
  '--color-bg-primary': '#0a0f1e',
  '--color-bg-secondary': '#0f1629',
  '--color-bg-card': '#131d35',
  '--color-border': '#1e2d50',
  '--color-accent': '#3b82f6',
  '--color-accent-dim': '#1d4ed8',
  '--color-success': '#22c55e',
  '--color-warning': '#f59e0b',
  '--color-danger': '#ef4444',
  '--color-text-primary': '#e2e8f0',
  '--color-text-muted': '#64748b',
  '--color-chart-failed': '#ef4444',
  '--color-chart-succeeded': '#22c55e',
};

/**
 * useCssVar — Resolves CSS variables into concrete color strings for SVG presentation attributes.
 * Recharts passes colors directly to SVG fill/stroke attributes, where CSS var() can fail or be unreliably rendered.
 * This hook resolves the active computed style from document.documentElement after mount.
 */
export function useCssVar(varNames: string | string[], fallbackHex?: string): string {
  const primaryName = Array.isArray(varNames) ? varNames[0] : varNames;
  const initial = fallbackHex ?? DEFAULT_HEX_FALLBACKS[primaryName] ?? '#64748b';
  const [value, setValue] = useState<string>(initial);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const computed = getComputedStyle(document.documentElement);
    const names = Array.isArray(varNames) ? varNames : [varNames];
    for (const name of names) {
      const val = computed.getPropertyValue(name).trim();
      if (val) {
        setValue(val);
        return;
      }
    }
  }, [Array.isArray(varNames) ? varNames.join(',') : varNames, fallbackHex]);

  return value;
}

export interface ChartThemeColors {
  border: string;
  textMuted: string;
  textPrimary: string;
  warning: string;
  danger: string;
  success: string;
  chartFailed: string;
  chartSucceeded: string;
}

/**
 * useChartThemeColors — Resolves all Recharts SVG colors from shared CSS variables.
 * Tries chart-specific tokens (--color-chart-failed, --color-chart-succeeded) first,
 * then falls back to semantic status tokens (--color-danger, --color-success).
 */
export function useChartThemeColors(): ChartThemeColors {
  const border = useCssVar('--color-border');
  const textMuted = useCssVar('--color-text-muted');
  const textPrimary = useCssVar('--color-text-primary');
  const warning = useCssVar('--color-warning');
  const danger = useCssVar('--color-danger');
  const success = useCssVar('--color-success');
  const chartFailed = useCssVar(['--color-chart-failed', '--color-danger']);
  const chartSucceeded = useCssVar(['--color-chart-succeeded', '--color-success']);

  return {
    border,
    textMuted,
    textPrimary,
    warning,
    danger,
    success,
    chartFailed,
    chartSucceeded,
  };
}
