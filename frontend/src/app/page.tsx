'use client';

import React, { useEffect, useState } from 'react';
import FacilityMap from '../components/3d/FacilityMap';
import FacilityMap2D from '../components/FacilityMap2D';
import TriageQueue from '../components/ui/TriageQueue';
import AIChatDrawer from '../components/ui/AIChatDrawer';
import { checkHealth } from '../lib/api';
import { Panel } from '@/components/ui/Panel';

export default function Home() {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  // Prove CORS is working by calling the backend health endpoint on mount
  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="h-full p-4 sm:p-6 flex flex-col lg:flex-row gap-4 overflow-hidden bg-orbit-bg select-none">
      {/* ── Left Stage: Facility Map in Orbit Panel ── */}
      <Panel
        id="facility-map-container"
        variant="flush"
        className="flex-1 h-full min-h-[400px] overflow-hidden relative"
      >
        {viewMode === '2d' ? (
          <FacilityMap2D className="w-full h-full" />
        ) : (
          <FacilityMap />
        )}

        {/* 2D / 3D Switcher */}
        <div className="absolute bottom-4 right-4 z-[1000] flex gap-1 text-xs bg-slate-900/80 backdrop-blur-md p-1 rounded-lg border border-slate-700/80 shadow-xl">
          <button
            id="map-toggle-2d"
            onClick={() => setViewMode('2d')}
            className={`px-3 py-1.5 rounded font-medium transition-all ${
              viewMode === '2d'
                ? 'border border-blue-500 text-blue-400 bg-blue-600/20 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            2D
          </button>
          <button
            id="map-toggle-3d"
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1.5 rounded font-medium transition-all ${
              viewMode === '3d'
                ? 'border border-blue-500 text-blue-400 bg-blue-600/20 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            3D
          </button>
        </div>
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
          bodyClassName="flex-1 min-h-0 flex flex-col overflow-hidden"
        >
          <TriageQueue />
        </Panel>
      </div>
    </div>
  );
}
