'use client';

import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { colors } from '@/styles/tokens';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface SegmentedTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function SegmentedTabs({
  tabs,
  activeTab,
  onChange,
  ariaLabel = 'Navigation Tabs',
  className,
  size = 'md',
}: SegmentedTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let targetIndex = index;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      targetIndex = (index + 1) % tabs.length;
      while (tabs[targetIndex]?.disabled && targetIndex !== index) {
        targetIndex = (targetIndex + 1) % tabs.length;
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      targetIndex = (index - 1 + tabs.length) % tabs.length;
      while (tabs[targetIndex]?.disabled && targetIndex !== index) {
        targetIndex = (targetIndex - 1 + tabs.length) % tabs.length;
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      targetIndex = 0;
      while (tabs[targetIndex]?.disabled && targetIndex < tabs.length - 1) {
        targetIndex++;
      }
    } else if (e.key === 'End') {
      e.preventDefault();
      targetIndex = tabs.length - 1;
      while (tabs[targetIndex]?.disabled && targetIndex > 0) {
        targetIndex--;
      }
    }

    if (targetIndex !== index && !tabs[targetIndex]?.disabled) {
      tabRefs.current[targetIndex]?.focus();
      onChange(tabs[targetIndex].id);
    }
  };

  const itemPadding = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm';

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        // 10px radius container with translucent white over blue bar and exact 4px padding
        'inline-flex items-center rounded-tab-container p-1 select-none backdrop-blur-xs',
        className
      )}
      style={{
        backgroundColor: colors.tabs.containerBg,
        borderColor: colors.tabs.containerBorder,
      }}
    >
      {tabs.map((tab, idx) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[idx] = el;
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              'relative inline-flex items-center justify-center gap-2 rounded-tab-item transition-all duration-150',
              // Bold (600-700) white text for all tab labels
              'font-semibold cursor-pointer select-none',
              // Visible focus ring
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-[#3F8FC9]',
              itemPadding,
              isActive
                ? 'text-white shadow-xs'
                : 'text-white/85 hover:text-white hover:bg-white/12 active:bg-white/16',
              tab.disabled && 'opacity-35 cursor-not-allowed hover:bg-transparent text-white/40'
            )}
            style={{
              backgroundColor: isActive ? colors.tabs.activeFill : undefined,
            }}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span className="whitespace-nowrap">{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-tight ml-0.5"
                style={{
                  backgroundColor: colors.tabs.badgeBg,
                  color: colors.tabs.badgeText,
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedTabs;
