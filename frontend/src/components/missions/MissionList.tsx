'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { fetchAnalytics } from '@/lib/api';
import { AnalyticsResponse, MissionConfidenceItem } from '@/lib/analyticsTypes';
import { analyticsFixture } from '@/lib/analyticsFixture';
import { Compass, CheckCircle2, AlertTriangle, XCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG } from '@/lib/status';

interface MissionRowItem {
  missionId: string;
  config: string;
  reportedStatus: string;
  actionsSucceeded: number;
  actionsFailed: number;
  totalActions: number;
  confidenceScore: number;
  anomalyCount: number;
}

interface MissionListProps {
  selectedMissionId?: string | null;
  onSelectMission: (missionId: string) => void;
  onOfflineStateChange?: (isOffline: boolean) => void;
}

export default function MissionList({
  selectedMissionId,
  onSelectMission,
  onOfflineStateChange,
}: MissionListProps) {
  const [data, setData] = useState<AnalyticsResponse>(analyticsFixture);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAnalytics()
      .then((res) => {
        if (res?.data?.missionParadox) {
          setData(res.data);
          onOfflineStateChange?.(res.source === 'fixture');
        }
      })
      .catch((err) => {
        console.warn('[MissionList] Using analytics fixture fallback:', err);
        onOfflineStateChange?.(true);
      });
  }, [onOfflineStateChange]);

  const missions: MissionRowItem[] = useMemo(() => {
    const rawMissions = data.missionParadox?.missions || [];
    const confMap = new Map<string, MissionConfidenceItem>();
    if (data.confidence?.missions) {
      data.confidence.missions.forEach((c) => confMap.set(c.missionId, c));
    }

    const items: MissionRowItem[] = rawMissions.map((m) => {
      const conf = confMap.get(m.missionId);
      const total = m.actionsSucceeded + m.actionsFailed;
      return {
        missionId: m.missionId,
        config: m.config,
        reportedStatus: m.reportedStatus,
        actionsSucceeded: m.actionsSucceeded,
        actionsFailed: m.actionsFailed,
        totalActions: total,
        confidenceScore: conf ? conf.score : 70,
        anomalyCount: conf ? conf.anomalyCount : 0,
      };
    });

    // Sort newest first: M027 -> M001
    return items.sort((a, b) => b.missionId.localeCompare(a.missionId, undefined, { numeric: true }));
  }, [data]);

  const filteredMissions = useMemo(() => {
    if (!search.trim()) return missions;
    const query = search.trim().toLowerCase();
    return missions.filter(
      (m) =>
        m.missionId.toLowerCase().includes(query) ||
        m.config.toLowerCase().includes(query) ||
        m.reportedStatus.toLowerCase().includes(query)
    );
  }, [missions, search]);

  return (
    <div
      className="rounded-xl flex flex-col overflow-hidden"
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header & Filter */}
      <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h2 className="text-sm font-semibold text-orbit-text flex items-center gap-2">
            <Compass className="w-4 h-4 text-orbit-blue" />
            All Missions ({missions.length})
          </h2>
          <p className="text-xs text-orbit-text-secondary mt-0.5">
            Historical logs sorted newest first. Select any mission for complete breakdown.
          </p>
        </div>

        <div className="relative w-full sm:w-48">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-orbit-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter missions..."
            className="w-full pl-8 pr-3 py-1 text-xs rounded bg-panel-header border border-panel-border text-orbit-text placeholder:text-orbit-text-muted focus:outline-none focus:border-orbit-blue"
          />
        </div>
      </div>

      {/* Table list */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-panel-header z-10 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <tr className="text-orbit-text-muted font-mono uppercase text-[11px]">
              <th className="py-2.5 px-3 font-medium">Mission</th>
              <th className="py-2.5 px-2 font-medium">Config</th>
              <th className="py-2.5 px-2 font-medium">Reported</th>
              <th className="py-2.5 px-3 font-medium">Actual Result</th>
              <th className="py-2.5 px-2 font-medium text-center">Failed</th>
              <th className="py-2.5 px-2 font-medium text-center">Anomalies</th>
              <th className="py-2.5 px-3 font-medium text-right">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {filteredMissions.map((m) => {
              const isSelected = selectedMissionId === m.missionId;
              const isFailed = m.reportedStatus === 'FAILED';
              const isParadox = m.reportedStatus === 'COMPLETED' && m.actionsFailed > 0;
              const isClean = m.reportedStatus === 'COMPLETED' && m.actionsFailed === 0;

              const missionStatus = isFailed ? 'critical' : isParadox ? 'warning' : 'nominal';
              const statusToken = STATUS_CONFIG[missionStatus];

              const confStatus = m.confidenceScore >= 80 ? 'nominal' : m.confidenceScore >= 60 ? 'warning' : 'critical';
              const confToken = STATUS_CONFIG[confStatus];

              return (
                <tr
                  key={m.missionId}
                  role="button"
                  tabIndex={0}
                  aria-selected={isSelected}
                  onClick={() => onSelectMission(m.missionId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectMission(m.missionId);
                    }
                  }}
                  className={cn(
                    'cursor-pointer transition-colors outline-none select-none',
                    isSelected
                      ? 'bg-blue-600/20 hover:bg-blue-600/25 border-l-4 border-l-orbit-blue font-medium text-orbit-text'
                      : 'hover:bg-orbit-panel/70 text-orbit-text-secondary focus-visible:bg-orbit-panel/90'
                  )}
                >
                  {/* Mission ID */}
                  <td className="py-3 px-3 font-mono font-bold text-orbit-text">
                    <span className={cn(isSelected ? 'text-blue-300 font-extrabold' : '')}>{m.missionId}</span>
                  </td>

                  {/* Config */}
                  <td className="py-3 px-2 font-mono">
                    <span className="px-1.5 py-0.5 rounded text-[11px] bg-panel-header border border-panel-border text-orbit-text-muted">
                      {m.config}
                    </span>
                  </td>

                  {/* Reported Status */}
                  <td className="py-3 px-2">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded border',
                        statusToken.textClass,
                        statusToken.bgClass,
                        statusToken.borderClass
                      )}
                    >
                      {isClean ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : isParadox ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {m.reportedStatus}
                    </span>
                  </td>

                  {/* Actual Result */}
                  <td className="py-3 px-3 font-mono">
                    <span className={cn(isParadox ? 'text-yellow-400 font-medium' : isFailed ? 'text-red-400 font-medium' : 'text-green-400 font-medium')}>
                      {m.actionsSucceeded} of {m.totalActions} worked
                    </span>
                  </td>

                  {/* Failed actions count */}
                  <td className="py-3 px-2 font-mono text-center">
                    <span
                      className={cn(
                        m.actionsFailed > 0 ? 'text-yellow-400 font-bold' : 'text-green-400 font-semibold'
                      )}
                    >
                      {m.actionsFailed}
                    </span>
                  </td>

                  {/* Anomalies count */}
                  <td className="py-3 px-2 font-mono text-center">
                    <span
                      className={cn(
                        m.anomalyCount > 0 ? 'text-yellow-400 font-bold' : 'text-green-400 font-semibold'
                      )}
                    >
                      {m.anomalyCount}
                    </span>
                  </td>

                  {/* Confidence Pill */}
                  <td className="py-3 px-3 text-right">
                    <span
                      className={cn(
                        'inline-block text-[11px] font-mono px-2 py-0.5 rounded border',
                        confToken.textClass,
                        confToken.bgClass,
                        confToken.borderClass
                      )}
                    >
                      {m.confidenceScore}/100
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
