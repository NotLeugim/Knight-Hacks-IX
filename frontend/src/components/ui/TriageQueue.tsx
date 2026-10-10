import React from 'react';
import Link from 'next/link';

/**
 * TriageQueue — STUB
 * Will render a ranked list of open anomalies, sorted by
 * severity × asset criticality × failure rate.
 */

const STUB_ITEMS = [
  { id: 'WP09', label: 'Thermal anomaly — Pump Motor A', severity: 'CRITICAL', color: 'var(--color-danger)' },
  { id: 'WP04', label: 'Pressure reading out of range', severity: 'HIGH',     color: 'var(--color-warning)' },
  { id: 'WP12', label: 'Acoustic signature irregular',   severity: 'MEDIUM',  color: '#f59e0b' },
  { id: 'WP07', label: 'Visual inspection flag',         severity: 'LOW',     color: 'var(--color-text-muted)' },
];

export default function TriageQueue() {
  return (
    <div
      id="triage-queue-stub"
      className="flex flex-col flex-1 overflow-hidden"
      style={{ background: 'var(--color-bg-secondary)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">⚠️</span>
          <span className="text-sm font-semibold text-slate-200">Triage Queue</span>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--color-danger)' }}
        >
          Queue · STUB
        </span>
      </div>

      {/* List */}
      <ul className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {STUB_ITEMS.map((item, i) => (
          <li
            key={item.id}
            id={`triage-item-${item.id.toLowerCase()}`}
            className="flex items-start gap-3 rounded-xl px-3 py-2.5 cursor-pointer hover:brightness-125 transition-all"
            style={{ background: 'var(--color-bg-card)', borderLeft: `3px solid ${item.color}` }}
          >
            <span className="text-xs font-bold mt-0.5 shrink-0" style={{ color: 'var(--color-text-muted)' }}>
              #{i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{item.label}</p>
              <p className="text-xs mt-0.5" style={{ color: item.color }}>
                {item.severity} · {item.id}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/* Footer Link */}
      <div className="p-2.5 border-t shrink-0 text-center" style={{ borderColor: 'var(--color-border)' }}>
        <Link
          href="/findings"
          className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1"
        >
          View Fleet Findings &amp; Analytics →
        </Link>
      </div>
    </div>
  );
}

