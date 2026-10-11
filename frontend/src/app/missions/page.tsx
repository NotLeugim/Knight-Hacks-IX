'use client';

import React, { Suspense, useCallback, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Panel } from '@/components/ui/Panel';
import { Pill } from '@/components/ui/Pill';
import ShiftHandoffCard from '@/components/missions/ShiftHandoffCard';
import MissionList from '@/components/missions/MissionList';
import MissionDetail from '@/components/missions/MissionDetail';

function MissionsContent({
  onOfflineStateChange,
}: {
  onOfflineStateChange: (offline: boolean) => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Default to M027 if no query param is present
  const selectedMissionId = searchParams.get('mission') || 'M027';

  const handleSelectMission = useCallback(
    (missionId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('mission', missionId);
      router.replace(`/missions?${params.toString()}`);
    },
    [searchParams, router]
  );

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto py-2">
      {/* 1. Shift Handoff Cards (Top 3 recent) */}
      <ShiftHandoffCard
        selectedMissionId={selectedMissionId}
        onSelectMission={handleSelectMission}
        onOfflineStateChange={onOfflineStateChange}
      />

      {/* 2. Main Two-Column Section: All Missions List (Left) + Sticky Mission Detail (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Mission History Table (all 27 rows scrollable in page) */}
        <div className="lg:col-span-7">
          <MissionList
            selectedMissionId={selectedMissionId}
            onSelectMission={handleSelectMission}
            onOfflineStateChange={onOfflineStateChange}
          />
        </div>

        {/* Right Column: Sticky Mission Detail Panel */}
        <div className="lg:col-span-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-140px)] flex flex-col">
          <MissionDetail
            missionId={selectedMissionId}
          />
        </div>
      </div>
    </div>
  );
}

export default function MissionsPage() {
  const [isOffline, setIsOffline] = useState(false);

  return (
    <div className="h-full p-4 sm:p-6 overflow-y-auto">
      <Panel
        title="Mission History & Shift Handoff"
        subtitle="Autonomous autowalk audit logs, paradoxical completion analysis, and executive summaries"
        showSubtitle={true}
        className="overflow-visible"
        bodyClassName="overflow-visible"
        actions={
          isOffline ? (
            <Pill variant="warn">Sample data, backend offline</Pill>
          ) : (
            <Pill variant="confidence">27 AUDITED</Pill>
          )
        }
      >
        <Suspense
          fallback={
            <div className="p-8 text-center text-xs text-orbit-text-secondary animate-pulse">
              Loading mission telemetry...
            </div>
          }
        >
          <MissionsContent onOfflineStateChange={setIsOffline} />
        </Suspense>
      </Panel>
    </div>
  );
}
