'use client';

import React from 'react';
import { ConfigComparisonData } from '@/lib/analyticsTypes';
import { analyticsFixture } from '@/lib/analyticsFixture';
import { Layers, BatteryCharging, AlertCircle, TrendingUp } from 'lucide-react';

interface ConfigComparisonCardProps {
  data?: ConfigComparisonData;
}

export default function ConfigComparisonCard({ data }: ConfigComparisonCardProps) {
  const comparison = data || analyticsFixture.configComparison;

  if (!comparison) return null;

  const { V1, V2, equalBattery, note } = comparison;

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-5"
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h3 className="text-base font-semibold text-orbit-text flex items-center gap-2">
            <Layers className="w-4 h-4 text-orbit-blue" />
            Configuration Performance Comparison
          </h3>
          <p className="text-xs text-orbit-text-secondary mt-0.5">
            Cross-version telemetry metrics across all 27 autonomous missions
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono bg-panel-header border border-panel-border text-orbit-text-secondary self-start sm:self-auto">
          <span>SAMPLE: 27 MISSIONS</span>
        </div>
      </div>

      {/* Main Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* V1 Card */}
        <div
          className="rounded-lg p-4 flex flex-col gap-3 relative overflow-hidden"
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-orbit-text-secondary">
              Baseline
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-orbit-panel text-orbit-text-muted border border-panel-border">
              {V1.missions} missions
            </span>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-orbit-text">Configuration V1 (baseline)</h4>
            <p className="text-xs text-orbit-text-secondary mt-0.5">Initial operational profile</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <div className="text-xs text-orbit-text-secondary">Mission Completion</div>
              <div className="text-xl font-bold font-mono text-orbit-text mt-0.5">
                {V1.missionCompletionPct.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-orbit-text-secondary">Action Success Rate</div>
              <div className="text-xl font-bold font-mono text-orbit-text mt-0.5">
                {V1.actionSuccessPct.toFixed(1)}%
              </div>
              <div className="text-[11px] font-mono text-orbit-text-muted mt-0.5">
                {V1.actions} total actions
              </div>
            </div>
          </div>

          {V1.minBatteryPct !== undefined && (
            <div className="flex items-center gap-2 pt-2 text-xs text-orbit-text-secondary">
              <BatteryCharging className="w-3.5 h-3.5 text-amber-400" />
              <span>Lowest battery reached: <strong className="font-mono text-orbit-text">{V1.minBatteryPct}%</strong></span>
            </div>
          )}
        </div>

        {/* V2 Card */}
        <div
          className="rounded-lg p-4 flex flex-col gap-3 relative overflow-hidden"
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
              Improved
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-orbit-panel text-orbit-text-muted border border-panel-border">
              {V2.missions} missions
            </span>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-orbit-text">Configuration V2 (improved)</h4>
            <p className="text-xs text-orbit-text-secondary mt-0.5">Iterated operational profile</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <div className="text-xs text-orbit-text-secondary">Mission Completion</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                {V2.missionCompletionPct.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-orbit-text-secondary">Action Success Rate</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                {V2.actionSuccessPct.toFixed(1)}%
              </div>
              <div className="text-[11px] font-mono text-orbit-text-muted mt-0.5">
                {V2.actions} total actions
              </div>
            </div>
          </div>

          {V2.minBatteryPct !== undefined && (
            <div className="flex items-center gap-2 pt-2 text-xs text-orbit-text-secondary">
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              <span>Lowest battery reached: <strong className="font-mono text-orbit-text">{V2.minBatteryPct}%</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Controlled Battery Comparison Section */}
      {equalBattery && (
        <div
          className="rounded-lg p-4 flex flex-col gap-3"
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-orbit-text">
              <TrendingUp className="w-4 h-4 text-orbit-blue" />
              Controlled Comparison (Battery &gt; {equalBattery.aboveBatteryPct}%)
            </div>
            <span className="text-[11px] font-mono text-orbit-text-muted">
              Normalized Battery Level
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded bg-orbit-panel border border-panel-border flex justify-between items-center">
              <div>
                <span className="text-orbit-text-secondary">Configuration V1:</span>{' '}
                <span className="font-mono text-orbit-text-muted">({equalBattery.V1.actions} actions)</span>
              </div>
              <span className="font-mono font-semibold text-orbit-text text-sm">
                {equalBattery.V1.actionSuccessPct.toFixed(1)}%
              </span>
            </div>
            <div className="p-2.5 rounded bg-orbit-panel border border-panel-border flex justify-between items-center">
              <div>
                <span className="text-orbit-text-secondary">Configuration V2:</span>{' '}
                <span className="font-mono text-orbit-text-muted">({equalBattery.V2.actions} actions)</span>
              </div>
              <span className="font-mono font-semibold text-emerald-400 text-sm">
                {equalBattery.V2.actionSuccessPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Context Note */}
      {note && (
        <div className="flex items-start gap-2.5 text-xs text-orbit-text-muted bg-panel-header p-3 rounded-lg border border-panel-border">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="text-orbit-text font-medium">Telemetry Context:</span> {note}
          </p>
        </div>
      )}
    </div>
  );
}
