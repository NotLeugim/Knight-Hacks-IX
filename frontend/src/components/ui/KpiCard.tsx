'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { colors, type KpiAccentIndex } from '@/styles/tokens';

export type KpiAccentKey =
  | 'deep-blue'
  | 'blue'
  | 'teal'
  | 'mint'
  | 'yellow'
  | 1
  | 2
  | 3
  | 4
  | 5;

const ACCENT_COLOR_MAP: Record<string, string> = {
  1: colors.kpiAccents[0],
  'deep-blue': colors.kpiAccents[0],
  2: colors.kpiAccents[1],
  blue: colors.kpiAccents[1],
  3: colors.kpiAccents[2],
  teal: colors.kpiAccents[2],
  4: colors.kpiAccents[3],
  mint: colors.kpiAccents[3],
  5: colors.kpiAccents[4],
  yellow: colors.kpiAccents[4],
};

export interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  unit?: string;
  accent: KpiAccentKey | string;
  sublabel?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

export function KpiCard({
  label,
  value,
  unit,
  accent = 1,
  sublabel,
  change,
  changeType = 'neutral',
  className,
  ...props
}: KpiCardProps) {
  // Resolve accent bar color
  const accentColor =
    ACCENT_COLOR_MAP[String(accent)] ||
    (typeof accent === 'string' && accent.startsWith('#') ? accent : colors.kpiAccents[0]);

  return (
    <div
      className={cn(
        'relative bg-panel border border-panel-border rounded-panel flex flex-col justify-between overflow-hidden shadow-xs select-none min-w-[180px]',
        className
      )}
      {...props}
    >
      {/* ── Top: Label & Sublabel (14px semibold) ── */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-panel-header-divider">
        <span className="text-sm font-semibold text-text-secondary tracking-wide uppercase">
          {label}
        </span>
        {change && (
          <span
            className={cn(
              'text-xs font-semibold px-1.5 py-0.5 rounded-[4px]',
              changeType === 'positive' && 'text-[#4CC38A] bg-[#4CC38A]/10',
              changeType === 'negative' && 'text-[#F0716B] bg-[#F0716B]/10',
              changeType === 'neutral' && 'text-text-muted bg-white/5'
            )}
          >
            {change}
          </span>
        )}
      </div>

      {/* ── Center: Big Centered Value (~40px bold) + Unit ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-5 min-h-[96px]">
        <div className="flex items-baseline justify-center gap-1.5">
          <span className="text-[36px] sm:text-[40px] font-bold text-white tracking-tight leading-none">
            {value}
          </span>
          {unit && (
            <span className="text-base sm:text-lg font-medium text-text-secondary">
              {unit}
            </span>
          )}
        </div>
        {sublabel && (
          <span className="text-xs text-text-muted mt-1.5 text-center">
            {sublabel}
          </span>
        )}
      </div>

      {/* ── Bottom Edge: 4px Colored Accent Bar ── */}
      <div
        className="h-1 w-full rounded-b-panel"
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      />
    </div>
  );
}

export default KpiCard;
