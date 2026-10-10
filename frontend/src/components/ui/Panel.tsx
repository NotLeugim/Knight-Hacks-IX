'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  showSubtitle?: boolean;
  actions?: React.ReactNode;
  variant?: 'default' | 'flush';
  headerClassName?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
}

export function Panel({
  title,
  subtitle,
  showSubtitle = false,
  actions,
  variant = 'default',
  className,
  headerClassName,
  bodyClassName,
  children,
  ...props
}: PanelProps) {
  const hasHeader = Boolean(title || actions);

  return (
    <div
      className={cn(
        // Orbit Panel: Fill differentiation only (no visible outer 1px border), 12px radius
        'bg-panel rounded-panel overflow-hidden shadow-xs flex flex-col',
        className
      )}
      {...props}
    >
      {hasHeader && (
        <div
          className={cn(
            'flex items-center justify-between px-4 sm:px-5 py-3 border-b border-panel-header-divider shrink-0',
            headerClassName
          )}
        >
          {/* Header Title (18px semibold white, title only by default) */}
          <div className="flex flex-col gap-0.5 min-w-0">
            {typeof title === 'string' ? (
              <h2 className="text-[17px] sm:text-[18px] font-semibold text-white tracking-tight truncate">
                {title}
              </h2>
            ) : (
              title
            )}
            {showSubtitle && subtitle && (
              <span className="text-xs text-text-secondary truncate">{subtitle}</span>
            )}
          </div>

          {/* Right header slot for StatusBadge or action */}
          {actions && (
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Subtitle inside body if not shown in header */}
      {!showSubtitle && subtitle && (
        <div className="px-4 sm:px-5 pt-3 -mb-1 text-xs text-text-secondary">
          {subtitle}
        </div>
      )}

      <div
        className={cn(
          'flex-1 min-w-0',
          variant === 'default' ? 'p-4 sm:p-5' : 'p-0',
          bodyClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default Panel;
