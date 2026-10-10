import React from 'react';

/**
 * FacilityMap — STUB
 * Will render a react-three-fiber Canvas with the 2D/3D facility floor plan,
 * robot path polyline, and interactive waypoint markers.
 */
export default function FacilityMap() {
  return (
    <div
      id="facility-map-stub"
      className="h-full w-full flex flex-col items-center justify-center gap-4 relative overflow-hidden"
      style={{ background: 'var(--color-bg-primary)' }}
    >
      {/* Grid overlay for visual depth */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Fake robot path dots */}
      <svg
        className="absolute inset-0 w-full h-full opacity-30"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polyline
          points="80,200 200,150 340,180 480,120 600,160 720,100 820,140"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        {[
          [80, 200], [200, 150], [340, 180], [480, 120],
          [600, 160], [720, 100], [820, 140],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="6" fill="#3b82f6" />
        ))}
        {/* Anomaly marker */}
        <circle cx={480} cy={120} r="12" fill="none" stroke="#ef4444" strokeWidth="2" />
        <circle cx={480} cy={120} r="5"  fill="#ef4444" />
      </svg>

      {/* Label */}
      <div className="relative z-10 text-center">
        <div
          className="text-xs font-semibold uppercase tracking-widest mb-2 px-3 py-1 rounded-full"
          style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}
        >
          Map Area · STUB
        </div>
        <p className="text-slate-400 text-sm">
          react-three-fiber canvas renders here
        </p>
        <p className="text-slate-600 text-xs mt-1">
          Floor plan · Waypoint path · Anomaly markers
        </p>
      </div>

      {/* 2D / 3D toggle placeholder */}
      <div
        className="absolute bottom-4 right-4 flex gap-2 text-xs"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <button id="map-toggle-2d" className="px-3 py-1 rounded border border-blue-600 text-blue-400 bg-blue-600/10">2D</button>
        <button id="map-toggle-3d" className="px-3 py-1 rounded border border-slate-600 hover:border-blue-600 transition-colors">3D</button>
      </div>
    </div>
  );
}
