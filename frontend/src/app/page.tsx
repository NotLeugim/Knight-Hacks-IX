'use client';

import React, { useEffect } from 'react';
import FacilityMap from '../components/3d/FacilityMap';
import TriageQueue from '../components/ui/TriageQueue';
import AIChatDrawer from '../components/ui/AIChatDrawer';
import { checkHealth } from '../lib/api';
import { Panel } from '@/components/ui/Panel';

export default function Home() {
  // Prove CORS is working by calling the backend health endpoint on mount
  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="h-full p-4 sm:p-6 flex flex-col lg:flex-row gap-4 overflow-hidden bg-orbit-bg select-none">
      {/* ── Left Stage: 3D Facility Map in Orbit Panel ── */}
      <Panel
        id="facility-map-container"
        variant="flush"
        className="flex-1 h-full min-h-[400px] overflow-hidden"
      >
        <FacilityMap />
      </Panel>

      {/* ── Right Column: Two Separate Panels With 16px Gap ── */}
      <div
        id="right-drawer"
        className="w-full lg:w-80 xl:w-96 h-full flex flex-col gap-4 shrink-0 overflow-hidden"
      >
        {/* Panel 1: Gemini AI Assistant (Independently Scrollable) */}
        <Panel
          title="Gemini AI Assistant"
          variant="flush"
          className="flex-1 min-h-[260px] flex flex-col overflow-hidden"
          bodyClassName="flex-1 overflow-y-auto pb-4"
        >
          <AIChatDrawer />
        </Panel>

        {/* Panel 2: Triage Queue (Independently Scrollable, never clipped) */}
        <Panel
          title="Triage Queue"
          variant="flush"
          className="h-72 lg:h-80 shrink-0 flex flex-col overflow-hidden"
          bodyClassName="flex-1 overflow-y-auto pb-4"
        >
          <TriageQueue />
        </Panel>
      </div>
    </div>
  );
}
