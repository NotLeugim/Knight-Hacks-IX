'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  Info,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchTrendAlerts, fetchTrendBacktest } from '@/lib/api';
import {
  TrendAlert,
  TrendAlertsResponse,
  TrendBacktestResponse,
} from '@/lib/predictionsTypes';
import {
  predictionsTrendsFixture,
  predictionsBacktestFixture,
  formatWarningGap,
  formatMeasurementUnit,
  formatFailureTypeLabel,
} from '@/lib/predictionsFixture';

const ASSET_LOCATIONS: Record<string, string> = {
  'HX-202': 'Pipe Gallery',
  'HX-210': 'Battery Room',
  'HX-216': 'Warehouse Corridor',
  'HX-217': 'Transformer Yard',
  'PUMP-220': 'Boiler Feed Area',
};

function formatPlainMeasurementName(type: string): string {
  switch (type) {
    case 'SOUND_DB':
      return 'Sound level';
    case 'TEMPERATURE_C':
      return 'Temperature';
    case 'VISUAL_SCORE':
      return 'Visual score';
    case 'LOCALIZATION_CONFIDENCE_PCT':
      return 'Localization confidence';
    case 'PRESSURE_PSI':
      return 'Pressure';
    default:
      return type.replace(/_/g, ' ').toLowerCase();
  }
}

export default function TrendWatchCard() {
  const [trends, setTrends] = useState<TrendAlertsResponse>(predictionsTrendsFixture);
  const [backtest, setBacktest] = useState<TrendBacktestResponse>(predictionsBacktestFixture);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([fetchTrendAlerts(), fetchTrendBacktest()])
      .then(([trendsRes, backtestRes]) => {
        if (!active) return;
        if (trendsRes.data) {
          setTrends(trendsRes.data);
        }
        if (backtestRes.data) {
          setBacktest(backtestRes.data);
        }
        setIsOffline(trendsRes.source === 'offline' || backtestRes.source === 'offline');
      })
      .catch((err) => {
        if (!active) return;
        console.warn('[TrendWatchCard] Fetch error; using fixtures:', err);
        setIsOffline(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const alerts = [...trends.alerts].sort((a, b) => b.severity - a.severity);

  // Identify earliest-warning backtest case (HX-202 sound level)
  const earliestWarningEvent = backtest.events.find(
    (e) => e.assetId === 'HX-202' && e.followedByFailure !== null
  );

  const earliestWarningGap = earliestWarningEvent?.followedByFailure
    ? formatWarningGap(
        earliestWarningEvent.triggeredAt,
        earliestWarningEvent.followedByFailure.timestamp
      )
    : 'nearly 5 days';

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-5"
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h3 className="text-base font-semibold text-orbit-text flex items-center gap-2">
            <Activity className="w-4 h-4 text-orbit-blue" />
            Predictive maintenance alerts
          </h3>
          <p className="text-xs text-orbit-text-secondary mt-0.5">
            Assets whose last three readings are steadily getting worse.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isOffline ? (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
              SAMPLE DATA, BACKEND OFFLINE
            </span>
          ) : (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-panel-header border border-panel-border text-orbit-text-secondary">
              {alerts.length} ACTIVE ALERTS
            </span>
          )}
        </div>
      </div>

      {/* Active Alerts List */}
      <div className="space-y-3">
        {alerts.map((alert: TrendAlert) => {
          const unit = alert.unit || formatMeasurementUnit(alert.measurementType);
          const rStr = alert.readings.map((r) => r.toFixed(1)).join(' → ') + (unit ? ` ${unit}` : '');
          const locationName = !isOffline
            ? (alert.locationName || ASSET_LOCATIONS[alert.assetId])
            : undefined;

          return (
            <div
              key={`${alert.assetId}-${alert.measurementType}`}
              className="p-4 rounded-lg border flex flex-col gap-2.5 transition-all"
              style={{
                background: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                {/* Asset & Location Info */}
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-orbit-text text-sm">
                    {alert.assetName}
                  </span>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-panel-header border border-panel-border text-orbit-text-muted">
                    {alert.assetId}
                  </span>
                  {locationName && (
                    <span className="text-xs text-orbit-text-secondary">
                      • {locationName}
                    </span>
                  )}
                </div>

                {/* Readout & Severity Indicator */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 font-mono text-xs text-orbit-text bg-panel-header px-2 py-1 rounded border border-panel-border">
                    {alert.direction === 'up' ? (
                      <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>{rStr}</span>
                  </div>

                  <span
                    className={cn(
                      'text-xs font-mono px-2 py-1 rounded border font-bold',
                      alert.severity >= 3.0
                        ? 'text-red-400 bg-red-500/10 border-red-500/20'
                        : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    )}
                  >
                    Severity {alert.severity}
                  </span>
                </div>
              </div>

              {/* Plain-Language Operator Message */}
              <p className="text-xs text-orbit-text-secondary leading-relaxed">
                {alert.message}
              </p>
            </div>
          );
        })}
      </div>

      {/* Operator Warning Note */}
      <div
        className="p-3 rounded-lg border flex items-start gap-2.5 text-xs text-orbit-text-muted"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          borderColor: 'var(--color-border)',
        }}
      >
        <Info className="w-4 h-4 text-orbit-blue shrink-0 mt-0.5" />
        <p>
          Alerts use only good-quality readings. Each asset has few readings, so treat alerts as early warnings, not certainties.
        </p>
      </div>

      {/* "Did past warnings come true?" Section */}
      <div
        className="p-4 rounded-xl border space-y-3"
        style={{
          background: 'rgba(59, 130, 246, 0.03)',
          borderColor: 'rgba(59, 130, 246, 0.2)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-orbit-blue" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-orbit-text">
              Did past warnings come true?
            </h4>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-semibold">
            {backtest.followedByFailureCount} of {backtest.totalEvents} past warnings
          </span>
        </div>

        <p className="text-xs text-orbit-text-secondary">
          {backtest.followedByFailureCount} of {backtest.totalEvents} past warnings were followed by a failure on the same asset.
        </p>

        {/* Earliest-warning Highlight Callout */}
        {earliestWarningEvent && earliestWarningEvent.followedByFailure && (
          <div
            className="p-3 rounded-lg border flex items-start gap-2.5 bg-panel-header/80"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="text-orbit-text font-medium">
                Earliest Warning Example: <span className="text-orbit-blue">Heat Exchanger 02</span>
              </p>
              <p className="text-orbit-text-secondary">
                Sound level was flagged on Sep 5 (mission {earliestWarningEvent.missionId}) and the asset failed on Sep 10 (mission {earliestWarningEvent.followedByFailure.missionId}), {earliestWarningGap} later ({formatFailureTypeLabel(earliestWarningEvent.followedByFailure.failureType)}).
              </p>
            </div>
          </div>
        )}

        {/* Summary grid of backtest events */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
          {backtest.events.map((evt) => (
            <div
              key={`${evt.assetId}-${evt.measurementType}-${evt.triggeredAt}`}
              className="p-2.5 rounded border text-[11px] font-mono flex flex-col gap-1 bg-panel-header/50"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-orbit-text">{evt.assetName}</span>
                <span className="text-[10px] text-orbit-text-muted">{evt.missionId}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-orbit-text-secondary">
                  {formatPlainMeasurementName(evt.measurementType)}
                </span>
                {evt.followedByFailure ? (
                  <span className="text-amber-400 font-medium flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Failed in {evt.followedByFailure.missionId}
                  </span>
                ) : (
                  <span className="text-emerald-400/80 flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    No failure
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
