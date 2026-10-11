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
        <div
          className="h-4 rounded w-1/3"
          style={{ background: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
        />
        <div
          className="h-4 rounded w-16"
          style={{ background: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
        />
      </div>
      <div
        className="h-8 rounded w-3/4"
        style={{ background: 'var(--color-bg-secondary)' }}
      />
      <div
        className="h-72 w-full rounded flex items-end gap-2 p-4"
        style={{ background: 'var(--color-bg-secondary)' }}
      >
        <div
          className="flex-1 rounded-t h-3/4"
          style={{ background: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
        />
        <div
          className="flex-1 rounded-t h-1/2"
          style={{ background: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
        />
        <div
          className="flex-1 rounded-t h-2/3"
          style={{ background: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
        />
        <div
          className="flex-1 rounded-t h-1/4"
          style={{ background: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
        />
        <div
          className="flex-1 rounded-t h-4/5"
          style={{ background: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
        />
      </div>
      <p
        className="text-xs self-center"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Loading {title}...
      </p>
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
        console.warn('[SPOTCheck] Unexpected error in fetchAnalytics', err);
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
          <h2
            className="text-base font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Operational Findings &amp; Analytics
          </h2>
          <p
            className="text-xs mt-0.5"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Fleet reliability, battery threshold correlations, and mission outcome metrics
          </p>
        </div>

        {analytics?.source === 'fixture' && (
          <span
            id="source-fixture-badge"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium self-start sm:self-auto shrink-0"
            style={{
              background: 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
              color: 'var(--color-warning)',
              border: '1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--color-warning)' }}
            />
            Sample data, backend offline
          </span>
        )}

        {analytics?.source === 'api' && (
          <span
            id="source-api-badge"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium self-start sm:self-auto shrink-0"
            style={{
              background: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
              color: 'var(--color-success)',
              border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--color-success)' }}
            />
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
