'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import TriageQueue from '../components/ui/TriageQueue';
import { checkHealth, fetchTriageQueue, TriageAnomaly } from '../lib/api';
import { triageFixture } from '../lib/triageFixture';
import { Panel } from '@/components/ui/Panel';
import { TriageProvider } from '@/context/TriageContext';
import type { OverlayMode } from '../components/InteractiveFloorPlan';

const InteractiveFloorPlan = dynamic(
  () => import('../components/InteractiveFloorPlan'),
  { ssr: false }
);

export default function Home() {
  // Hoisted anomaly data source of truth for the dashboard
  const [anomalies, setAnomalies] = useState<TriageAnomaly[]>(triageFixture);
  // Hoisted global issue selection state (tracks specific anomaly ID e.g. 'AN014')
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  // Hoisted global waypoint selection state (e.g. 'WP03')
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);

  // Action Mode overlay state: defaults to 'pathfinding'
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('pathfinding');

  // Callback contract for future AI Smart Drawer: logs node ID and action payload
  const handleNodeSelect = useCallback((nodeId: string, payload?: unknown) => {
    console.log(`[SPOTCheck Action Mode] Failing node selected: ${nodeId}`, payload);
  }, []);

  // Health check and synchronized anomaly data fetch on mount
  useEffect(() => {
    checkHealth();
    fetchTriageQueue()
      .then((res) => {
        if (Array.isArray(res?.queue) && res.queue.length > 0) {
          setAnomalies(res.queue);
        }
      })
      .catch((err) => {
        console.warn('[SPOTCheck] Fallback to fixture in parent dashboard:', err);
      });
  }, []);

  return (
    <TriageProvider initialAnomalies={anomalies} onAnomaliesChange={setAnomalies}>
      <div className="h-full p-4 sm:p-6 flex flex-col lg:flex-row gap-4 overflow-hidden bg-orbit-bg select-none">
        {/* ── Left Stage: Facility Map in Orbit Panel ── */}
        <Panel
          id="facility-map-container"
          variant="flush"
          className="flex-1 h-full min-h-[400px] overflow-hidden relative"
        >
          <InteractiveFloorPlan
            className="w-full h-full"
            anomalies={anomalies}
            selectedIssueId={selectedIssueId}
            onSelectIssueId={setSelectedIssueId}
            selectedWaypointId={selectedWaypointId}
            onSelectWaypointId={setSelectedWaypointId}
            overlayMode={overlayMode}
            onOverlayModeChange={setOverlayMode}
            onNodeSelect={handleNodeSelect}
          />
        </Panel>

        {/* ── Right Column: Triage Queue Sidebar (Expanded to Fill Empty Space) ── */}
        <div
          id="right-drawer"
          className="w-full lg:w-[380px] xl:w-[440px] 2xl:w-[480px] h-full flex flex-col shrink-0 overflow-hidden"
        >
          <Panel
            title="Triage Queue"
            variant="flush"
            className="w-full h-full flex-1 flex flex-col overflow-hidden"
            bodyClassName="flex-1 min-h-0 flex flex-col overflow-hidden"
          >
            <TriageQueue
              anomalies={anomalies}
              selectedIssueId={selectedIssueId}
              onSelectIssue={setSelectedIssueId}
              selectedWaypointId={selectedWaypointId}
              onSelectWaypoint={setSelectedWaypointId}
            />
          </Panel>
        </div>
      </div>
    </TriageProvider>
  );
}
