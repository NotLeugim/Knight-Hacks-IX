'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill } from '@/components/ui/Pill';

export default function AnomaliesPage() {
  return (
    <div className="h-full p-4 sm:p-6 overflow-auto">
      <Panel
        title="Fleet Anomaly Registry"
        subtitle="Active acoustic, thermal, and mechanical anomalies detected by Spot robots"
        actions={<Pill variant="nominal">SYSTEM NOMINAL</Pill>}
        className="h-full"
      >
        <EmptyState
          icon={<AlertTriangle className="w-6 h-6 text-status-warn" />}
          title="No Critical Anomalies Unresolved"
          description="All flagged sensor readings from recent inspection routes have been triaged or cleared by plant operators."
        />
      </Panel>
    </div>
  );
}
