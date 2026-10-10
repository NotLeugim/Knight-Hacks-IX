'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill } from '@/components/ui/Pill';

export default function InsightsPage() {
  return (
    <div className="h-full p-4 sm:p-6 overflow-auto">
      <Panel
        title="Predictive AI Fleet Insights"
        subtitle="Cross-mission telemetry pattern recognition and anomaly clustering"
        showSubtitle={true}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/findings">
              <Pill variant="neutral" className="hover:bg-panel-selected cursor-pointer transition-colors">
                VIEW CHARTS & FINDINGS →
              </Pill>
            </Link>
            <Pill variant="confidence">AI ENGINE ACTIVE</Pill>
          </div>
        }
        className="h-full"
      >
        <EmptyState
          icon={<Sparkles className="w-6 h-6 text-yellow-300" />}
          title="Telemetry Analysis Up To Date"
          description="AI models have processed all 24 mission logs. No emerging mechanical wear or thermal drift detected across Spot units."
          action={
            <Link
              href="/findings"
              className="inline-flex items-center text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline mt-3"
            >
              Explore Battery vs Reliability &amp; Mission Paradox Data →
            </Link>
          }
        />
      </Panel>
    </div>
  );
}

