import React from 'react';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * FindingsChart — STUB
 * Will render evidence-backed findings charts using Recharts.
 * Planned charts: anomaly frequency bar chart, confidence score timeline.
 */
export default function FindingsChart() {
  const stubBars = [40, 65, 30, 80, 55, 70, 45];

  return (
    <div
      id="findings-chart-stub"
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Findings &amp; Metrics</h2>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}
        >
          Chart · STUB
        </span>
      </div>

      {/* Fake bar chart */}
      <div className="flex items-end gap-1.5 h-20">
        {stubBars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: `${h}%`, background: 'rgba(59,130,246,0.6)' }}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500">Anomaly frequency by waypoint (Recharts replaces this)</p>
    </div>
  );
}
