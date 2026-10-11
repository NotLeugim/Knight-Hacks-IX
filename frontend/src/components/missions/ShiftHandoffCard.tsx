'use client';

import React, { useEffect, useState } from 'react';
import { fetchShiftHandoff } from '@/lib/api';
import { MissionSummary } from '@/lib/summaryTypes';
import { Clock, Calendar, Bot, Cpu, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { cn, formatMissionDateTime } from '@/lib/utils';
import { STATUS_CONFIG } from '@/lib/status';
import { formatBullet } from './MissionDetail';

interface ShiftHandoffCardProps {
  onSelectMission?: (missionId: string) => void;
  selectedMissionId?: string | null;
  onOfflineStateChange?: (isOffline: boolean) => void;
}

export default function ShiftHandoffCard({
  onSelectMission,
  selectedMissionId,
  onOfflineStateChange,
}: ShiftHandoffCardProps) {
  const [missions, setMissions] = useState<MissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchShiftHandoff(3)
      .then((res) => {
        if (!mounted) return;
        const offline = res.source === 'offline' || res.missions.length === 0;
        setMissions(res.missions);
        setIsOffline(offline);
        onOfflineStateChange?.(offline);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setIsOffline(true);
        onOfflineStateChange?.(true);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [onOfflineStateChange]);

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4 shrink-0"
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h2 className="text-base font-semibold text-orbit-text flex items-center gap-2">
            <Clock className="w-4 h-4 text-orbit-blue" />
            End-of-Mission Shift Handoff
          </h2>
          <p className="text-xs text-orbit-text-secondary mt-0.5">
            Executive bullet summaries for recent missions to brief incoming operators
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg p-4 h-44 animate-pulse flex flex-col gap-3"
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="h-4 bg-panel-border rounded w-1/3" />
              <div className="h-3 bg-panel-border rounded w-full mt-2" />
              <div className="h-3 bg-panel-border rounded w-4/5" />
              <div className="h-3 bg-panel-border rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : isOffline || missions.length === 0 ? (
        <div
          className="rounded-lg p-6 text-center text-xs text-orbit-text-secondary"
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p>
            Shift summaries are unavailable right now because the server can&apos;t be reached.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {missions.map((m) => {
            const isSelected = selectedMissionId === m.missionId;
            const isReportedFailed = m.reportedStatus === 'FAILED';
            const isClean = m.reportedStatus === 'COMPLETED' && (m.facts?.failedActions?.length ?? 0) === 0;
            const isParadox = m.reportedStatus === 'COMPLETED' && (m.facts?.failedActions?.length ?? 0) > 0;
            const isGemini = m.generatedBy === 'gemini';

            const missionStatus = isReportedFailed ? 'critical' : isParadox ? 'warning' : 'nominal';
            const statusToken = STATUS_CONFIG[missionStatus];

            const confStatus = m.confidence >= 80 ? 'nominal' : m.confidence >= 60 ? 'warning' : 'critical';
            const confToken = STATUS_CONFIG[confStatus];

            return (
              <div
                key={m.missionId}
                onClick={() => onSelectMission?.(m.missionId)}
                className={cn(
                  'rounded-lg p-4 flex flex-col justify-between gap-3 cursor-pointer transition-all border',
                  isSelected
                    ? 'ring-1 ring-orbit-blue border-orbit-blue bg-panel-selected'
                    : 'hover:border-orbit-blue/50'
                )}
                style={{
                  background: isSelected ? undefined : 'var(--color-bg-secondary)',
                  borderColor: isSelected ? undefined : 'var(--color-border)',
                }}
              >
                <div className="flex flex-col gap-2">
                  {/* Top line: ID, status, confidence */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-orbit-text">
                        {m.missionId}
                      </span>
                      {m.facts?.startTime && (
                        <span className="text-[10px] text-orbit-text-muted flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{formatMissionDateTime(m.facts.startTime)}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'text-[10px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1',
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
                        {m.reportedStatus}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-mono px-1.5 py-0.5 rounded border',
                          confToken.textClass,
                          confToken.bgClass,
                          confToken.borderClass
                        )}
                      >
                        {m.confidence}/100
                      </span>
                    </div>
                  </div>

                  {/* 3 Bullets with leading bullet stripped */}
                  <ul className="text-xs text-orbit-text-secondary space-y-1.5 list-disc list-inside mt-1 leading-relaxed">
                    {m.bullets.slice(0, 3).map((bullet, idx) => (
                      <li key={idx} className="line-clamp-2">
                        <span>{formatBullet(bullet)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Footer: generator badge + link */}
                <div className="flex items-center justify-between pt-2 border-t text-[11px]" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="inline-flex items-center gap-1 text-orbit-text-muted">
                    {isGemini ? (
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
                  <span className="inline-flex items-center gap-0.5 text-orbit-blue font-medium hover:underline">
                    Details <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
