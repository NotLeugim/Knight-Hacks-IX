'use client';

import React, { useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Pill } from '@/components/ui/Pill';
import FindingsChart from '@/components/charts/FindingsChart';
import ConfigComparisonCard from '@/components/insights/ConfigComparisonCard';
import { fetchAnalytics } from '@/lib/api';
import { AnalyticsResponse } from '@/lib/analyticsTypes';
import { analyticsFixture } from '@/lib/analyticsFixture';

export default function InsightsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse>(analyticsFixture);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    fetchAnalytics()
      .then((res) => {
        if (res?.data && (res.data.batteryReliability || res.data.missionParadox)) {
          setAnalytics(res.data);
          setIsOffline(res.source === 'fixture');
        }
      })
      .catch((err) => {
        console.warn('[InsightsPage] Falling back to analytics fixture:', err);
        setIsOffline(true);
      });
  }, []);

  return (
    <div className="h-full p-4 sm:p-6 overflow-y-auto">
      <Panel
        title="Fleet Insights & Telemetry Analytics"
        subtitle="Battery reliability correlation, mission paradox detection, and configuration performance"
        showSubtitle={true}
        className="overflow-visible"
        bodyClassName="overflow-visible"
        actions={
          isOffline ? (
            <Pill variant="warn">Sample data, backend offline</Pill>
          ) : (
            <Pill variant="confidence">TELEMETRY SYNCED</Pill>
          )
        }
      >
        <div className="max-w-6xl mx-auto py-2 flex flex-col gap-6">
          <FindingsChart />
          <ConfigComparisonCard data={analytics.configComparison} />
        </div>
      </Panel>
    </div>
  );
}
