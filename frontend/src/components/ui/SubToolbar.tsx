'use client';

import React from 'react';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from './IconButton';

export interface SubToolbarProps {
  title?: React.ReactNode;
  showFilter?: boolean;
  onFilterClick?: () => void;
  leftSlot?: React.ReactNode;
  centerSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function SubToolbar({
  title,
  showFilter = true,
  onFilterClick,
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
        'flex items-center justify-between px-3 sm:px-6 select-none shrink-0 gap-3 z-30 shadow-xs',
        className
      )}
    >
      {/* ── Left Slot: Optional Filter Icon + Contextual Page Title (~22px, regular-to-medium, white) ── */}
      <div className="flex items-center gap-2 shrink-0 min-w-0">
        {leftSlot ? (
          leftSlot
        ) : (
          <div className="flex items-center gap-1.5 min-w-0">
            {showFilter && (
              <IconButton
                icon={<Filter className="w-4 h-4 text-white" />}
                label="Filter view"
                tooltip="Filter Fleet View"
                variant="navyGhost"
                size="md"
                onClick={onFilterClick}
              />
            )}
            {title && (
              <h1 className="text-[20px] sm:text-[22px] font-medium text-white tracking-tight leading-none truncate">
                {title}
              </h1>
            )}
          </div>
        )}
      </div>

      {/* ── Center Slot: SegmentedTabs or Main Navigation ── */}
      {centerContent && (
        <div className="flex-1 flex items-center justify-center min-w-0 px-2 overflow-x-auto no-scrollbar">
          {centerContent}
        </div>
      )}

      {/* ── Right Slot: DateRangeSelect, Split Refresh, Status Badges, Pills ── */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {rightSlot}
      </div>
    </div>
  );
}

export default SubToolbar;
