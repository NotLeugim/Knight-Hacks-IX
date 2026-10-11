'use client';

import React, { useEffect, useState } from 'react';
import { fetchMissionSummary } from '@/lib/api';
import { MissionSummary, MissionFacts } from '@/lib/summaryTypes';
import { MissionForecast } from './MissionForecast';
import { WorkerSafety } from './WorkerSafety';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Bot,
  Cpu,
  BatteryCharging,
  ShieldAlert,
  Info,
  Calendar,
  Clock,
} from 'lucide-react';
import { cn, formatMissionTimeRange } from '@/lib/utils';
import { toStatus, STATUS_CONFIG } from '@/lib/status';

interface MissionDetailProps {
  missionId: string | null;
  onClose?: () => void;
}

const ACTION_TYPE_MAP: Record<string, string> = {
  VISUAL_INSPECTION: 'Visual inspection',
  GAUGE_READING: 'Gauge reading',
  THERMAL_INSPECTION: 'Thermal inspection',
  ACOUSTIC_INSPECTION: 'Acoustic inspection',
  NAVIGATION: 'Navigation',
};

const FAILURE_TYPE_MAP: Record<string, string> = {
  LOCALIZATION_FAILURE: 'Lost localization',
  SENSOR_TIMEOUT: 'Sensor timeout',
  SIGNAL_NOISE: 'Signal noise',
  READING_UNRELIABLE: 'Unreliable reading',
  UNRELIABLE_READING: 'Unreliable reading',
  TARGET_NOT_DETECTED: 'Target not detected',
  COMMUNICATION_LOSS: 'Communication loss',
  PATH_BLOCKED: 'Path blocked',
  OBSTACLE_DETECTION: 'Obstacle detected',
};

const ANOMALY_TYPE_MAP: Record<string, string> = {
  ABNORMAL_VIBRATION: 'Abnormal vibration',
  ABNORMAL_TEMPERATURE: 'Abnormal temperature',
  GAUGE_OUT_OF_RANGE: 'Gauge out of range',
  VISUAL_DEFECT: 'Visual defect',
  SIGNAL_DEGRADATION: 'Signal degradation',
  NAVIGATION_OBSTRUCTION: 'Navigation obstruction',
  LOCALIZATION_ISSUE: 'Localization issue',
};

export function formatCode(code: string | null | undefined, map: Record<string, string>): string {
  if (!code) return '';
  if (map[code]) return map[code];
  const cleaned = code.replace(/_/g, ' ').toLowerCase();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function formatActionType(type: string | null | undefined): string {
  return formatCode(type, ACTION_TYPE_MAP);
}

export function formatFailureType(type: string | null | undefined): string {
  return formatCode(type, FAILURE_TYPE_MAP);
}

export function formatAnomalyType(type: string | null | undefined): string {
  return formatCode(type, ANOMALY_TYPE_MAP);
}

export function formatBullet(bullet: string): string {
  return bullet.replace(/^[-*]\s*/, '').trim();
}

function formatBreakdownReason(
  reason: string,
  facts?: MissionFacts
): string {
  // Check for Failed action: ID (TYPE)
  const actionMatch = reason.match(/Failed action:\s*([A-Za-z0-9_]+)(?:\s*\(([^)]+)\))?/i);
  if (actionMatch && facts) {
    const actId = actionMatch[1];
    const fa = facts.failedActions.find((a) => a.actionId === actId);
    if (fa) {
      return `Failed action #${fa.sequence}: ${formatActionType(fa.actionType)} at ${fa.locationName}`;
    }
    const rawType = actionMatch[2];
    if (rawType) {
      return `Failed action: ${formatActionType(rawType)}`;
    }
  }

  // Check for SEVERITY anomaly: ID (TYPE)
  const anomalyMatch = reason.match(/([A-Za-z]+)\s+anomaly:\s*([A-Za-z0-9_]+)(?:\s*\(([^)]+)\))?/i);
  if (anomalyMatch && facts) {
    const sev = anomalyMatch[1];
    const anId = anomalyMatch[2];
    const an = facts.anomalies.find((a) => a.anomalyId === anId);
    const sevTitle = sev.charAt(0).toUpperCase() + sev.slice(1).toLowerCase();
    if (an) {
      const target = an.assetName || an.locationName;
      return `${sevTitle} anomaly: ${formatAnomalyType(an.anomalyType)} on ${target}`;
    }
    const rawType = anomalyMatch[3];
    if (rawType) {
      return `${sevTitle} anomaly: ${formatAnomalyType(rawType)}`;
    }
  }

  return reason;
}

export default function MissionDetail({ missionId }: MissionDetailProps) {
  const [summary, setSummary] = useState<MissionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (!missionId) {
      setSummary(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    setIsOffline(false);

    fetchMissionSummary(missionId)
      .then((res) => {
        if (!mounted) return;
        if (res.source === 'offline' || !res.data) {
          setIsOffline(true);
          setSummary(null);
        } else {
          setSummary(res.data);
          setIsOffline(false);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setIsOffline(true);
        setSummary(null);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [missionId]);

  if (!missionId) {
    return (
      <div
        className="rounded-xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[350px]"
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
        }}
      >
        <FileText className="w-10 h-10 text-orbit-text-muted mb-3" />
        <h3 className="text-sm font-semibold text-orbit-text">No Mission Selected</h3>
        <p className="text-xs text-orbit-text-secondary max-w-xs mt-1">
          Select any mission from the list to view its executive shift summary, telemetry analysis, failed actions, and anomaly breakdown.
        </p>
      </div>
    );
  }

  const isReportedFailed = summary?.reportedStatus === 'FAILED';
  const isClean = summary?.reportedStatus === 'COMPLETED' && (summary?.facts?.failedActions?.length ?? 0) === 0;
  const isParadox = summary?.reportedStatus === 'COMPLETED' && (summary?.facts?.failedActions?.length ?? 0) > 0;

  const missionStatus = isReportedFailed ? 'critical' : isParadox ? 'warning' : 'nominal';
  const statusToken = STATUS_CONFIG[missionStatus];

  const confStatus = (summary?.confidence ?? 0) >= 80 ? 'nominal' : (summary?.confidence ?? 0) >= 60 ? 'warning' : 'critical';
  const confToken = STATUS_CONFIG[confStatus];

  return (
    <div
      className="rounded-xl flex flex-col h-full overflow-hidden"
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Detail Header */}
      <div className="p-4 border-b flex flex-col gap-2 shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold text-orbit-text">{missionId}</span>
            {summary && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-panel-header border border-panel-border text-orbit-text-muted">
                {summary.facts.config}
              </span>
            )}
          </div>

          {summary && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-xs font-mono px-2.5 py-0.5 rounded border font-semibold',
                  confToken.textClass,
                  confToken.bgClass,
                  confToken.borderClass
                )}
              >
                Confidence: {summary.confidence}/100
              </span>
            </div>
          )}
        </div>

        {summary && (
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-orbit-text-secondary">
            {summary.facts?.startTime && (
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] px-2 py-0.5 rounded border border-panel-border bg-panel-header text-orbit-text font-medium">
                <Calendar className="w-3 h-3 text-orbit-blue shrink-0" />
                <span>{formatMissionTimeRange(summary.facts.startTime, summary.facts.endTime)}</span>
              </span>
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded border',
                statusToken.textClass,
                statusToken.bgClass,
                statusToken.borderClass
              )}
            >
              {isReportedFailed ? (
                <XCircle className="w-3 h-3" />
              ) : isParadox ? (
                <AlertTriangle className="w-3 h-3" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
              {summary.reportedStatus}
            </span>
            <span className="inline-flex items-center gap-1 text-orbit-text-muted">
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
        )}
      </div>

      {/* Detail Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-panel-border rounded w-1/3" />
            <div className="h-16 bg-panel-border/60 rounded" />
            <div className="h-4 bg-panel-border rounded w-1/4 mt-4" />
            <div className="h-20 bg-panel-border/60 rounded" />
          </div>
        ) : isOffline ? (
          <div
            className="rounded-lg p-5 text-center text-xs text-orbit-text-secondary flex flex-col items-center gap-2"
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <Info className="w-5 h-5 text-amber-400 mb-1" />
            <p className="font-semibold text-orbit-text">
              This mission&apos;s summary is unavailable right now because the server can&apos;t be reached.
            </p>
          </div>
        ) : summary ? (
          <>
            {/* 3 Executive Summary Bullets */}
            <div
              className="rounded-lg p-4 flex flex-col gap-2.5"
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <h4 className="text-xs font-semibold uppercase tracking-wider text-orbit-text-secondary flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-orbit-blue" />
                Shift Executive Summary
              </h4>
              <ul className="text-xs text-orbit-text space-y-2 list-disc list-inside leading-relaxed">
                {summary.bullets.map((bullet, idx) => (
                  <li key={idx}>
                    <span>{formatBullet(bullet)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Confidence Breakdown */}
            {summary.facts.confidence && (
              <div
                className="rounded-lg p-3.5 flex flex-col gap-2"
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-orbit-text">Confidence Calculation Breakdown</span>
                  <span className="font-mono font-bold text-orbit-text">{summary.facts.confidence.score}/100</span>
                </div>
                {summary.facts.confidence.breakdown && summary.facts.confidence.breakdown.length > 0 ? (
                  <div className="space-y-1 text-xs">
                    {summary.facts.confidence.breakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-orbit-text-secondary gap-2">
                        <span className="truncate">{formatBreakdownReason(item.reason, summary.facts)}</span>
                        <span className={cn('font-mono shrink-0', item.points < 0 ? 'text-red-400' : 'text-emerald-400')}>
                          {item.points > 0 ? `+${item.points}` : item.points}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
                    No deductions. All actions worked and no anomalies were found.
                  </p>
                )}
              </div>
            )}

            <WorkerSafety missionId={missionId} />
            <MissionForecast missionId={missionId} />

            {/* Failed Actions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-orbit-text-secondary flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-amber-400" />
                  Failed Actions ({summary.facts.failedActions.length})
                </h4>
              </div>

              {summary.facts.failedActions.length === 0 ? (
                <div className="text-xs text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>All actions executed successfully with zero faults.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {summary.facts.failedActions.map((fa) => (
                    <div
                      key={fa.actionId}
                      className="p-3 rounded-lg text-xs flex flex-col gap-1 border"
                      style={{
                        background: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)',
                      }}
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-orbit-text">
                          Action #{fa.sequence}: {formatActionType(fa.actionType)}
                        </span>
                        <span className="text-amber-400 font-semibold">
                          {formatFailureType(fa.failureType)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-orbit-text-secondary text-[11px]">
                        <span>Location: {fa.locationName}</span>
                        <span className="flex items-center gap-1 font-mono">
                          <BatteryCharging className="w-3 h-3 text-amber-400" />
                          Battery {fa.batteryPct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Anomalies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-orbit-text-secondary flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  Mission Anomalies ({summary.facts.anomalies.length})
                </h4>
              </div>

              {summary.facts.anomalies.length === 0 ? (
                <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 p-3 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span>No operational anomalies flagged during this mission (Nominal).</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {summary.facts.anomalies.map((an) => {
                    const anToken = STATUS_CONFIG[toStatus(an.severity)];
                    return (
                      <div
                        key={an.anomalyId}
                        className="p-3 rounded-lg text-xs flex flex-col gap-1.5 border"
                        style={{
                          background: 'var(--color-bg-secondary)',
                          borderColor: 'var(--color-border)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-orbit-text">{an.anomalyId}</span>
                            <span
                              className={cn(
                                'text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold border flex items-center gap-1',
                                anToken.textClass,
                                anToken.bgClass,
                                anToken.borderClass
                              )}
                            >
                              <span className="text-[9px]">{anToken.symbol}</span>
                              <span>{an.severity}</span>
                            </span>
                          </div>
                          {an.operatorReviewRequired && (
                            <span className="text-[10px] font-mono text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                              NEEDS REVIEW
                            </span>
                          )}
                        </div>

                      <p className="text-orbit-text-secondary text-[11px] leading-relaxed">
                        {an.description}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-orbit-text-muted pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <span>Asset: {an.assetName}</span>
                        <span>Location: {an.locationName}</span>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
