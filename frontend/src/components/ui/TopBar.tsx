'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TopBarProps {
  className?: string;
  onSettingsClick?: () => void;
  onSearchClick?: () => void;
  onExtensionsClick?: () => void;
  onUserClick?: () => void;
  onCopilotClick?: () => void;
  rightSlot?: React.ReactNode;
}

export function TopBar({
  className,
  onCopilotClick,
  rightSlot,
}: TopBarProps) {
  const isDev = process.env.NODE_ENV === 'development';

  const handleCopilotToggle = () => {
    if (onCopilotClick) {
      onCopilotClick();
      return;
    }

    if (typeof window === 'undefined') return;

    const container = document.querySelector('.raia-chat-widget__container');
    const isOpen = container?.classList.contains('raia-chat-widget__container--open');

    // 1. Native SDK toggle (directly controls open/close state)
    const raia = (window as any).raiaChat;
    if (raia) {
      if (isOpen) {
        if (typeof raia.closeChat === 'function') {
          raia.closeChat();
          return;
        }
        if (typeof raia.sendCommand === 'function') {
          raia.sendCommand('CLOSE_CHAT');
          return;
        }
      } else {
        if (typeof raia.openChat === 'function') {
          raia.openChat();
          return;
        }
        if (typeof raia.sendCommand === 'function') {
          raia.sendCommand('OPEN_CHAT');
          return;
        }
      }
    }

    // 2. DOM fallback targeting the inner <button> instead of outer <div>
    const btn =
      document.querySelector<HTMLElement>('.raia-chat-widget__button') ||
      document.querySelector<HTMLElement>('.raia-chat-widget__launcher button') ||
      document.querySelector<HTMLElement>('.raia-chat-widget__launcher');
    if (btn) btn.click();
  };

  return (
    <header
      id="spotsight-topbar"
      className={cn(
        // Fixed 64px height across all routes
        'w-full h-16 min-h-[64px] max-h-[64px] bg-navy border-b border-[#1E4373]',
        'flex items-center justify-between px-4 sm:px-6 select-none z-navbar shrink-0 shadow-xs',
        className
      )}
    >
      {/* ── Left: Brand & Primary Controls ── */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* Brand Link, Target Glyph & Wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-orbit-blue rounded-button p-0.5"
          aria-label="SPOTCheck Home"
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

          {/* SPOTCheck wordmark (bold ~24px) + TM superscript */}
          <span className="text-[22px] sm:text-[24px] font-bold tracking-tight text-white flex items-center leading-none">
            <span>SPOT</span>
            <span className="text-[#62A9DB] font-extrabold">Check</span>
            <sup className="text-[10px] font-semibold text-white/50 tracking-normal ml-0.5 select-none -top-2">
              TM
            </sup>
          </span>
        </Link>
      </div>

      {/* ── Right: Operator Copilot Button & Slot ── */}
      <div className="flex items-center gap-2 sm:gap-3">
        {rightSlot}

        <button
          type="button"
          id="operator-copilot-btn"
          aria-label="Operator Copilot"
          onClick={handleCopilotToggle}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-button bg-[#1B477D] hover:bg-[#23589B] active:bg-[#163D6B] border border-orbit-blue/40 hover:border-orbit-blue text-white text-sm font-semibold tracking-wide transition-all shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orbit-blue focus-visible:ring-offset-1 focus-visible:ring-offset-navy"
        >
          <Sparkles className="w-4 h-4 text-[#62A9DB]" />
          <span>Operator Copilot</span>
        </button>
      </div>
    </header>
  );
}

export default TopBar;