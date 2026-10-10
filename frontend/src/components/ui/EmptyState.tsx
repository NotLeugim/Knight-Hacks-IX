'use client';

import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'centered' | 'table';
  className?: string;
}

export function EmptyState({
  icon,
  title = 'No data available',
  description,
  action,
  variant = 'centered',
  className,
}: EmptyStateProps) {
  // Plain left-aligned inside tables (Orbit pattern)
  if (variant === 'table') {
    return (
      <div className={cn('py-8 px-6 text-left select-none', className)}>
        <p className="text-sm font-medium text-text-secondary">{title}</p>
        {description && (
          <p className="text-xs text-text-muted mt-1">{description}</p>
        )}
      </div>
    );
  }

  // Centered icon + title + secondary text without dashed border box
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center select-none',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[#2A3036] flex items-center justify-center text-text-muted mb-3 shadow-inner">
        {icon || <Inbox className="w-6 h-6 text-text-secondary" />}
      </div>
      <h3 className="text-base font-semibold text-white tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-sm mt-1 mb-4">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export default EmptyState;
