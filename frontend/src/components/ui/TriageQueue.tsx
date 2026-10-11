'use client';

import React, { useEffect, useCallback, useMemo, memo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  MapPin,
  RefreshCw,
  Cpu,
  X,
  ShieldAlert,
  Zap,
  MapPinOff,
} from 'lucide-react';
import { TriageAnomaly } from '@/lib/triageTypes';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import {
  SEVERITY_CONFIG,
  DEFAULT_SEVERITY_THEME,
  getSeverityTheme,
  SeverityTheme,
} from '@/lib/severity';
import { toStatus, getStatusTokens, STATUS_CONFIG, CheckCircle2 as CheckCircleIcon } from '@/lib/status';
import { normalizeWaypointId, getAnomalyWaypointId } from '@/lib/triageSelectors';
import { useTriage } from '@/context/TriageContext';

export {
  SEVERITY_CONFIG,
  DEFAULT_SEVERITY_THEME,
  getSeverityTheme,
  type SeverityTheme,
};

const KNOWN_MAP_WAYPOINTS = new Set([
  'WP01',
  'WP02',
  'WP03',
  'WP04',
  'WP05',
  'WP06',
  'WP07',
  'WP08',
  'WP09',
  'WP10',
  'WP11',
  'WP12',
  'WP13',
  'WP14',
  'WP15',
]);

function formatTimestamp(timestampStr?: string): string {
  if (!timestampStr) return '';
  try {
    const date = new Date(timestampStr);
    if (isNaN(date.getTime())) return timestampStr;
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return timestampStr;
  }
}

interface AnomalyCardProps {
  item: TriageAnomaly;
  index: number;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

const AnomalyCard = memo(function AnomalyCard({
  item,
  index,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}: AnomalyCardProps) {
  const anomalyId = item.id || item.anomaly_id || `item-${index}`;
  const theme = getSeverityTheme(item.severity);
  const normalizedWaypoint = getAnomalyWaypointId(item);
  const hasMapWaypoint = Boolean(
    normalizedWaypoint && KNOWN_MAP_WAYPOINTS.has(normalizedWaypoint)
  );

  return (
    <li className="w-full">
      <button
        type="button"
        id={`triage-item-${anomalyId.toLowerCase()}`}
        onClick={() => onSelect(anomalyId)}
        onMouseEnter={() => onHover(anomalyId)}
        onMouseLeave={() => onHover(null)}
        aria-pressed={isSelected}
        aria-label={`Anomaly ${anomalyId}: ${item.title}. Severity: ${theme.label}. ${
          hasMapWaypoint ? 'Location ' + normalizedWaypoint : 'Location unavailable'
        }`}
        className={cn(
          'w-full text-left rounded-lg p-2.5 bg-[#2A3036] transition-all',
          'border border-panel-border border-l-4',
          theme.cardBorderLeft,
          'hover:bg-[#313840] hover:border-slate-500/50',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-orbit-blue',
          'cursor-pointer active:scale-[0.99] select-none flex flex-col gap-1.5',
          isSelected &&
            'bg-[#2F3740] ring-2 ring-orbit-blue border-panel-border shadow-md',
          isHovered && !isSelected && 'border-slate-400/60 bg-[#30373E]'
        )}
      >
        {/* Header Row: Rank, Severity Tag, Review Req, Timestamp */}
        <div className="flex items-center justify-between gap-1.5 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-[11px] font-bold text-text-muted shrink-0">
              #{index + 1}
            </span>
            <span
              className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider border uppercase shrink-0 flex items-center gap-1',
                theme.textColor,
                theme.badgeBg,
                theme.badgeBorder
              )}
            >
              <span className="text-[9px]">{STATUS_CONFIG[toStatus(item.severity)].symbol}</span>
              <span>{theme.label}</span>
            </span>
            {item.operator_review_required && (
              <span
                title="Operator Review Required"
                className="text-[9px] font-semibold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 flex items-center gap-0.5"
              >
                <ShieldAlert className="w-2.5 h-2.5 text-amber-300" />
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

        {/* Footer Row: Waypoint, Asset, Anomaly Type, ID */}
        <div className="flex items-center flex-wrap gap-2 pt-0.5 text-[10px] text-text-secondary border-t border-white/5">
          {hasMapWaypoint ? (
            <span className="flex items-center gap-0.5 text-blue-400 font-mono">
              <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
              {normalizedWaypoint}
            </span>
          ) : (
            <span
              title="Anomaly location not plotted on floor plan"
              className="flex items-center gap-0.5 text-slate-500 font-mono text-[9px] bg-slate-800/80 px-1 py-0.2 rounded"
            >
              <MapPinOff className="w-2.5 h-2.5 text-slate-500 shrink-0" />
              Loc. Unavail
            </span>
          )}

          {item.asset_id && (
            <span className="flex items-center gap-0.5 text-slate-300 font-mono">
              <Cpu className="w-3 h-3 text-slate-400 shrink-0" />
              {item.asset_id}
            </span>
          )}

          {item.anomaly_type && (
            <span className="text-text-muted truncate max-w-[110px]">
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
});

export interface TriageQueueProps {
  /** Optional callback fired when an anomaly card is clicked */
  onSelect?: (anomalyId: string) => void;
  /** Optional callback fired when an anomaly card or issue is clicked, passing issue ID */
  onSelectIssue?: (issueId: string | null) => void;
  /** Optional currently selected issue ID */
  selectedIssueId?: string | null;
  /** Optional callback fired when an anomaly card is clicked, passing normalized waypoint ID */
  onSelectWaypoint?: (waypointId: string | null) => void;
  /** Optional currently selected waypoint ID */
  selectedWaypointId?: string | null;
  /** Optional anomaly data source passed from parent */
  anomalies?: TriageAnomaly[];
  /** Optional extra container class name */
  className?: string;
  /** Whether to show the top mini subheader */
  showHeader?: boolean;
}

export default function TriageQueue({
  onSelect,
  onSelectIssue,
  selectedIssueId: selectedIssueIdProp,
  onSelectWaypoint,
  selectedWaypointId: selectedWaypointIdProp,
  anomalies: anomaliesProp,
  className,
  showHeader = true,
}: TriageQueueProps) {
  const triage = useTriage();

  const {
    filteredAnomalies: contextFilteredAnomalies,
    anomalies: contextAnomalies,
    isLoading,
    error,
    selectedWaypointId: contextSelectedWaypointId,
    selectedAnomalyId,
    hoveredAnomalyId,
    hoveredWaypointId,
    reviewRequiredOnly,
    selectAnomaly,
    selectWaypoint,
    setHoveredAnomalyId,
    setReviewRequiredOnly,
    clearFilter,
    selectNextCritical,
    reloadQueue,
  } = triage;

  const anomalies = anomaliesProp ?? contextAnomalies;
  const filteredAnomalies = contextFilteredAnomalies;

  // Resolve effective waypoint ID from selectedIssueIdProp or selectedWaypointIdProp
  const selectedWaypointId = useMemo(() => {
    if (selectedWaypointIdProp) return selectedWaypointIdProp;
    if (selectedIssueIdProp) {
      const found = anomalies.find(
        (a) =>
          (a.id && a.id.toLowerCase() === selectedIssueIdProp.toLowerCase()) ||
          (a.anomaly_id && a.anomaly_id.toLowerCase() === selectedIssueIdProp.toLowerCase())
      );
      if (found?.location_id) {
        return normalizeWaypointId(found.location_id);
      }
    }
    return contextSelectedWaypointId;
  }, [selectedWaypointIdProp, selectedIssueIdProp, anomalies, contextSelectedWaypointId]);

  // Sync external selectedWaypointId with context if provided
  useEffect(() => {
    if (selectedWaypointId !== contextSelectedWaypointId) {
      selectWaypoint(selectedWaypointId);
    }
  }, [selectedWaypointId, contextSelectedWaypointId, selectWaypoint]);

  // Sync external selectedIssueIdProp with context if provided
  useEffect(() => {
    if (selectedIssueIdProp !== undefined && selectedIssueIdProp !== selectedAnomalyId) {
      if (selectedIssueIdProp) {
        selectAnomaly(selectedIssueIdProp, 'queue');
      }
    }
  }, [selectedIssueIdProp, selectedAnomalyId, selectAnomaly]);

  // Global Escape key listener to clear waypoint and issue selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (selectedIssueIdProp || selectedWaypointId)) {
        clearFilter();
        onSelectIssue?.(null);
        onSelectWaypoint?.(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIssueIdProp, selectedWaypointId, clearFilter, onSelectIssue, onSelectWaypoint]);

  const handleCardClick = useCallback(
    (id: string) => {
      // Contract: Logs anomaly ID to console
      selectAnomaly(id, 'queue');
      onSelect?.(id);
      onSelectIssue?.(id);

      // Extract waypoint from clicked anomaly and invoke onSelectWaypoint
      const found = anomalies.find((a) => (a.id || a.anomaly_id) === id);
      if (found?.location_id) {
        const wpId = normalizeWaypointId(found.location_id);
        onSelectWaypoint?.(wpId);
      }
    },
    [selectAnomaly, onSelect, onSelectIssue, onSelectWaypoint, anomalies]
  );

  const handleNextCritical = useCallback(() => {
    selectNextCritical();
    const criticalList = anomalies.filter(
      (a) => a.severity?.toUpperCase().trim() === 'CRITICAL'
    );
    if (criticalList.length > 0) {
      const target = criticalList[0];
      const issueId = target.id || target.anomaly_id;
      if (issueId) {
        onSelectIssue?.(issueId);
      }
      if (target.location_id) {
        const wpId = normalizeWaypointId(target.location_id);
        onSelectWaypoint?.(wpId);
      }
    }
  }, [selectNextCritical, anomalies, onSelectIssue, onSelectWaypoint]);

  return (
    <div
      id="triage-queue-container"
      className={cn(
        'flex flex-col h-full min-h-0 w-full overflow-hidden select-none',
        className
      )}
    >
      {/* Screen Reader Announcement for Filter Changes */}
      <div aria-live="polite" className="sr-only">
        {selectedWaypointId
          ? `Filtered queue to waypoint ${selectedWaypointId}. ${filteredAnomalies.length} anomalies found.`
          : `Showing all ${filteredAnomalies.length} open anomalies.`}
      </div>

      {/* Action Header / Workflow Controls */}
      {showHeader && (
        <div className="flex flex-col border-b border-panel-border bg-[#1D2125] shrink-0">
          {/* Top row: Status, Next Critical button, Refresh */}
          <div className="flex items-center justify-between px-3.5 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300 tracking-tight">
                Active Issues
              </span>
              <span
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono border',
                  filteredAnomalies.length === 0
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : STATUS_CONFIG[toStatus(filteredAnomalies)].bgClass,
                  filteredAnomalies.length === 0
                    ? 'text-green-400'
                    : STATUS_CONFIG[toStatus(filteredAnomalies)].textClass,
                  filteredAnomalies.length === 0
                    ? 'border-green-500/30'
                    : STATUS_CONFIG[toStatus(filteredAnomalies)].borderClass
                )}
              >
                {filteredAnomalies.length}
                {filteredAnomalies.length !== anomalies.length && ` / ${anomalies.length}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Operator Workflow: Next Critical Quick Action */}
              <button
                type="button"
                onClick={handleNextCritical}
                title="Focus next critical anomaly on map"
                aria-label="Focus next critical anomaly"
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-red-950/70 text-red-300 border border-red-500/40 hover:bg-red-900 transition-colors shadow-xs"
              >
                <Zap className="w-3 h-3 text-red-400 fill-red-400" />
                <span>Next Critical</span>
              </button>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={reloadQueue}
                title="Refresh queue"
                aria-label="Refresh triage queue"
                className="text-text-muted hover:text-white transition-colors p-1 rounded hover:bg-white/10"
              >
                <RefreshCw
                  className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')}
                />
              </button>
            </div>
          </div>

          {/* Secondary filter control bar */}
          <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#171A1D] border-t border-white/5 gap-2 text-xs">
            {/* Operator Workflow: Review Required Toggle */}
            <button
              type="button"
              onClick={() => setReviewRequiredOnly((prev) => !prev)}
              aria-pressed={reviewRequiredOnly}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors border',
                reviewRequiredOnly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                  : 'bg-transparent text-slate-400 border-slate-700/60 hover:text-slate-200 hover:border-slate-600'
              )}
            >
              <ShieldAlert className="w-3 h-3" />
              <span>Review Required Only</span>
            </button>

            {/* Active Waypoint Filter Chip */}
            {selectedWaypointId && (
              <div
                id="waypoint-filter-chip"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/60 text-blue-300 text-[10px] font-mono animate-fadeIn"
              >
                <MapPin className="w-2.5 h-2.5 text-blue-400" />
                <span>
                  Showing {selectedWaypointId} ({filteredAnomalies.length})
                </span>
                <button
                  type="button"
                  id="clear-waypoint-filter-btn"
                  onClick={() => {
                    clearFilter();
                    onSelectIssue?.(null);
                    onSelectWaypoint?.(null);
                  }}
                  title="Clear waypoint filter (or press Escape)"
                  aria-label={`Clear filter for ${selectedWaypointId}`}
                  className="hover:text-white hover:bg-blue-800/60 rounded-full p-0.5 transition-colors ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main scrollable list container */}
      <div
        id="triage-queue-list"
        role="region"
        aria-label="Triage Queue Anomaly List"
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 focus:outline-none"
      >
        {/* Loading State */}
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
              onClick={reloadQueue}
              className="mt-1 px-3 py-1 rounded bg-red-900/60 hover:bg-red-800 text-xs text-white transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State: Waypoint filter active with 0 results */}
        {!isLoading &&
          !error &&
          filteredAnomalies.length === 0 &&
          selectedWaypointId && (
            <div className="py-8 px-4 text-center flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center text-blue-400 mb-1">
                <MapPin className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-semibold text-white">
                No open anomalies at {selectedWaypointId}
              </h4>
              <p className="text-[11px] text-text-secondary max-w-xs leading-relaxed">
                This waypoint is currently operating within nominal baseline parameters.
              </p>
              <button
                type="button"
                onClick={clearFilter}
                className="mt-2 px-2.5 py-1 rounded text-xs font-medium text-blue-400 bg-blue-950/50 border border-blue-500/40 hover:bg-blue-900/40 transition-colors"
              >
                Clear Waypoint Filter
              </button>
            </div>
          )}

        {/* Empty State: General empty */}
        {!isLoading &&
          !error &&
          filteredAnomalies.length === 0 &&
          !selectedWaypointId && (
            <EmptyState
              icon={<CheckCircleIcon className="w-6 h-6 text-green-400" />}
              title="Queue Clear · Nominal"
              description="No unresolved anomalies flagged. Fleet telemetry is operating within nominal thresholds."
              className="py-8"
            />
          )}

        {/* Data List */}
        {!isLoading && !error && filteredAnomalies.length > 0 && (
          <ul className="flex flex-col gap-2.5 list-none m-0 p-0">
            {filteredAnomalies.map((item, index) => {
              const anomalyId = item.id || item.anomaly_id || `item-${index}`;
              const isSelected = selectedIssueIdProp
                ? selectedIssueIdProp.toLowerCase() === anomalyId.toLowerCase()
                : selectedAnomalyId === anomalyId;
              const isHovered =
                hoveredAnomalyId === anomalyId ||
                (Boolean(hoveredWaypointId) &&
                  getAnomalyWaypointId(item) === hoveredWaypointId);

              return (
                <AnomalyCard
                  key={anomalyId}
                  item={item}
                  index={index}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  onSelect={handleCardClick}
                  onHover={setHoveredAnomalyId}
                />
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
