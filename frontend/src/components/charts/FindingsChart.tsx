'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchAnalytics } from '../../lib/api';
import { AnalyticsResponse } from '../../lib/analyticsTypes';

// Dynamic client-only imports to guarantee hydration safety
const BatteryReliabilityChart = dynamic(
  () => import('./BatteryReliabilityChart'),
  { ssr: false }
);

const MissionParadoxChart = dynamic(
  () => import('./MissionParadoxChart'),
  { ssr: false }
);

function ChartSkeleton({ title }: { title: string }) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4 animate-pulse"
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="h-4 bg-slate-700/60 rounded w-1/3" />
        <div className="h-4 bg-slate-700/60 rounded w-16" />
      </div>
      <div className="h-8 bg-slate-800/80 rounded w-3/4" />
      <div className="h-72 w-full bg-slate-800/40 rounded flex items-end gap-2 p-4">
        <div className="flex-1 bg-slate-700/40 rounded-t h-3/4" />
        <div className="flex-1 bg-slate-700/40 rounded-t h-1/2" />
        <div className="flex-1 bg-slate-700/40 rounded-t h-2/3" />
        <div className="flex-1 bg-slate-700/40 rounded-t h-1/4" />
        <div className="flex-1 bg-slate-700/40 rounded-t h-4/5" />
      </div>
      <p className="text-xs text-slate-500 self-center">Loading {title}...</p>
    </div>
  );
}

export default function FindingsChart() {
  const [analytics, setAnalytics] = useState<{
    data: AnalyticsResponse;
    source: 'api' | 'fixture';
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    let isMounted = true;

    fetchAnalytics()
      .then((res) => {
        if (isMounted) {
          setAnalytics(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('[SPOTSight] Unexpected error in fetchAnalytics', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div id="findings-analytics-container" className="flex flex-col gap-6 w-full">
      {/* Header section with source status badge */}
      <div
        className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Operational Findings &amp; Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Fleet reliability, battery threshold correlations, and mission outcome metrics
          </p>
        </div>

        {analytics?.source === 'fixture' && (
          <span
            id="source-fixture-badge"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium self-start sm:self-auto shrink-0"
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--color-warning)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Sample data, backend offline
          </span>
        )}

        {analytics?.source === 'api' && (
          <span
            id="source-api-badge"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium self-start sm:self-auto shrink-0"
            style={{
              background: 'rgba(34, 197, 94, 0.15)',
              color: 'var(--color-success)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Connected to Live API
          </span>
        )}
      </div>

      {/* Charts or Loading Skeletons */}
      {!mounted || loading || !analytics ? (
        <div className="flex flex-col gap-6">
          <ChartSkeleton title="Battery Reliability Analysis" />
          <ChartSkeleton title="Mission Paradox Metrics" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <BatteryReliabilityChart data={analytics.data.batteryReliability} />
          <MissionParadoxChart data={analytics.data.missionParadox} />
        </div>
      )}
    </div>
  );
}
