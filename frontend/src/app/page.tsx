'use client';

import React, { useEffect } from 'react';
import FacilityMap from '../components/3d/FacilityMap';
import FacilityMap2D from '../components/FacilityMap2D';
import TriageQueue from '../components/ui/TriageQueue';
import AIChatDrawer from '../components/ui/AIChatDrawer';
import { checkHealth } from '../lib/api';

// Nav icon placeholder
function NavIcon({ label, icon }: { label: string; icon: string }) {
  return (
    <button
      id={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
      title={label}
      className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-slate-700/60 transition-all duration-200 text-lg"
    >
      {icon}
    </button>
  );
}

export default function Home() {
  const [viewMode, setViewMode] = React.useState<'2d' | '3d'>('2d');

  // Prove CORS is working by calling the backend health endpoint on mount
  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>

      {/* ── LEFT: Slim Navigation Sidebar ── */}
      <nav
        id="nav-sidebar"
        className="flex flex-col items-center py-4 gap-3 border-r"
        style={{
          width: '64px',
          background: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-sm mb-4 shadow-lg shadow-blue-900/50">
          SP
        </div>

        <NavIcon label="Map View"     icon="🗺️" />
        <NavIcon label="Findings"     icon="📊" />
        <NavIcon label="AI Assistant" icon="🤖" />

        {/* Spacer + bottom icon */}
        <div className="flex-1" />
        <NavIcon label="Settings" icon="⚙️" />
      </nav>

      {/* ── CENTER: Main Stage ── */}
      <main id="main-stage" className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header
          id="top-header"
          className="flex items-center justify-between px-6 py-3 border-b shrink-0"
          style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
        >
          <div>
            <h1 className="text-base font-semibold text-slate-100 leading-none">SPOTSight</h1>
            <p className="text-xs text-slate-500 mt-0.5">NextEra Operator Dashboard</p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <span className="text-slate-400">
              Mission Confidence:{' '}
              <span className="font-semibold" style={{ color: 'var(--color-success)' }}>
                92%
              </span>
            </span>
            <span
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)' }}
            >
              ● LIVE
            </span>
          </div>
        </header>

        {/* Map fills remaining space */}
        <div id="facility-map-container" className="flex-1 overflow-hidden relative">
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
        </div>
      </main>

      {/* ── RIGHT: Smart Drawer ── */}
      <aside
        id="right-drawer"
        className="flex flex-col border-l overflow-hidden shrink-0"
        style={{
          width: '320px',
          background: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <AIChatDrawer />
        <div className="border-t" style={{ borderColor: 'var(--color-border)' }} />
        <TriageQueue />
      </aside>

    </div>
  );
}
