'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Sliders,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Battery,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchMissionForecast } from '@/lib/api';
import { MissionForecastResponse } from '@/lib/predictionsTypes';
import { formatActionTypeLabel } from '@/lib/predictionsFixture';

interface MissionForecastProps {
  missionId: string;
}

export function MissionForecast({ missionId }: MissionForecastProps) {
  const [data, setData] = useState<MissionForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Baseline real mission parameters
  const [realBattery, setRealBattery] = useState<number | null>(null);
  const [realConfig, setRealConfig] = useState<string | null>(null);

  // What-if interactive states
  const [sliderBattery, setSliderBattery] = useState<number>(100);
  const [selectedConfig, setSelectedConfig] = useState<string>('V1');
  const [isWhatIf, setIsWhatIf] = useState<boolean>(false);
  const [showSuggestedOrder, setShowSuggestedOrder] = useState<boolean>(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initial load for the mission to establish real baseline
  useEffect(() => {
    let active = true;
    setLoading(true);
    setIsWhatIf(false);
    setShowSuggestedOrder(false);

    fetchMissionForecast(missionId)
      .then((res) => {
        if (!active) return;
        if (res.data) {
          setData(res.data);
          setRealBattery(res.data.startBatteryPct);
          setRealConfig(res.data.configurationVersion);
          setSliderBattery(Math.round(res.data.startBatteryPct));
          setSelectedConfig(res.data.configurationVersion);
          setIsOffline(false);
        } else {
          setData(null);
          setIsOffline(true);
        }
      })
      .catch((err) => {
        if (!active) return;
        console.warn(`[MissionForecast] Offline or fetch failed for ${missionId}:`, err);
        setData(null);
        setIsOffline(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [missionId]);

  // Handler for battery slider with ~300ms debounce
  const handleBatteryChange = (newVal: number) => {
    setSliderBattery(newVal);
    const whatIfActive =
      (realBattery !== null && newVal !== Math.round(realBattery)) ||
      (realConfig !== null && selectedConfig !== realConfig);
    setIsWhatIf(whatIfActive);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchWhatIf(newVal, selectedConfig);
    }, 300);
  };

  // Handler for config toggle
  const handleConfigToggle = (newCfg: string) => {
    setSelectedConfig(newCfg);
    const whatIfActive =
      (realBattery !== null && sliderBattery !== Math.round(realBattery)) ||
      (realConfig !== null && newCfg !== realConfig);
    setIsWhatIf(whatIfActive);

    fetchWhatIf(sliderBattery, newCfg);
  };

  // Reset to mission's true baseline values
  const handleReset = () => {
    if (realBattery === null || realConfig === null) return;
    const baseBat = Math.round(realBattery);
    setSliderBattery(baseBat);
    setSelectedConfig(realConfig);
    setIsWhatIf(false);
    fetchWhatIf(baseBat, realConfig, true);
  };

  const fetchWhatIf = async (bat: number, cfg: string, isReset = false) => {
    try {
      const batParam = isReset ? undefined : bat;
      const cfgParam = isReset ? undefined : cfg;
      const res = await fetchMissionForecast(missionId, batParam, cfgParam);
      if (res.data) {
        setData(res.data);
        setIsOffline(false);
      }
    } catch (err) {
      console.warn('[MissionForecast] Failed updating what-if forecast:', err);
    }
  };

  // Render offline notice
  if (isOffline) {
    return (
      <div
        className="p-4 rounded-xl border flex flex-col gap-2"
        style={{
          background: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-orbit-text">
            Risk forecast
          </h4>
        </div>
        <p className="text-xs text-orbit-text-muted">
          The risk forecast is unavailable right now because the server can&apos;t be reached.
        </p>
      </div>
    );
  }

  // Loading skeleton
  if (loading || !data) {
    return (
      <div
        className="p-4 rounded-xl border animate-pulse space-y-3"
        style={{
          background: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="h-4 bg-panel-border/70 rounded w-1/3" />
        <div className="h-10 bg-panel-border/40 rounded" />
        <div className="h-24 bg-panel-border/40 rounded" />
      </div>
    );
  }

  const chancePct = Math.round(data.chanceAnyFailure * 100);
  const expectedFailures = data.expectedFailures.toFixed(1);

  return (
    <div
      className="p-4 rounded-xl border space-y-4"
      style={{
        background: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Title & Explainer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-orbit-blue" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-orbit-text">
              Risk forecast
            </h4>
            {isWhatIf && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
                Simulation Active
              </span>
            )}
          </div>
          <p className="text-[11px] text-orbit-text-secondary mt-0.5">
            Predicted chance each action fails, made before the mission runs.
          </p>
        </div>

        {/* What-if tag / reset button */}
        {isWhatIf && (
          <button
            onClick={handleReset}
            className="self-start sm:self-auto inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-panel-header border border-panel-border text-orbit-text hover:text-white transition-colors"
            title="Reset to mission's recorded start battery and config"
          >
            <RotateCcw className="w-3 h-3 text-orbit-text-muted" />
            Reset to real values
          </button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          className="p-3 rounded-lg border flex flex-col gap-1"
          style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}
        >
          <span className="text-[10px] uppercase font-mono tracking-wider text-orbit-text-muted">
            Chance Any Action Fails
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                'text-xl font-mono font-bold',
                chancePct >= 70 ? 'text-red-400' : chancePct >= 40 ? 'text-amber-400' : 'text-emerald-400'
              )}
            >
              {chancePct}%
            </span>
          </div>
        </div>

        <div
          className="p-3 rounded-lg border flex flex-col gap-1"
          style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}
        >
          <span className="text-[10px] uppercase font-mono tracking-wider text-orbit-text-muted">
            Expected Failed Actions
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                'text-xl font-mono font-bold',
                data.expectedFailures >= 2.0
                  ? 'text-red-400'
                  : data.expectedFailures >= 1.0
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              )}
            >
              {expectedFailures}
            </span>
            <span className="text-[11px] text-orbit-text-muted">of {data.actions.length}</span>
          </div>
        </div>

        <div
          className="p-3 rounded-lg border flex flex-col justify-between gap-1"
          style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}
        >
          <span className="text-[10px] uppercase font-mono tracking-wider text-orbit-text-muted">
            Simulation Parameters
          </span>
          <div className="text-xs font-mono text-orbit-text flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Battery className="w-3.5 h-3.5 text-amber-400" />
              {data.startBatteryPct}% Start
            </span>
            <span className="px-1.5 py-0.5 rounded bg-panel-header border border-panel-border text-[11px]">
              {data.configurationVersion}
            </span>
          </div>
        </div>
      </div>

      {/* What-If Interactive Controls */}
      <div
        className="p-3 rounded-lg border space-y-3"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orbit-text">
            <Sliders className="w-3.5 h-3.5 text-orbit-blue" />
            <span>Interactive What-If Scenario</span>
          </div>
          {isWhatIf ? (
            <span className="text-[11px] font-mono text-amber-400">
              What-if: {sliderBattery}% start
              {realBattery !== null && sliderBattery !== Math.round(realBattery)
                ? ` (real was ${Math.round(realBattery)}%)`
                : ''}
              {selectedConfig !== realConfig ? `, ${selectedConfig}` : ''}
            </span>
          ) : (
            <span className="text-[11px] font-mono text-orbit-text-muted">
              Using mission&apos;s real parameters
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Battery Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="battery-slider" className="text-orbit-text-secondary text-[11px]">
                Starting Battery:
              </label>
              <span className="font-mono font-bold text-orbit-text text-xs">
                {sliderBattery}%
              </span>
            </div>
            <input
              id="battery-slider"
              type="range"
              min={20}
              max={100}
              step={1}
              value={sliderBattery}
              onChange={(e) => handleBatteryChange(Number(e.target.value))}
              className="w-full h-1.5 bg-panel-border rounded-lg appearance-none cursor-pointer accent-orbit-blue"
            />
            <div className="flex justify-between text-[10px] font-mono text-orbit-text-muted">
              <span>20% (Low)</span>
              <span>60%</span>
              <span>100% (Full)</span>
            </div>
          </div>

          {/* Config Toggle (V1 vs V2) */}
          <div className="space-y-1">
            <span className="text-orbit-text-secondary text-[11px] block">
              Configuration Version:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleConfigToggle('V1')}
                className={cn(
                  'text-xs font-mono py-1.5 px-3 rounded-lg border font-semibold transition-all text-center',
                  selectedConfig === 'V1'
                    ? 'bg-orbit-blue/20 border-orbit-blue text-white shadow-sm'
                    : 'bg-panel-header border-panel-border text-orbit-text-muted hover:text-orbit-text'
                )}
              >
                Config V1
              </button>
              <button
                type="button"
                onClick={() => handleConfigToggle('V2')}
                className={cn(
                  'text-xs font-mono py-1.5 px-3 rounded-lg border font-semibold transition-all text-center',
                  selectedConfig === 'V2'
                    ? 'bg-orbit-blue/20 border-orbit-blue text-white shadow-sm'
                    : 'bg-panel-header border-panel-border text-orbit-text-muted hover:text-orbit-text'
                )}
              >
                Config V2
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Action Forecast Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-orbit-text-secondary">
            Action-by-Action Risk Progression
          </span>
          {!isWhatIf && (
            <span className="text-[11px] text-orbit-text-muted flex items-center gap-1">
              <Info className="w-3 h-3 text-orbit-blue" />
              Held-out prediction compared with actual mission result
            </span>
          )}
        </div>

        <div className="space-y-2">
          {data.actions.map((act) => {
            const riskPct = Math.round(act.risk * 100);
            return (
              <div
                key={act.actionId}
                className="p-2.5 sm:p-3 rounded-lg text-xs border flex flex-col gap-2"
                style={{
                  background: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                  {/* Step ID & Action Type */}
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-orbit-text">
                      #{act.sequence}
                    </span>
                    <span className="font-medium text-orbit-text">
                      {formatActionTypeLabel(act.actionType)}
                    </span>
                    <span className="text-orbit-text-muted text-[11px]">
                      at {act.locationName}
                    </span>
                  </div>

                  {/* Projected Battery & Risk Badge */}
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-orbit-text-secondary flex items-center gap-1">
                      <Battery className="w-3 h-3 text-amber-400" />
                      {act.projectedBattery}%
                    </span>

                    {/* Risk progress bar & % */}
                    <div className="flex items-center gap-2 min-w-[110px]">
                      <div className="w-16 h-2 bg-panel-border/80 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all',
                            riskPct >= 25
                              ? 'bg-red-400'
                              : riskPct >= 15
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          )}
                          style={{ width: `${Math.min(100, Math.max(5, riskPct))}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          'font-mono font-bold text-xs',
                          riskPct >= 25
                            ? 'text-red-400'
                            : riskPct >= 15
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        )}
                      >
                        {riskPct}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subrow: Reasons chips + (if !isWhatIf) What Happened column */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-t border-panel-border/30">
                  {/* Reasons chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {act.reasons.map((r, rIdx) => (
                      <span
                        key={rIdx}
                        className={cn(
                          'text-[10px] font-mono px-2 py-0.5 rounded border',
                          r === 'nothing unusual'
                            ? 'bg-panel-header text-orbit-text-muted border-panel-border'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        )}
                      >
                        {r}
                      </span>
                    ))}
                  </div>

                  {/* "What happened" column (Shown ONLY at real values) */}
                  {!isWhatIf && (
                    <div className="flex items-center gap-2 text-[11px] shrink-0 self-end sm:self-auto">
                      {act.heldOutRisk !== null && (
                        <span
                          className="font-mono text-orbit-text-secondary text-[11px]"
                          title="Held-out: predicted by a model trained without this mission."
                        >
                          Predicted {Math.round(act.heldOutRisk * 100)}%
                        </span>
                      )}

                      {act.actual === 'worked' ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Worked
                        </span>
                      ) : act.actual === 'failed' ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">
                          <XCircle className="w-2.5 h-2.5" />
                          Failed
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Suggested Reordering Section */}
      {data.suggestedReordering && (
        <div
          className="p-3 rounded-lg border space-y-2"
          style={{
            background: 'rgba(59, 130, 246, 0.05)',
            borderColor: 'rgba(59, 130, 246, 0.25)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-orbit-text">
              <AlertTriangle className="w-3.5 h-3.5 text-orbit-blue" />
              <span>
                A different order could lower expected failures from{' '}
                <strong className="text-amber-400">
                  {data.expectedFailures.toFixed(2)}
                </strong>{' '}
                to{' '}
                <strong className="text-emerald-400">
                  {data.suggestedReordering.expectedFailures.toFixed(2)}
                </strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowSuggestedOrder(!showSuggestedOrder)}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-orbit-blue hover:underline"
            >
              <span>{showSuggestedOrder ? 'Hide suggested order' : 'View suggested order'}</span>
              {showSuggestedOrder ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <p className="text-[10px] text-orbit-text-muted italic">
            {data.suggestedReordering.note}
          </p>

          {showSuggestedOrder && (
            <div className="mt-2 pt-2 border-t border-orbit-blue/20 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-orbit-text-secondary block mb-1">
                Optimized Waypoint Sequence:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {data.suggestedReordering.actions.map((sAct) => (
                  <div
                    key={sAct.newSequence}
                    className="p-2 rounded border bg-panel-header text-[11px] flex items-center justify-between font-mono"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-orbit-blue">#{sAct.newSequence}</span>
                      <span className="truncate text-orbit-text">
                        {formatActionTypeLabel(sAct.actionType)} ({sAct.locationName})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-[10px]">
                      <span className="text-orbit-text-muted">
                        Bat {sAct.projectedBattery}%
                      </span>
                      <span
                        className={cn(
                          'font-semibold',
                          sAct.risk >= 0.2
                            ? 'text-red-400'
                            : sAct.risk >= 0.12
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        )}
                      >
                        {Math.round(sAct.risk * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
