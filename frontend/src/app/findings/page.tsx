import React from 'react';
import FindingsChart from '../../components/charts/FindingsChart';
import { Panel } from '@/components/ui/Panel';
import { Pill } from '@/components/ui/Pill';

export const metadata = {
  title: 'Findings & Analytics | SPOTSight',
  description:
    'Operational findings, battery reliability correlation, and mission paradox analytics for SPOT robots.',
};

export default function FindingsPage() {
  return (
    <div className="h-full p-4 sm:p-6 overflow-auto">
      <Panel
        title="Fleet Findings & Telemetry Analytics"
        subtitle="Autonomous inspection reliability curves, battery threshold analysis, and mission paradox metrics"
        showSubtitle={true}
        actions={<Pill variant="confidence">TELEMETRY SYNCED</Pill>}
        className="min-h-full"
      >
        <div className="max-w-6xl mx-auto py-2">
          <FindingsChart />
        </div>
      </Panel>
    </div>
  );
}

