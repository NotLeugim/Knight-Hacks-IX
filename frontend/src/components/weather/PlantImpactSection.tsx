'use client';

import React, { useState, useEffect } from 'react';
import {
  Atom,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Activity,
  CheckSquare,
  Square,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type {
  PlantType,
  ImpactLevel,
  PlantImpactResponse,
  SinglePlantCurrentImpact,
} from '@/lib/weatherTypes';
import { fetchPlantImpacts } from '@/lib/api';

const PLANT_TYPE_STORAGE_KEY = 'spotsight_selected_plant_type';

export const VALID_PLANT_TYPES: readonly PlantType[] = [
  'nuclear',
  'natural_gas',
  'battery_storage',
  'solar',
  'wind',
] as const;

export function resolvePlantType(saved: string | null | undefined): PlantType {
  if (saved && (VALID_PLANT_TYPES as readonly string[]).includes(saved)) {
    return saved as PlantType;
  }
  return 'nuclear';
}

export interface PlantImpactSectionProps {
  latitude: number;
  longitude: number;
  locationName?: string;
  hasOfficialAlerts?: boolean;
}

export function PlantImpactSection({
  latitude,
  longitude,
  locationName,
  hasOfficialAlerts,
}: PlantImpactSectionProps) {
  const [selectedPlant, setSelectedPlant] = useState<PlantType>('nuclear');
  const [impactData, setImpactData] = useState<PlantImpactResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Checklist state for recommended actions
  const [checkedActions, setCheckedActions] = useState<Record<string, boolean>>({});

  // Load saved plant choice from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PLANT_TYPE_STORAGE_KEY);
      const resolved = resolvePlantType(saved);
      setSelectedPlant(resolved);
      if (saved !== resolved) {
        localStorage.setItem(PLANT_TYPE_STORAGE_KEY, resolved);
      }
    } catch {
      // LocalStorage access restricted
    }
  }, []);

  // Fetch plant impacts when location or selected plant changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchPlantImpacts(latitude, longitude, selectedPlant, locationName)
      .then((res) => {
        if (!isMounted) return;
        if (res.data) {
          setImpactData(res.data);
          setError(null);
        } else {
          setError('Weather is unavailable right now.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('[PlantImpactSection] Fetch error:', err);
        setError('Weather is unavailable right now.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [latitude, longitude, selectedPlant, locationName]);

  const handlePlantSelect = (plant: PlantType) => {
    setSelectedPlant(plant);
    try {
      localStorage.setItem(PLANT_TYPE_STORAGE_KEY, plant);
    } catch {
      // Ignore storage errors
    }
  };

  const toggleAction = (idx: number) => {
    const key = `${selectedPlant}-${idx}`;
    setCheckedActions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Render Pill with explicit text and icon
  const renderImpactPill = (level: ImpactLevel) => {
    if (level === 'Warning') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-red-500/15 border border-red-500/30 text-red-400">
          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          <span>Warning Level</span>
        </span>
      );
    }
    if (level === 'Watch') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Watch Level</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span>Normal Operations</span>
      </span>
    );
  };

  return (
    <div
      className="rounded-xl p-5 border flex flex-col gap-5 transition-all"
      style={{
        background: 'var(--color-bg-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Header & Plant Type Dropdown */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-orbit-blue shrink-0" />
            <h3 className="text-base font-semibold text-orbit-text">
              Power Plant Weather & Operations Impact
            </h3>
          </div>
          <p className="text-xs text-orbit-text-secondary mt-0.5">
            Select a generation technology to assess safety limits, equipment risks, and output estimates.
          </p>
        </div>

        {/* Dropdown Selector */}
        <div className="flex items-center gap-2.5 shrink-0">
          <label
            htmlFor="weather-plant-select"
            className="text-xs font-semibold uppercase tracking-wider text-orbit-text-secondary shrink-0"
          >
            Plant type
          </label>
          <select
            id="weather-plant-select"
            value={selectedPlant}
            onChange={(e) => handlePlantSelect(e.target.value as PlantType)}
            className="text-xs font-medium px-3 py-2 rounded-lg border bg-panel-header text-orbit-text border-panel-border focus:outline-none focus:ring-1 focus:ring-orbit-blue cursor-pointer transition-colors min-h-[38px] w-full sm:w-auto"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            <option value="nuclear">Nuclear</option>
            <option value="natural_gas">Natural gas</option>
            <option value="battery_storage">Battery storage</option>
            <optgroup label="Renewables">
              <option value="solar">Solar</option>
              <option value="wind">Wind</option>
            </optgroup>
          </select>
        </div>
      </div>

      {/* Loading state when fetching initial data or switching plant */}
      {loading && (!impactData || impactData.plantType !== selectedPlant) && (
        <div className="p-8 text-center text-xs text-orbit-text-muted animate-pulse flex items-center justify-center gap-2">
          <Activity className="w-3.5 h-3.5 text-orbit-blue animate-spin" />
          <span>Evaluating weather impacts for {selectedPlant.replace('_', ' ')}...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Area */}
      {impactData && (!loading || impactData.plantType === selectedPlant) && (
        <div className="space-y-5">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-orbit-text">
                  Current Hour Status:
                </span>
                {renderImpactPill(impactData.current.impactLevel)}
              </div>

              <div className="text-xs font-mono font-bold text-orbit-blue">
                {(impactData.current as SinglePlantCurrentImpact).outputLabel}
              </div>
            </div>

            {/* Nuclear Specific Callout */}
            {impactData.plantType === 'nuclear' && (
              <div
                className="p-4 rounded-xl border space-y-2"
                style={{
                  background: 'rgba(6, 182, 212, 0.05)',
                  borderColor: 'rgba(6, 182, 212, 0.3)',
                }}
              >
                <div className="flex items-center gap-2">
                  <Atom className="w-4 h-4 text-cyan-400 shrink-0" />
                  <h4 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                    Nuclear Plant Operating Profile
                  </h4>
                </div>
                <p className="text-xs text-orbit-text-secondary leading-relaxed font-sans">
                  {(impactData.current as SinglePlantCurrentImpact).nuclearNotice}
                </p>
                <p className="text-[11px] font-mono text-cyan-400 italic">
                  {(impactData.current as SinglePlantCurrentImpact).guidanceLabel}
                </p>
              </div>
            )}

            {/* Reasons with Source Labels */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-orbit-text-secondary block">
                Operating Factors & Safety Observations
              </span>
              <div className="space-y-2">
                {((impactData.current as SinglePlantCurrentImpact).reasons || []).length === 0 ? (
                  <div
                    className="p-3 rounded-lg border text-xs text-orbit-text-secondary flex items-center gap-2"
                    style={{
                      background: 'var(--color-bg-primary)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>No active weather alerts or adverse operating factors for this technology.</span>
                  </div>
                ) : (
                  ((impactData.current as SinglePlantCurrentImpact).reasons || []).map((r, rIdx) => (
                    <div
                      key={rIdx}
                      className="p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      style={{
                        background: 'var(--color-bg-primary)',
                        borderColor: 'var(--color-border)',
                      }}
                    >
                      <span className="text-orbit-text leading-relaxed font-sans">
                        {r.text}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-panel-header border border-panel-border text-orbit-text-muted shrink-0 self-start sm:self-auto">
                        Source: {r.source}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 48-Hour Estimated Output Chart (Gas, Solar, Wind) */}
            {(impactData.plantType === 'natural_gas' || impactData.plantType === 'solar' || impactData.plantType === 'wind') &&
              impactData.timeline.length > 0 && (
                <div
                  className="p-4 rounded-xl border space-y-2"
                  style={{
                    background: 'var(--color-bg-primary)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-orbit-text">
                      48-Hour Estimated Output Profile
                    </span>
                    <span className="text-[10px] font-mono text-orbit-text-muted">
                      {selectedPlant === 'natural_gas'
                        ? '% of Rated (ISO 15°C baseline)'
                        : 'Generation Index (0.0 to 1.0+)'}
                    </span>
                  </div>

                  <div className="h-44 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={impactData.timeline.map((item) => ({
                          time: new Date(item.time).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            hour12: true,
                          }),
                          output:
                            selectedPlant === 'natural_gas'
                              ? item.estimatedOutputPct ?? 100
                              : item.estimatedOutputIndex ?? 0,
                        }))}
                        margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d50" opacity={0.6} />
                        <XAxis
                          dataKey="time"
                          tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }}
                          stroke="#1e2d50"
                          interval={5}
                        />
                        <YAxis
                          tick={{ fill: '#3b82f6', fontSize: 9, fontFamily: 'monospace' }}
                          stroke="#1e2d50"
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            return (
                              <div className="p-2 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-white">
                                <span>
                                  Output:{' '}
                                  {selectedPlant === 'natural_gas'
                                    ? `${payload[0].value}%`
                                    : `${payload[0].value} index`}
                                </span>
                              </div>
                            );
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="output"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
          </div>

          {/* Recommended Actions Checklist */}
          {impactData.current.recommendedActions.length > 0 && (
            <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-xs font-semibold uppercase tracking-wider text-orbit-text-secondary block">
                Recommended Operational & Safety Actions
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {impactData.current.recommendedActions.map((act, aIdx) => {
                  const isChecked = checkedActions[`${selectedPlant}-${aIdx}`] || false;
                  return (
                    <button
                      key={aIdx}
                      type="button"
                      onClick={() => toggleAction(aIdx)}
                      className={`p-2.5 rounded-lg border text-left text-xs flex items-start gap-2.5 transition-colors ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300 line-through opacity-80'
                          : 'bg-panel-header border-panel-border text-orbit-text hover:bg-panel-header/80'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-orbit-text-muted shrink-0 mt-0.5" />
                      )}
                      <span className="leading-snug">{act}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disclaimers & Data Credits Footer */}
      <div
        className="p-3.5 rounded-lg border text-[11px] text-orbit-text-muted space-y-1.5"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          borderColor: 'var(--color-border)',
        }}
      >
        <p>
          Thresholds are typical values and vary by equipment. Not an official forecast. Follow official warnings and your plant&apos;s procedures.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-panel-border/30 text-[10px]">
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orbit-blue hover:underline inline-flex items-center gap-1"
          >
            <span>Weather data by Open-Meteo.com</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
          {hasOfficialAlerts && (
            <span>• Alerts from the National Weather Service</span>
          )}
        </div>
      </div>
    </div>
  );
}
