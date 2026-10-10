'use client';

import React from 'react';
import Link from 'next/link';
import { Settings, SearchCheck, Puzzle, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from './IconButton';

export interface TopBarProps {
  className?: string;
  onSettingsClick?: () => void;
  onSearchClick?: () => void;
  onExtensionsClick?: () => void;
  onUserClick?: () => void;
  rightSlot?: React.ReactNode;
}

export function TopBar({
  className,
  onSettingsClick,
  onSearchClick,
  onExtensionsClick,
  onUserClick,
  rightSlot,
}: TopBarProps) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <header
      id="spotsight-topbar"
      className={cn(
        // Fixed 64px height across all routes
        'w-full h-16 min-h-[64px] max-h-[64px] bg-navy border-b border-[#1E4373]',
        'flex items-center justify-between px-4 sm:px-6 select-none z-40 shrink-0 shadow-xs',
        className
      )}
    >
      {/* ── Left: Brand & Primary Controls ── */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* Brand Link, Target Glyph & Wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-orbit-blue rounded-button p-0.5"
          aria-label="SPOTSight Home"
        >
          {/* Orbit-style circular sensor/target glyph (~32px) */}
          <div className="w-8 h-8 rounded-full bg-[#1B477D] border border-orbit-blue/40 flex items-center justify-center text-orbit-blue group-hover:border-orbit-blue group-hover:bg-[#20518D] transition-colors shrink-0 shadow-xs">
            <svg
              className="w-4 h-4 text-[#3F8FC9]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          </div>

          {/* SPOTSight wordmark (bold ~24px) + TM superscript */}
          <span className="text-[22px] sm:text-[24px] font-bold tracking-tight text-white flex items-center leading-none">
            <span>SPOT</span>
            <span className="text-[#62A9DB] font-extrabold">Sight</span>
            <sup className="text-[10px] font-semibold text-white/50 tracking-normal ml-0.5 select-none -top-2">
              TM
            </sup>
          </span>
        </Link>

        {/* Note: vertical divider after wordmark removed per Orbit design spec */}

        {/* Left Icon Buttons (28-32px hit areas, strokeWidth 2.25) */}
        <div className="flex items-center gap-1.5 ml-1">
          <IconButton
            icon={<Settings className="w-5 h-5 text-white/90" strokeWidth={2.25} />}
            label="Settings"
            tooltip="System Settings"
            variant="navyGhost"
            size="md"
            onClick={onSettingsClick}
          />
          <IconButton
            icon={<SearchCheck className="w-5 h-5 text-white/90" strokeWidth={2.25} />}
            label="Search and Verify"
            tooltip="Inspection & Audit Log"
            variant="navyGhost"
            size="md"
            onClick={onSearchClick}
          />
        </div>
      </div>

      {/* ── Right: Extensions & User Profile ── */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Dev-only link to /design-system; completely hidden in production builds */}
        {isDev && (
          <Link
            href="/design-system"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-button bg-white/10 text-white/90 border border-white/20 hover:bg-white/20 hover:text-white transition-colors mr-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Design System</span>
          </Link>
        )}

        {rightSlot}

        <div className="flex items-center gap-2">
          <IconButton
            icon={<Puzzle className="w-5 h-5 text-white/90" strokeWidth={2.25} />}
            label="Orbit Extensions"
            tooltip="Orbit Add-ons & Plugins"
            variant="navyGhost"
            size="md"
            onClick={onExtensionsClick}
          />

          {/* User avatar: solid filled circle-user icon, ~36px */}
          <button
            type="button"
            aria-label="Operator Profile"
            onClick={onUserClick}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-[#1F4673] hover:bg-[#28588F] text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orbit-blue"
          >
            <User className="w-5 h-5 text-white fill-white" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default TopBar;
