'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { colors, type StatusType } from '@/styles/tokens';

export interface StatusConfig {
  label: string;
  color: string;
  bgFill: string;
  borderTint: string;
  contrastRatio: string;
}

export const STATUS_MAP: Record<StatusType, StatusConfig> = {
  SUCCESS: {
    label: 'SUCCESS',
    color: colors.statusFills.success.text,
    bgFill: colors.statusFills.success.bg,
    borderTint: colors.statusFills.success.border,
    contrastRatio: colors.statusFills.success.contrastRatio,
  },
  NOMINAL: {
    label: 'NOMINAL',
    color: colors.statusFills.nominal.text,
    bgFill: colors.statusFills.nominal.bg,
    borderTint: colors.statusFills.nominal.border,
    contrastRatio: colors.statusFills.nominal.contrastRatio,
  },
  WARN: {
    label: 'WARN',
    color: colors.statusFills.warn.text,
    bgFill: colors.statusFills.warn.bg,
    borderTint: colors.statusFills.warn.border,
    contrastRatio: colors.statusFills.warn.contrastRatio,
  },
  MEDIUM: {
    label: 'MEDIUM',
    color: colors.statusFills.medium.text,
    bgFill: colors.statusFills.medium.bg,
    borderTint: colors.statusFills.medium.border,
    contrastRatio: colors.statusFills.medium.contrastRatio,
  },
  CRITICAL: {
    label: 'CRITICAL',
    color: colors.statusFills.critical.text,
    bgFill: colors.statusFills.critical.bg,
    borderTint: colors.statusFills.critical.border,
    contrastRatio: colors.statusFills.critical.contrastRatio,
  },
  HIGH: {
    label: 'HIGH',
    color: colors.statusFills.high.text,
    bgFill: colors.statusFills.high.bg,
    borderTint: colors.statusFills.high.border,
    contrastRatio: colors.statusFills.high.contrastRatio,
  },
  INFO: {
    label: 'INFO',
    color: colors.statusFills.info.text,
    bgFill: colors.statusFills.info.bg,
    borderTint: colors.statusFills.info.border,
    contrastRatio: colors.statusFills.info.contrastRatio,
  },
  LOW: {
    label: 'LOW',
    color: colors.statusFills.low.text,
    bgFill: colors.statusFills.low.bg,
    borderTint: colors.statusFills.low.border,
    contrastRatio: colors.statusFills.low.contrastRatio,
  },
  STOPPED: {
    label: 'STOPPED',
    color: colors.statusFills.stopped.text,
    bgFill: colors.statusFills.stopped.bg,
    borderTint: colors.statusFills.stopped.border,
    contrastRatio: colors.statusFills.stopped.contrastRatio,
  },
};

export interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

/**
 * StatusDot: colored dot + label.
 * Always renders text with color, never color alone.
 */
export function StatusDot({
  status,
  label,
  size = 'md',
  pulse = false,
  className,
  ...props
}: StatusDotProps) {
  const config = STATUS_MAP[status] || STATUS_MAP.INFO;
  const displayText = label || config.label;

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
  }[size];

  const textSizes = {
    sm: 'text-xs',
    md: 'text-xs font-semibold',
  }[size];

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 select-none shrink-0', textSizes, className)}
      style={{ color: config.color }}
      {...props}
    >
      <span className="relative flex items-center justify-center">
        {pulse && (
          <span
            className={cn('animate-ping absolute inline-flex rounded-full opacity-75', dotSizes)}
            style={{ backgroundColor: config.color }}
          />
        )}
        <span
          className={cn('relative inline-flex rounded-full', dotSizes)}
          style={{ backgroundColor: config.color }}
        />
      </span>
      <span>{displayText}</span>
    </span>
  );
}

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

/**
 * StatusBadge: solid high-contrast capsule fill with border, dot, and label.
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
  const config = STATUS_MAP[status] || STATUS_MAP.INFO;
  const displayText = label || config.label;

  const badgePadding = {
    sm: 'px-2 py-0.5 text-[11px] gap-1.5 font-medium',
    md: 'px-2.5 py-1 text-xs gap-1.5 font-bold tracking-wide',
  }[size];

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill border select-none shrink-0 shadow-xs',
        badgePadding,
        className
      )}
      style={{
        backgroundColor: config.bgFill,
        borderColor: config.borderTint,
        color: config.color,
        ...style,
      }}
      {...props}
    >
      <span className="relative flex items-center justify-center">
        {pulse && (
          <span
            className={cn('animate-ping absolute inline-flex rounded-full opacity-75', dotSizes)}
            style={{ backgroundColor: config.color }}
          />
        )}
        <span
          className={cn('relative inline-flex rounded-full', dotSizes)}
          style={{ backgroundColor: config.color }}
        />
      </span>
      <span>{displayText}</span>
    </span>
  );
}

export default StatusBadge;
