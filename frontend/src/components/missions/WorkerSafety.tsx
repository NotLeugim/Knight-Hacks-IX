'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchWorkerSafety, WorkerSafetyData } from '@/lib/api';

interface WorkerSafetyProps {
  missionId: string;
}

export function WorkerSafety({ missionId }: WorkerSafetyProps) {
  const [data, setData] = useState<WorkerSafetyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [expandedLocations, setExpandedLocations] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setIsOffline(false);

    fetchWorkerSafety(missionId)
      .then((res) => {
        if (!mounted) return;
        if (res.source === 'offline' || !res.data) {
          setIsOffline(true);
          setData(null);
        } else {
          setData(res.data);
          setIsOffline(false);
          // By default, expand all locations so technicians immediately see hazards
          const initialExpanded: Record<string, boolean> = {};
          res.data.followUpLocations.forEach((loc) => {
            initialExpanded[loc.locationId] = true;
          });
          setExpandedLocations(initialExpanded);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.warn(`[WorkerSafety] Error fetching worker safety for ${missionId}:`, err);
        setIsOffline(true);
        setData(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [missionId]);

  const toggleLocation = (locId: string) => {
    setExpandedLocations((prev) => ({
      ...prev,
      [locId]: !prev[locId],
    }));
  };

  const expandAll = () => {
    if (!data) return;
    const all: Record<string, boolean> = {};
    data.followUpLocations.forEach((loc) => {
      all[loc.locationId] = true;
    });
    setExpandedLocations(all);
  };

  const collapseAll = () => {
    setExpandedLocations({});
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-orbit-border bg-orbit-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-orbit-surface animate-pulse rounded" />
          <div className="h-4 w-32 bg-orbit-surface animate-pulse rounded" />
        </div>
        <div className="h-10 bg-orbit-surface animate-pulse rounded-lg" />
      </div>
    );
  }

  if (isOffline || !data) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-amber-400 font-medium text-xs">
          <AlertTriangle className="w-4 h-4" />
          <span>Worker safety guidance unavailable</span>
        </div>
        <p className="text-xs text-orbit-text-secondary">
          Worker safety guidance is unavailable right now because the server can&apos;t be reached.
        </p>
      </div>
    );
  }

  const { followUpLocations, summary, disclaimer } = data;
  const hasFollowUps = followUpLocations.length > 0;

  return (
    <div className="rounded-xl border border-orbit-border bg-orbit-card overflow-hidden">
      {/* Section Header */}
      <div className="p-4 border-b border-orbit-border flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-orbit-text-primary">
            Worker Safety Advisory
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {hasFollowUps
              ? `${followUpLocations.length} follow-up ${followUpLocations.length === 1 ? 'location' : 'locations'}`
              : 'Clear'}
          </span>
        </div>

        {hasFollowUps && (
          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={expandAll}
              className="text-orbit-text-secondary hover:text-orbit-text-primary underline-offset-2 hover:underline"
            >
              Expand all
            </button>
            <span className="text-orbit-border">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-orbit-text-secondary hover:text-orbit-text-primary underline-offset-2 hover:underline"
            >
              Collapse all
            </button>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Mission-level summary */}
        <div
          className={cn(
            'p-3 rounded-lg border text-xs flex items-start gap-2.5',
            hasFollowUps
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
          )}
        >
          {hasFollowUps ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5 flex-1">
            <p className="font-medium text-xs leading-relaxed">{summary}</p>
            {hasFollowUps && (
              <p className="text-[11px] text-orbit-text-secondary">
                Technicians dispatched to follow up on failed inspections or detected anomalies should review the location hazards and suggested protective equipment below.
              </p>
            )}
          </div>
        </div>

        {/* Clean mission message if no follow up */}
        {!hasFollowUps && (
          <div className="py-2 text-center text-xs text-orbit-text-secondary">
            No technicians need to be dispatched for manual follow-up on this route.
          </div>
        )}

        {/* Follow-up Locations List */}
        {hasFollowUps && (
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-orbit-text-secondary">
              Follow-Up Locations (Route Order)
            </h4>

            {followUpLocations.map((loc, index) => {
              const isExpanded = expandedLocations[loc.locationId] ?? false;

              return (
                <div
                  key={loc.locationId}
                  className="rounded-lg border border-orbit-border bg-orbit-surface/50 overflow-hidden transition-colors"
                >
                  {/* Card Header (Click to expand/collapse) */}
                  <button
                    type="button"
                    onClick={() => toggleLocation(loc.locationId)}
                    className="w-full text-left p-3.5 flex items-center justify-between gap-3 hover:bg-orbit-surface/80 transition-colors"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orbit-surface border border-orbit-border text-[11px] font-semibold text-orbit-text-primary shrink-0">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-orbit-text-primary">
                            {loc.locationName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orbit-card border border-orbit-border text-orbit-text-secondary">
                            {loc.zoneType}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orbit-card border border-orbit-border text-orbit-text-secondary">
                            {loc.environment}
                          </span>
                        </div>
                        <p className="text-[11px] text-orbit-text-secondary truncate mt-0.5">
                          {loc.reasons.join(' · ')}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-orbit-text-secondary">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* Card Expanded Content */}
                  {isExpanded && (
                    <div className="p-3.5 pt-0 border-t border-orbit-border/50 space-y-3.5 mt-2">
                      {/* Reasons for follow-up */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-orbit-text-secondary">
                          Reasons for follow-up
                        </span>
                        <ul className="space-y-1 text-xs text-orbit-text-primary">
                          {loc.reasons.map((reason, rIdx) => (
                            <li key={rIdx} className="flex items-start gap-1.5">
                              <span className="text-amber-400 font-bold">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Hazards with Source Citations */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-orbit-text-secondary">
                          Occupational Hazards
                        </span>
                        <div className="space-y-2">
                          {loc.hazards.map((hazard, hIdx) => (
                            <div
                              key={hIdx}
                              className="p-2.5 rounded-md bg-orbit-card/60 border border-orbit-border text-xs space-y-1"
                            >
                              <p className="text-orbit-text-primary font-medium">
                                {hazard.text}
                              </p>
                              <p className="text-[10px] text-orbit-text-secondary flex items-center gap-1">
                                <span className="font-semibold text-orbit-text-secondary/80">Source:</span>
                                <span>{hazard.source}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recommended PPE / What to bring */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-orbit-text-secondary">
                          What to wear / bring
                        </span>
                        {loc.protectiveEquipment.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {loc.protectiveEquipment.map((ppe, pIdx) => (
                              <span
                                key={pIdx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20"
                              >
                                <ShieldCheck className="w-3 h-3 text-blue-400 shrink-0" />
                                {ppe}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-orbit-text-secondary">
                            Standard site protective equipment applies.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Disclaimer */}
        <div className="pt-2 border-t border-orbit-border">
          <p className="text-[10px] text-orbit-text-secondary leading-normal flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-orbit-text-secondary shrink-0 mt-0.5" />
            <span>{disclaimer}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
