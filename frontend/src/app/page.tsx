import React from 'react';
import FacilityMap from '../components/3d/FacilityMap';
import TriageQueue from '../components/ui/TriageQueue';
import AIChatDrawer from '../components/ui/AIChatDrawer';
import Header from '../components/ui/Header';

export default function Home() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 relative">
          {/* Main 2D/3D Map View */}
          <FacilityMap />
        </main>
        <aside className="w-96 border-l flex flex-col">
          {/* Triage Queue and other side panels */}
          <TriageQueue />
        </aside>
      </div>
      {/* Slide-out drawer for AI chat */}
      <AIChatDrawer />
    </div>
  );
}
