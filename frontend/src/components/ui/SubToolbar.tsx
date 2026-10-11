'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SubToolbarProps {
  title?: React.ReactNode;
  leftSlot?: React.ReactNode;
  centerSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function SubToolbar({
  title,
  leftSlot,
  centerSlot,
  rightSlot,
  children,
  className,
}: SubToolbarProps) {
  const centerContent = centerSlot || children;

  return (
    <div
      id="spotsight-subtoolbar"
      className={cn(
        // Fixed 48px height across all routes
        'w-full h-12 min-h-[48px] max-h-[48px] bg-orbit-blue border-b border-[#357AA8]',
        'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-3 sm:px-6 select-none shrink-0 gap-3 z-30 shadow-xs',
        className
      )}
    >
      {/* ── Left Slot: Contextual Page Title (~22px, regular-to-medium, white) ── */}
      <div className="flex items-center min-w-0">
        {leftSlot ? (
          leftSlot
        ) : (
          title && (
            <h1
              className="text-[20px] sm:text-[22px] font-medium text-white tracking-tight leading-none truncate min-w-0 block"
              title={typeof title === 'string' ? title : undefined}
            >
              {title}
            </h1>
          )
        )}
      </div>

      {/* ── Center Slot: SegmentedTabs or Main Navigation ── */}
      <div className="flex items-center justify-center min-w-0 px-2 overflow-hidden">
        {centerContent}
      </div>

      {/* ── Right Slot: DateRangeSelect, Split Refresh, Status Badges, Pills ── */}
      <div className="flex items-center justify-end gap-2 sm:gap-3 min-w-0">
        {rightSlot}
      </div>
    </div>
  );
}

export default SubToolbar;
