'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { colors } from '@/styles/tokens';

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'live' | 'stub' | 'confidence' | 'nominal' | 'warn' | 'critical' | 'info' | 'neutral' | 'outline';
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export function Pill({
  children,
  variant = 'neutral',
  size = 'md',
  pulse = false,
  className,
  style,
  ...props
}: PillProps) {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
  }[size];

  // Guaranteed WCAG AA >= 4.5:1 contrast mappings
  const variantStyles: Record<string, { bg: string; text: string; border?: string }> = {
    live: {
      bg: colors.pillFills.live.bg,
      text: colors.pillFills.live.text,
      border: 'rgba(85, 220, 153, 0.45)',
    },
    confidence: {
      bg: colors.pillFills.confidence.bg,
      text: colors.pillFills.confidence.text,
      border: 'rgba(255, 255, 255, 0.20)',
    },
    stub: {
      bg: colors.pillFills.stub.bg,
      text: colors.pillFills.stub.text,
      border: 'rgba(255, 255, 255, 0.15)',
    },
    nominal: {
      bg: colors.statusFills.nominal.bg,
      text: colors.statusFills.nominal.text,
      border: colors.statusFills.nominal.border,
    },
    warn: {
      bg: colors.statusFills.warn.bg,
      text: colors.statusFills.warn.text,
      border: colors.statusFills.warn.border,
    },
    critical: {
      bg: colors.statusFills.critical.bg,
      text: colors.statusFills.critical.text,
      border: colors.statusFills.critical.border,
    },
    info: {
      bg: colors.statusFills.info.bg,
      text: colors.statusFills.info.text,
      border: colors.statusFills.info.border,
    },
    neutral: {
      bg: colors.pillFills.neutral.bg,
      text: colors.pillFills.neutral.text,
      border: 'rgba(255, 255, 255, 0.15)',
    },
    outline: {
      bg: 'transparent',
      text: colors.pillFills.outline.text,
      border: colors.pillFills.outline.border,
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.neutral;
  const showDot = variant === 'live';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill tracking-tight select-none shrink-0 border',
        sizeClasses,
        className
      )}
      style={{
        backgroundColor: currentVariant.bg,
        color: currentVariant.text,
        borderColor: currentVariant.border || 'transparent',
        ...style,
      }}
      {...props}
    >
      {showDot && (
        <span className="relative flex h-2 w-2">
          {(pulse || variant === 'live') && (
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: colors.pillFills.live.dot }}
            />
          )}
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: colors.pillFills.live.dot }}
          />
        </span>
      )}
      {children}
    </span>
  );
}

export default Pill;
