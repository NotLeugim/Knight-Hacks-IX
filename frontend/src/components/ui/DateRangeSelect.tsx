'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DateRangePreset = '24h' | '7d' | '30d' | '6m' | '1y';

export interface DateRangeOption {
  id: DateRangePreset;
  label: string;
}

export const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { id: '24h', label: 'Last 24 hours' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '6m', label: 'Last 6 months' },
  { id: '1y', label: '1 year' },
];

export interface DateRangeSelectProps {
  value?: DateRangePreset;
  onChange?: (preset: DateRangePreset) => void;
  className?: string;
  disabled?: boolean;
}

export function DateRangeSelect({
  value = '6m',
  onChange,
  className,
  disabled = false,
}: DateRangeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<DateRangePreset>(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setSelected(value);
  }, [value]);

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

  const currentOption =
    DATE_RANGE_OPTIONS.find((opt) => opt.id === selected) || DATE_RANGE_OPTIONS[3];

  const handleSelect = (preset: DateRangePreset) => {
    setSelected(preset);
    onChange?.(preset);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      {/* ── Borderless & Transparent Trigger Button with Bold White Text ── */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Select date range. Currently ${currentOption.label}`}
        className={cn(
          'inline-flex items-center gap-2 rounded-button px-2.5 py-1.5 text-xs sm:text-sm font-bold text-white',
          'bg-transparent hover:bg-white/10 transition-colors duration-150 cursor-pointer select-none border-0',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-white',
          disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
        )}
      >
        <Calendar className="w-4 h-4 text-white shrink-0" />
        <span className="whitespace-nowrap">{currentOption.label}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-white/90 transition-transform duration-200 shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* ── Dropdown Panel with Orbit Panel Styling (Radius 12px, Charcoal Fill) ── */}
      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className={cn(
            'absolute right-0 z-popover mt-1.5 w-48 origin-top-right rounded-panel',
            'bg-panel shadow-2xl shadow-black/80 py-1.5 text-xs text-text-primary focus:outline-none'
          )}
        >
          {DATE_RANGE_OPTIONS.map((opt) => {
            const isItemActive = opt.id === selected;
            return (
              <button
                key={opt.id}
                role="option"
                aria-selected={isItemActive}
                type="button"
                onClick={() => handleSelect(opt.id)}
                className={cn(
                  'w-full flex items-center justify-between px-3.5 py-2 text-left transition-colors',
                  'hover:bg-row-hover focus:bg-row-hover focus:outline-none cursor-pointer',
                  isItemActive
                    ? 'text-white font-bold bg-row-selected'
                    : 'text-text-secondary hover:text-white'
                )}
              >
                <span>{opt.label}</span>
                {isItemActive && <Check className="w-3.5 h-3.5 text-orbit-blue" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DateRangeSelect;
