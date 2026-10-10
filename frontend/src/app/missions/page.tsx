'use client';

import React from 'react';
import { Compass } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill } from '@/components/ui/Pill';

export default function MissionsPage() {
  return (
    <div className="h-full p-4 sm:p-6 overflow-auto">
      <Panel
        title="Autonomous Mission Schedule"
        subtitle="Scheduled autowalks, perimeter patrols, and transformer inspections"
        actions={<Pill variant="neutral">4 SCHEDULED</Pill>}
        className="h-full"
      >
        <EmptyState
          icon={<Compass className="w-6 h-6 text-orbit-blue" />}
          title="No Missions In Flight"
          description="Next autonomous patrol is scheduled for 18:00 EST on Substation Deck 2."
        />
      </Panel>
    </div>
  );
}
