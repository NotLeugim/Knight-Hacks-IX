'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Sparkles,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Cpu,
  ArrowRight,
} from 'lucide-react';
import { fetchSummary } from '@/lib/api';
import { MissionSummary } from '@/lib/summaryTypes';
import { Skeleton } from '@/components/ui/Skeleton';
import { Pill } from '@/components/ui/Pill';
import { STATUS_CONFIG, toStatus } from '@/lib/status';
import { zIndex } from '@/styles/tokens';
import { cn } from '@/lib/utils';

export interface MissionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionId?: string;
}

export function MissionSummaryModal({
  isOpen,
  onClose,
  missionId,
}: MissionSummaryModalProps) {
  const [mounted, setMounted] = useState(false);
  const [summary, setSummary] = useState<MissionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  // SSR-safe mount flag
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Capture trigger focus and return focus upon close
  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement as HTMLElement | null;
    } else if (triggerElementRef.current) {
      triggerElementRef.current.focus();
      triggerElementRef.current = null;
    }
  }, [isOpen]);

  const loadSummary = useCallback(
    async (regenerate = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchSummary(missionId, regenerate);
        if (res.data) {
          setSummary(res.data);
        } else {
          setError(
            res.error ||
              'Unable to generate AI mission summary. Ensure backend server is running on port 8000.'
          );
        }
      } catch (err: any) {
        setError(
          err?.message ||
            'Failed to connect to /api/summary. Ensure backend is running on port 8000.'
        );
      } finally {
        setLoading(false);
      }
    },
    [missionId]
  );

  useEffect(() => {
    if (isOpen) {
      loadSummary(false);
    }
  }, [isOpen, loadSummary]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const statusType = summary ? toStatus(summary.reportedStatus) : 'nominal';
  const statusCfg = STATUS_CONFIG[statusType];

  const confVariant =
    summary && summary.confidence >= 80
      ? 'nominal'
      : summary && summary.confidence >= 60
      ? 'warn'
      : 'critical';

  return createPortal(
    <div
      id="mission-summary-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="AI Mission Summary"
      className="fixed inset-0 z-modal-backdrop flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
      style={{ zIndex: zIndex.modalBackdrop }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        id="mission-summary-dialog"
        className="w-full max-w-xl rounded-xl bg-panel border border-[#1E4373] shadow-2xl flex flex-col overflow-hidden text-orbit-text animate-in zoom-in-95 duration-150 relative z-modal"
        style={{ background: '#131B26', zIndex: zIndex.modal }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E4373] bg-[#0E1724]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-orbit-blue/20 border border-orbit-blue/40 flex items-center justify-center text-orbit-blue shadow-xs">
              <Sparkles className="w-4 h-4 text-[#62A9DB]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                AI Mission Summary
                {summary && (
                  <span className="text-xs font-mono font-normal text-white/60 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                    {summary.missionId}
                  </span>
                )}
              </h2>
              <p className="text-xs text-white/50">
                Automated executive telemetry analysis & shift intelligence
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-white/60 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orbit-blue"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col gap-3 py-4" data-testid="summary-loading-state">
              <div className="flex items-center gap-2 text-sm text-[#62A9DB] animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating mission summary from telemetry...</span>
              </div>
              <Skeleton className="h-6 w-3/4 rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-10 w-1/2 rounded-md" />
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div
              className="p-4 rounded-lg bg-red-950/40 border border-red-500/30 flex flex-col gap-3 text-red-200"
              data-testid="summary-error-state"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 text-sm">
                  <span className="font-semibold text-red-300">
                    Failed to load AI mission summary
                  </span>
                  <p className="text-xs text-red-200/80 leading-relaxed">{error}</p>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => loadSummary(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            </div>
          )}

          {/* Success Data State */}
          {!loading && !error && summary && (
            <div className="flex flex-col gap-4" data-testid="summary-content">
              {/* Status & Confidence Meta Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-[#182333] border border-[#23354D]">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">Reported Status:</span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border font-mono',
                      statusCfg.textClass,
                      statusCfg.bgClass,
                      statusCfg.borderClass
                    )}
                  >
                    {statusType === 'nominal' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : statusType === 'warning' ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    {summary.reportedStatus || 'COMPLETED'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-white/60">
                    <span>Confidence:</span>
                    <Pill variant={confVariant} size="sm">
                      <span className="font-bold">{summary.confidence}%</span>
                    </Pill>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] text-white/50 border-l border-white/10 pl-3">
                    {summary.generatedBy === 'gemini' ? (
                      <>
                        <Bot className="w-3 h-3 text-[#62A9DB]" />
                        <span>Gemini AI</span>
                      </>
                    ) : (
                      <>
                        <Cpu className="w-3 h-3 text-white/60" />
                        <span>Rule Engine</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Bullets List */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                  Key Takeaways
                </span>
                <div className="flex flex-col gap-2 bg-[#182333]/60 rounded-lg p-3.5 border border-[#23354D]">
                  {summary.bullets && summary.bullets.length > 0 ? (
                    <ul className="space-y-2 text-sm text-white/90 leading-relaxed">
                      {summary.bullets.map((bullet, idx) => {
                        const cleanText = bullet.replace(/^[-*]\s*/, '').trim();
                        return (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#62A9DB] mt-2 shrink-0" />
                            <span>{cleanText}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-xs text-white/60 italic">
                      No summary points available for this mission.
                    </p>
                  )}
                </div>
              </div>

              {/* Facts Summary */}
              {summary.facts && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded bg-[#182333]/40 border border-[#23354D]/80 flex flex-col">
                    <span className="text-white/50 text-[11px]">Total Actions</span>
                    <span className="text-sm font-bold text-white font-mono mt-0.5">
                      {summary.facts.totalActions}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-[#182333]/40 border border-[#23354D]/80 flex flex-col">
                    <span className="text-white/50 text-[11px]">Failed Actions</span>
                    <span
                      className={cn(
                        'text-sm font-bold font-mono mt-0.5',
                        summary.facts.failedActions.length > 0 ? 'text-amber-400' : 'text-green-400'
                      )}
                    >
                      {summary.facts.failedActions.length}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-[#182333]/40 border border-[#23354D]/80 flex flex-col">
                    <span className="text-white/50 text-[11px]">Anomalies Found</span>
                    <span
                      className={cn(
                        'text-sm font-bold font-mono mt-0.5',
                        summary.facts.anomalies.length > 0 ? 'text-amber-400' : 'text-green-400'
                      )}
                    >
                      {summary.facts.anomalies.length}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1E4373] bg-[#0E1724]">
          <button
            type="button"
            disabled={loading}
            onClick={() => loadSummary(true)}
            className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white px-2.5 py-1.5 rounded hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            <span>Regenerate</span>
          </button>

          <div className="flex items-center gap-2">
            {summary && (
              <Link
                href={`/missions?mission=${summary.missionId}`}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 text-xs text-[#62A9DB] hover:text-blue-300 px-3 py-1.5 font-medium transition-colors"
              >
                <span>View Full Mission</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-button text-xs font-semibold bg-[#1B477D] hover:bg-[#23589B] text-white border border-orbit-blue/40 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default MissionSummaryModal;
