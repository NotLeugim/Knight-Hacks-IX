'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RotateCw, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from './Tooltip';

export interface SplitRefreshButtonProps {
  onRefresh?: () => void;
  className?: string;
  isSpinning?: boolean;
}

export function SplitRefreshButton({
  onRefresh,
  className,
  isSpinning = false,
}: SplitRefreshButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<'off' | '5s' | '15s' | '30s'>('off');
  const [spinning, setSpinning] = useState(isSpinning);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleRefreshClick = () => {
    setSpinning(true);
    onRefresh?.();
    setTimeout(() => setSpinning(false), 700);
  };

  return (
    <div ref={containerRef} className={cn('relative inline-flex items-center select-none', className)}>
      <div className="inline-flex items-center rounded-button overflow-hidden shadow-xs">
        {/* Left segment: Refresh action button */}
        <Tooltip content="Refresh Fleet Telemetry">
          <button
            type="button"
            aria-label="Refresh telemetry"
            onClick={handleRefreshClick}
            className={cn(
              'h-8 px-2.5 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white',
              'inline-flex items-center justify-center transition-colors duration-150 cursor-pointer',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-white z-10'
            )}
          >
            <RotateCw className={cn('w-4 h-4', spinning && 'animate-spin')} />
          </button>
        </Tooltip>

        {/* Subtle divider */}
        <div className="w-px h-5 bg-white/20 self-center" />

        {/* Right segment: Chevron dropdown trigger */}
        <Tooltip content="Auto-refresh Settings">
          <button
            type="button"
            aria-label="Refresh interval options"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'h-8 px-1.5 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white',
              'inline-flex items-center justify-center transition-colors duration-150 cursor-pointer',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-white'
            )}
          >
            <ChevronDown className={cn('w-3 h-3 text-white/90 transition-transform', isOpen && 'rotate-180')} />
          </button>
        </Tooltip>
      </div>

      {/* Dropdown Options */}
      {isOpen && (
        <div
          role="listbox"
          className={cn(
            'absolute right-0 top-full mt-1.5 w-44 z-50 rounded-panel bg-panel shadow-2xl shadow-black/80',
            'py-1 text-xs text-text-primary focus:outline-none'
          )}
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider border-b border-panel-header-divider">
            Auto Refresh
          </div>
          {[
            { id: 'off', label: 'Off' },
            { id: '5s', label: 'Every 5 seconds' },
            { id: '15s', label: 'Every 15 seconds' },
            { id: '30s', label: 'Every 30 seconds' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setRefreshInterval(item.id as typeof refreshInterval);
                setIsOpen(false);
              }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-left hover:bg-row-hover cursor-pointer transition-colors',
                refreshInterval === item.id ? 'text-white font-bold bg-row-selected' : 'text-text-secondary hover:text-white'
              )}
            >
              <span>{item.label}</span>
              {refreshInterval === item.id && <Check className="w-3.5 h-3.5 text-orbit-blue" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default SplitRefreshButton;
