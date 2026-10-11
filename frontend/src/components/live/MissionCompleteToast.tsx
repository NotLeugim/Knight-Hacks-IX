'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { subscribeLiveStream, fetchMissionSummary, ReplayEvent } from '@/lib/api';
import { MissionSummary } from '@/lib/summaryTypes';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronUp,
  ArrowRight,
  Bot,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MissionCompleteToast() {
  const [summary, setSummary] = useState<MissionSummary | null>(null);
  const [visible, setVisible] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const collapseTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Subscribe to SSE live telemetry stream
    const unsubscribe = subscribeLiveStream({
      delay: 1.0,
      loop: true,
      onEvent: async (event: ReplayEvent) => {
        if (event.event_type === 'MISSION_COMPLETED' && event.mission_id) {
          try {
            const res = await fetchMissionSummary(event.mission_id);
            if (res.data) {
              setSummary(res.data);
              setVisible(true);
              setIsCollapsed(false);

              // Auto-collapse after 20 seconds
              if (collapseTimerRef.current) {
                clearTimeout(collapseTimerRef.current);
              }
              collapseTimerRef.current = setTimeout(() => {
                setIsCollapsed(true);
              }, 20000);
            }
          } catch (err) {
            console.warn('[MissionCompleteToast] Failed to load mission summary:', err);
          }
        }
      },
    });

    return () => {
      unsubscribe();
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  if (!visible || !summary) return null;

  const isReportedFailed = summary.reportedStatus === 'FAILED';
  const isClean = summary.reportedStatus === 'COMPLETED' && (summary.facts?.failedActions?.length ?? 0) === 0;
  const isParadox = summary.reportedStatus === 'COMPLETED' && (summary.facts?.failedActions?.length ?? 0) > 0;

  const statusClass = isReportedFailed
    ? 'text-red-400 bg-red-500/10 border-red-500/20'
    : isParadox
    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

  const confColor =
    summary.confidence >= 80
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : summary.confidence >= 60
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      : 'text-red-400 bg-red-500/10 border-red-500/20';

  if (isCollapsed) {
    return (
      <div
        className="absolute bottom-4 right-4 z-toast flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg border transition-all cursor-pointer backdrop-blur-md hover:border-orbit-blue"
        style={{
          background: 'rgba(23, 27, 34, 0.95)',
          borderColor: 'var(--color-border)',
        }}
        onClick={() => setIsCollapsed(false)}
      >
        <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-orbit-text">
          {isReportedFailed ? (
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          ) : isClean ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          )}
          Mission {summary.missionId} Finished
        </span>
        <span className={cn('text-[10px] font-mono px-1.5 py-0.2 rounded border', confColor)}>
          {summary.confidence}/100
        </span>
        <ChevronUp className="w-3.5 h-3.5 text-orbit-text-muted ml-1" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setVisible(false);
          }}
          className="text-orbit-text-muted hover:text-orbit-text p-0.5 rounded ml-1"
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="absolute bottom-4 right-4 z-toast w-96 max-w-[calc(100vw-2rem)] rounded-xl p-4 shadow-2xl border flex flex-col gap-3 transition-all backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
      style={{
        background: 'rgba(23, 27, 34, 0.96)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Toast Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-orbit-text">
            Mission {summary.missionId} Completed
          </span>
          <span
            className={cn(
              'text-[10px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1',
              statusClass
            )}
          >
            {isReportedFailed ? (
              <AlertTriangle className="w-3 h-3" />
            ) : isClean ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <AlertTriangle className="w-3 h-3" />
            )}
            {summary.reportedStatus}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-orbit-text-muted hover:text-orbit-text p-1 rounded"
            title="Collapse"
          >
            <ChevronUp className="w-3.5 h-3.5 rotate-180" />
          </button>
          <button
            onClick={() => setVisible(false)}
            className="text-orbit-text-muted hover:text-orbit-text p-1 rounded"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Subheader info: confidence + source */}
      <div className="flex items-center justify-between text-xs">
        <span className={cn('text-[11px] font-mono px-2 py-0.5 rounded border font-semibold', confColor)}>
          Confidence Score: {summary.confidence}/100
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-orbit-text-muted">
          {summary.generatedBy === 'gemini' ? (
            <>
              <Bot className="w-3 h-3 text-orbit-blue" />
              <span>AI summary</span>
            </>
          ) : (
            <>
              <Cpu className="w-3 h-3 text-orbit-text-secondary" />
              <span>Automatic summary</span>
            </>
          )}
        </span>
      </div>

      {/* 3 Executive Bullets */}
      <div className="bg-panel-header/70 rounded-lg p-3 border border-panel-border">
        <ul className="text-xs text-orbit-text space-y-1.5 list-disc list-inside leading-relaxed">
          {summary.bullets.slice(0, 3).map((bullet, idx) => (
            <li key={idx} className="line-clamp-2">
              <span>{bullet.replace(/^[-*]\s*/, '').trim()}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <span className="text-[11px] text-orbit-text-muted">
          Auto-collapsing in 20s
        </span>
        <Link
          href={`/missions?mission=${summary.missionId}`}
          className="inline-flex items-center gap-1 text-orbit-blue hover:text-blue-300 font-medium hover:underline"
        >
          View mission <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
