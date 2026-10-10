'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill } from '@/components/ui/Pill';

export default function InsightsPage() {
  return (
    <div className="h-full p-4 sm:p-6 overflow-auto">
      <Panel
        title="Predictive AI Fleet Insights"
        subtitle="Cross-mission telemetry pattern recognition and anomaly clustering"
        actions={<Pill variant="confidence">AI ENGINE ACTIVE</Pill>}
        className="h-full"
      >
        <EmptyState
          icon={<Sparkles className="w-6 h-6 text-yellow-300" />}
          title="Telemetry Analysis Up To Date"
          description="AI models have processed all 24 mission logs. No emerging mechanical wear or thermal drift detected across Spot units."
        />
      </Panel>
    </div>
  );
}
