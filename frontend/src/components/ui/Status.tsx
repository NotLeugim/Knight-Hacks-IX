'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { colors, type StatusType } from '@/styles/tokens';
import {
  Status,
  toStatus,
  STATUS_CONFIG,
} from '@/lib/status';

export interface StatusConfig {
  label: string;
  color: string;
  bgFill: string;
  borderTint: string;
  contrastRatio: string;
  symbol: string;
}

export const STATUS_MAP: Record<StatusType, StatusConfig> = {
  NOMINAL: {
    label: 'NOMINAL',
    color: colors.statusFills.nominal.text,
    bgFill: colors.statusFills.nominal.bg,
    borderTint: colors.statusFills.nominal.border,
    contrastRatio: colors.statusFills.nominal.contrastRatio,
    symbol: '●',
  },
  SUCCESS: {
    label: 'SUCCESS',
    color: colors.statusFills.success.text,
    bgFill: colors.statusFills.success.bg,
    borderTint: colors.statusFills.success.border,
    contrastRatio: colors.statusFills.success.contrastRatio,
    symbol: '●',
  },
  STOPPED: {
    label: 'NOMINAL',
    color: colors.statusFills.stopped.text,
    bgFill: colors.statusFills.stopped.bg,
    borderTint: colors.statusFills.stopped.border,
    contrastRatio: colors.statusFills.stopped.contrastRatio,
    symbol: '●',
  },
  WARNING: {
    label: 'WARNING',
    color: colors.statusFills.warning.text,
    bgFill: colors.statusFills.warning.bg,
    borderTint: colors.statusFills.warning.border,
    contrastRatio: colors.statusFills.warning.contrastRatio,
    symbol: '▲',
  },
  WARN: {
    label: 'WARNING',
    color: colors.statusFills.warn.text,
    bgFill: colors.statusFills.warn.bg,
    borderTint: colors.statusFills.warn.border,
    contrastRatio: colors.statusFills.warn.contrastRatio,
    symbol: '▲',
  },
  MEDIUM: {
    label: 'WARNING',
    color: colors.statusFills.medium.text,
    bgFill: colors.statusFills.medium.bg,
    borderTint: colors.statusFills.medium.border,
    contrastRatio: colors.statusFills.medium.contrastRatio,
    symbol: '▲',
  },
  LOW: {
    label: 'WARNING',
    color: colors.statusFills.low.text,
    bgFill: colors.statusFills.low.bg,
    borderTint: colors.statusFills.low.border,
    contrastRatio: colors.statusFills.low.contrastRatio,
    symbol: '▲',
  },
  INFO: {
    label: 'WARNING',
    color: colors.statusFills.info.text,
    bgFill: colors.statusFills.info.bg,
    borderTint: colors.statusFills.info.border,
    contrastRatio: colors.statusFills.info.contrastRatio,
    symbol: '▲',
  },
  CRITICAL: {
    label: 'CRITICAL',
    color: colors.statusFills.critical.text,
    bgFill: colors.statusFills.critical.bg,
    borderTint: colors.statusFills.critical.border,
    contrastRatio: colors.statusFills.critical.contrastRatio,
    symbol: '🛑',
  },
  HIGH: {
    label: 'CRITICAL',
    color: colors.statusFills.high.text,
    bgFill: colors.statusFills.high.bg,
    borderTint: colors.statusFills.high.border,
    contrastRatio: colors.statusFills.high.contrastRatio,
    symbol: '🛑',
  },
};

export interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType | Status;
  label?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

/**
 * StatusDot: colored distinct shape icon + label.
 * Color-blind accessible: pairs color with distinct shape per status level (circle, triangle, octagon).
 */
export function StatusDot({
  status,
  label,
  size = 'md',
  pulse = false,
  className,
  ...props
}: StatusDotProps) {
  const normStatus = toStatus(status);
  const token = STATUS_CONFIG[normStatus];
  const Icon = token.icon;
  const displayText = label || token.label;

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  }[size];

  const textSizes = {
    sm: 'text-xs',
    md: 'text-xs font-semibold',
  }[size];

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 select-none shrink-0', textSizes, className)}
      style={{ color: token.hex }}
      {...props}
    >
      <span className="relative flex items-center justify-center">
        {(pulse || token.pulse) && (
          <span
            className={cn('animate-ping absolute inline-flex rounded-full opacity-75', iconSizes)}
            style={{ backgroundColor: token.hex }}
          />
        )}
        <Icon className={cn('shrink-0', iconSizes)} />
      </span>
      <span>{displayText}</span>
    </span>
  );
}

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType | Status;
  label?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

/**
 * StatusBadge: solid high-contrast capsule fill with border, distinct shape icon, and label.
 * Color-blind accessible with distinct shapes per status level (● Circle, ▲ Triangle, 🛑 Octagon).
 * All variants exceed WCAG AA 4.5:1 contrast ratio.
 */
export function StatusBadge({
  status,
  label,
  size = 'md',
  pulse = false,
  className,
  style,
  ...props
}: StatusBadgeProps) {
  const normStatus = toStatus(status);
  const token = STATUS_CONFIG[normStatus];
  const Icon = token.icon;
  const displayText = label || token.label;

  const badgePadding = {
    sm: 'px-2 py-0.5 text-[11px] gap-1.5 font-medium',
    md: 'px-2.5 py-1 text-xs gap-1.5 font-bold tracking-wide',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill border select-none shrink-0 shadow-xs font-mono uppercase',
        badgePadding,
        className
      )}
      style={{
        backgroundColor: token.bgFill,
        borderColor: token.borderTint,
        color: token.hex,
        ...style,
      }}
      {...props}
    >
      <span className="relative flex items-center justify-center">
        {(pulse || token.pulse) && (
          <span
            className={cn('animate-ping absolute inline-flex rounded-full opacity-75', iconSizes)}
            style={{ backgroundColor: token.hex }}
          />
        )}
        <Icon className={cn('shrink-0', iconSizes)} />
      </span>
      <span>{displayText}</span>
    </span>
  );
}

export default StatusBadge;
