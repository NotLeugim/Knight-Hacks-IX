'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AlertCircle, AlertTriangle, Clock, MapPin, RefreshCw, Cpu } from 'lucide-react';
import { TriageAnomaly } from '@/lib/triageTypes';
import { fetchTriageQueue } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

import {
  SEVERITY_CONFIG,
  DEFAULT_SEVERITY_THEME,
  getSeverityTheme,
  SeverityTheme,
} from '@/lib/severity';

export {
  SEVERITY_CONFIG,
  DEFAULT_SEVERITY_THEME,
  getSeverityTheme,
  type SeverityTheme,
};

function formatTimestamp(timestampStr?: string): string {
  if (!timestampStr) return '';
  try {
    const date = new Date(timestampStr);
    if (isNaN(date.getTime())) return timestampStr;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return timestampStr;
  }
}

export interface TriageQueueProps {
  /** Optional callback fired when an anomaly card is clicked */
  onSelect?: (anomalyId: string) => void;
  /** Optional extra container class name */
  className?: string;
  /** Whether to show the top mini subheader */
  showHeader?: boolean;
}

export default function TriageQueue({
  onSelect,
  className,
  showHeader = false,
}: TriageQueueProps) {
  const [anomalies, setAnomalies] = useState<TriageAnomaly[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadTriageQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchTriageQueue();
      // Preserve backend's ordering — strictly do not re-sort client-side
      setAnomalies(response.queue ?? []);
    } catch (err) {
      console.error('[SPOTSight] Error fetching triage queue:', err);
      setError(err instanceof Error ? err.message : 'Failed to load triage queue');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTriageQueue();
  }, [loadTriageQueue]);

  const handleCardClick = (id: string) => {
    // Pass check: Clicking a queue item logs the anomaly ID to the console.
    console.log(id);
    console.log(`[SPOTSight] Anomaly selected in triage queue: ${id}`);
    setSelectedId(id);
    onSelect?.(id);
  };

  return (
    <div
      id="triage-queue-container"
      className={cn('flex flex-col h-full min-h-0 w-full overflow-hidden select-none', className)}
    >
      {/* Optional sub-bar */}
      {showHeader && (
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-panel-border bg-[#1D2125] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white tracking-tight">Active Anomalies</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400">
              {anomalies.length}
            </span>
          </div>
          <button
            type="button"
            onClick={loadTriageQueue}
            title="Refresh queue"
            aria-label="Refresh triage queue"
            className="text-text-muted hover:text-white transition-colors p-1 rounded hover:bg-white/10"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          </button>
        </div>
      )}

      {/* Main scrollable list container */}
      <div
        id="triage-queue-list"
        role="region"
        aria-label="Triage Queue Anomaly List"
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 focus:outline-none"
      >
        {/* Loading State: Skeletons */}
        {isLoading && (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={`skeleton-${i}`}
                className="rounded-lg p-3 bg-[#2A3036]/80 border border-panel-border/60 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-12 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-full rounded" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-3 w-14 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="p-4 rounded-lg bg-red-950/30 border border-red-500/30 text-center flex flex-col items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-xs text-red-200">{error}</p>
            <button
              type="button"
              onClick={loadTriageQueue}
              className="mt-1 px-3 py-1 rounded bg-red-900/60 hover:bg-red-800 text-xs text-white transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && anomalies.length === 0 && (
          <EmptyState
            icon={<AlertTriangle className="w-6 h-6 text-status-nominal" />}
            title="Queue Clear"
            description="No unresolved anomalies flagged. Fleet telemetry is operating within nominal thresholds."
            className="py-8"
          />
        )}

        {/* Data List */}
        {!isLoading && !error && anomalies.length > 0 && (
          <ul className="flex flex-col gap-2.5 list-none m-0 p-0">
            {anomalies.map((item, index) => {
              const anomalyId = item.id || item.anomaly_id || `item-${index}`;
              const theme = getSeverityTheme(item.severity);
              const isSelected = selectedId === anomalyId;

              return (
                <li key={anomalyId} className="w-full">
                  <button
                    type="button"
                    id={`triage-item-${anomalyId.toLowerCase()}`}
                    onClick={() => handleCardClick(anomalyId)}
                    aria-pressed={isSelected}
                    className={cn(
                      'w-full text-left rounded-lg p-2.5 bg-[#2A3036] transition-all',
                      'border border-panel-border border-l-4',
                      theme.cardBorderLeft,
                      'hover:bg-[#313840] hover:border-slate-500/50',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-orbit-blue',
                      'cursor-pointer active:scale-[0.99] select-none flex flex-col gap-1.5',
                      isSelected && 'bg-[#2F3740] ring-1 ring-orbit-blue border-panel-border'
                    )}
                  >
                    {/* Header Row: Rank, Severity Tag, Timestamp */}
                    <div className="flex items-center justify-between gap-1.5 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[11px] font-bold text-text-muted shrink-0">
                          #{index + 1}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider border uppercase shrink-0',
                            theme.textColor,
                            theme.badgeBg,
                            theme.badgeBorder
                          )}
                        >
                          {theme.label}
                        </span>
                        {item.operator_review_required && (
                          <span
                            title="Operator Review Required"
                            className="text-[9px] font-semibold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0"
                          >
                            REVIEW REQ
                          </span>
                        )}
                      </div>

                      {item.timestamp && (
                        <span className="text-[10px] text-text-muted flex items-center gap-1 shrink-0 font-mono">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTimestamp(item.timestamp)}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <p className="text-xs font-semibold text-white tracking-tight line-clamp-1 leading-snug">
                      {item.title}
                    </p>

                    {/* Description */}
                    {item.description && (
                      <p className="text-[11px] text-[#9AA4AD] line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Footer Row: Waypoint, Asset, Anomaly Type */}
                    <div className="flex items-center flex-wrap gap-2 pt-0.5 text-[10px] text-text-secondary border-t border-white/5">
                      {item.location_id && (
                        <span className="flex items-center gap-0.5 text-blue-400 font-mono">
                          <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                          {item.location_id}
                        </span>
                      )}

                      {item.asset_id && (
                        <span className="flex items-center gap-0.5 text-slate-300 font-mono">
                          <Cpu className="w-3 h-3 text-slate-400 shrink-0" />
                          {item.asset_id}
                        </span>
                      )}

                      {item.anomaly_type && (
                        <span className="text-text-muted truncate max-w-[120px]">
                          {item.anomaly_type.replace(/_/g, ' ')}
                        </span>
                      )}

                      <span className="ml-auto font-mono text-[10px] text-text-muted">
                        {anomalyId}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
