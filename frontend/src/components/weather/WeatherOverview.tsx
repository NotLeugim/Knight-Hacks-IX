'use client';

import React from 'react';
import {
  Thermometer,
  CloudRain,
  Wind,
  Droplets,
  Cloud,
  AlertTriangle,
  Sun,
  ShieldAlert,
} from 'lucide-react';
import type {
  WeatherForecastResponse,
  WeatherUnits,
  DailyForecast,
} from '@/lib/weatherTypes';

export function getWeatherCodeLabel(code: number): string {
  switch (code) {
    case 0:
      return 'Clear sky';
    case 1:
      return 'Mainly clear';
    case 2:
      return 'Partly cloudy';
    case 3:
      return 'Overcast';
    case 45:
      return 'Fog';
    case 48:
      return 'Depositing rime fog';
    case 51:
      return 'Light drizzle';
    case 53:
      return 'Moderate drizzle';
    case 55:
      return 'Dense drizzle';
    case 56:
      return 'Light freezing drizzle';
    case 57:
      return 'Dense freezing drizzle';
    case 61:
      return 'Slight rain';
    case 63:
      return 'Moderate rain';
    case 65:
      return 'Heavy rain';
    case 66:
      return 'Light freezing rain';
    case 67:
      return 'Heavy freezing rain';
    case 71:
      return 'Slight snow fall';
    case 73:
      return 'Moderate snow fall';
    case 75:
      return 'Heavy snow fall';
    case 77:
      return 'Snow grains';
    case 80:
      return 'Slight rain showers';
    case 81:
      return 'Moderate rain showers';
    case 82:
      return 'Violent rain showers';
    case 85:
      return 'Slight snow showers';
    case 86:
      return 'Heavy snow showers';
    case 95:
      return 'Thunderstorm';
    case 96:
      return 'Thunderstorm with slight hail';
    case 99:
      return 'Thunderstorm with heavy hail';
    default:
      return 'Variable conditions';
  }
}

export function formatTemp(celsius: number, unit: 'C' | 'F'): string {
  if (unit === 'F') {
    return `${Math.round((celsius * 9) / 5 + 32)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

export function formatPrecip(mm: number, unit: 'mm' | 'in'): string {
  if (unit === 'in') {
    return `${(mm / 25.4).toFixed(2)} in`;
  }
  return `${mm.toFixed(1)} mm`;
}

export function formatWind(ms: number, unit: 'ms' | 'mph'): string {
  if (unit === 'mph') {
    return `${Math.round(ms * 2.23694)} mph`;
  }
  return `${ms.toFixed(1)} m/s`;
}

export interface WeatherOverviewProps {
  forecast: WeatherForecastResponse;
  units: WeatherUnits;
  onToggleUnits: () => void;
  selectedDayIndex: number;
  onSelectDay: (idx: number) => void;
}

export function WeatherOverview({
  forecast,
  units,
  onToggleUnits,
  selectedDayIndex,
  onSelectDay,
}: WeatherOverviewProps) {
  const current = forecast.current;
  const conditionText = getWeatherCodeLabel(current.weatherCode);

  // Time elapsed since fetch
  const getElapsedMinutes = () => {
    try {
      const fetchedTime = new Date(forecast.fetchedAt).getTime();
      const now = Date.now();
      const diffMin = Math.max(0, Math.floor((now - fetchedTime) / (1000 * 60)));
      if (diffMin === 0) return 'Just now';
      if (diffMin === 1) return '1 minute ago';
      return `${diffMin} minutes ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div
      className="rounded-xl p-5 border flex flex-col gap-5 transition-all"
      style={{
        background: 'var(--color-bg-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Header Bar */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-400 shrink-0" />
            <h2 className="text-base font-semibold text-orbit-text">
              {forecast.location.name}
            </h2>
          </div>
          <p className="text-xs text-orbit-text-secondary mt-0.5">
            Updated {getElapsedMinutes()} • Timezone {forecast.location.timezone}
          </p>
        </div>

        {/* Unit Toggle Button */}
        <button
          type="button"
          onClick={onToggleUnits}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs font-mono font-semibold px-3 py-1.5 rounded-lg border bg-panel-header hover:bg-panel-header/80 text-orbit-blue transition-colors"
          style={{ borderColor: 'var(--color-border)' }}
          title="Toggle between Metric (°C, mm, m/s) and US Customary (°F, in, mph)"
        >
          <Thermometer className="w-3.5 h-3.5 text-orbit-blue" />
          <span>
            {units.temp === 'F' ? '°F / in / mph (US)' : '°C / mm / m/s (Metric)'}
          </span>
        </button>
      </div>

      {/* Official NWS Alerts Banner */}
      {forecast.alerts && forecast.alerts.length > 0 && (
        <div className="space-y-2">
          {forecast.alerts.map((alt) => {
            const isSevere = alt.severity === 'Extreme' || alt.severity === 'Severe';
            return (
              <div
                key={alt.id}
                className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  isSevere
                    ? 'bg-red-500/10 border-red-500/30 text-red-200'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <ShieldAlert
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      isSevere ? 'text-red-400' : 'text-amber-400'
                    }`}
                  />
                  <div className="space-y-0.5 text-xs">
                    <span className="font-bold tracking-wide uppercase text-[11px] block">
                      {alt.severity} Alert — {alt.event}
                    </span>
                    <p className="text-orbit-text-secondary leading-relaxed font-sans">
                      {alt.headline}
                    </p>
                  </div>
                </div>

                {alt.expires && (
                  <span className="text-[10px] font-mono opacity-80 shrink-0 self-end sm:self-auto">
                    Expires: {alt.expires.replace('T', ' ').slice(0, 16)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Current Conditions Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* Temperature & Feels Like */}
        <div
          className="p-3 rounded-lg border flex flex-col justify-between"
          style={{
            background: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <span className="text-[10px] uppercase font-mono tracking-wider text-orbit-text-muted">
            Temperature
          </span>
          <div className="mt-1">
            <span className="text-2xl font-bold font-mono text-orbit-text">
              {formatTemp(current.temperature, units.temp)}
            </span>
            <span className="block text-[11px] text-orbit-text-secondary font-mono mt-0.5">
              Feels {formatTemp(current.apparentTemperature, units.temp)}
            </span>
          </div>
        </div>

        {/* Plain-Language Condition */}
        <div
          className="p-3 rounded-lg border flex flex-col justify-between"
          style={{
            background: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <span className="text-[10px] uppercase font-mono tracking-wider text-orbit-text-muted">
            Conditions
          </span>
          <div className="mt-1">
            <span className="text-sm font-semibold text-orbit-text block leading-tight">
              {conditionText}
            </span>
            <span className="text-[11px] text-orbit-text-muted block mt-0.5">
              Cloud cover {Math.round(current.cloudCover)}%
            </span>
          </div>
        </div>

        {/* Wind & Gusts */}
        <div
          className="p-3 rounded-lg border flex flex-col justify-between"
          style={{
            background: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <span className="text-[10px] uppercase font-mono tracking-wider text-orbit-text-muted flex items-center gap-1">
            <Wind className="w-3 h-3 text-orbit-blue" />
            Wind (10m)
          </span>
          <div className="mt-1">
            <span className="text-lg font-bold font-mono text-orbit-text">
              {formatWind(current.windSpeed10m, units.wind)}
            </span>
            <span className="block text-[11px] text-orbit-text-secondary font-mono mt-0.5">
              Gusts {formatWind(current.windGusts10m, units.wind)}
            </span>
          </div>
        </div>

        {/* Hub Height Wind (80m) */}
        <div
          className="p-3 rounded-lg border flex flex-col justify-between"
          style={{
            background: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <span className="text-[10px] uppercase font-mono tracking-wider text-orbit-text-muted flex items-center gap-1">
            <Wind className="w-3 h-3 text-emerald-400" />
            Hub Wind (80m)
          </span>
          <div className="mt-1">
            <span className="text-lg font-bold font-mono text-emerald-400">
              {formatWind(current.windSpeed80m, units.wind)}
            </span>
            <span className="block text-[11px] text-orbit-text-muted mt-0.5">
              Wind turbine benchmark
            </span>
          </div>
        </div>

        {/* Precipitation */}
        <div
          className="p-3 rounded-lg border flex flex-col justify-between"
          style={{
            background: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <span className="text-[10px] uppercase font-mono tracking-wider text-orbit-text-muted flex items-center gap-1">
            <CloudRain className="w-3 h-3 text-orbit-blue" />
            Precipitation
          </span>
          <div className="mt-1">
            <span className="text-lg font-bold font-mono text-orbit-text">
              {formatPrecip(current.precipitation, units.precip)}
            </span>
            <span className="block text-[11px] text-orbit-text-secondary font-mono mt-0.5">
              Chance {Math.round(current.precipitationProbability)}%
            </span>
          </div>
        </div>

        {/* Relative Humidity */}
        <div
          className="p-3 rounded-lg border flex flex-col justify-between"
          style={{
            background: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <span className="text-[10px] uppercase font-mono tracking-wider text-orbit-text-muted flex items-center gap-1">
            <Droplets className="w-3 h-3 text-orbit-blue" />
            Humidity
          </span>
          <div className="mt-1">
            <span className="text-lg font-bold font-mono text-orbit-text">
              {Math.round(current.relativeHumidity)}%
            </span>
            <span className="block text-[11px] text-orbit-text-muted mt-0.5">
              Relative humidity
            </span>
          </div>
        </div>

        {/* Solar Radiation / Sunlight */}
        <div
          className="p-3 rounded-lg border flex flex-col justify-between"
          style={{
            background: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <span className="text-[10px] uppercase font-mono tracking-wider text-orbit-text-muted flex items-center gap-1">
            <Sun className="w-3 h-3 text-amber-400" />
            Sunlight
          </span>
          <div className="mt-1">
            <span className="text-lg font-bold font-mono text-orbit-text">
              {Math.round(current.shortwaveRadiation)} W/m²
            </span>
            {current.shortwaveRadiation < 10 && (
              <span className="block text-[11px] text-orbit-text-secondary font-mono mt-0.5">
                (night)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 7-Day Outlook Strip (Day Buttons) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-orbit-text-secondary">
            7-Day Outlook (Click day to update chart)
          </span>
          <span className="text-[11px] font-mono text-orbit-text-muted">
            {selectedDayIndex === -1 ? 'Showing 48-Hour Hourly' : `Selected Day ${selectedDayIndex + 1}`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {/* 48-Hour Full View button */}
          {forecast.daily.map((day: DailyForecast, idx: number) => {
            const isSelected = selectedDayIndex === idx;
            const dateObj = new Date(`${day.date}T12:00:00`);
            const dayName = idx === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const monthDay = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => onSelectDay(isSelected ? -1 : idx)}
                className={`p-2.5 rounded-lg border text-left flex flex-col justify-between gap-1.5 transition-all font-mono ${
                  isSelected
                    ? 'bg-orbit-blue/20 border-orbit-blue text-white shadow-sm ring-1 ring-orbit-blue'
                    : 'bg-panel-header/70 border-panel-border/80 hover:bg-panel-header text-orbit-text-secondary hover:text-orbit-text'
                }`}
                style={{ borderColor: isSelected ? undefined : 'var(--color-border)' }}
              >
                <div className="flex items-center justify-between text-xs w-full">
                  <span className="font-bold">{dayName}</span>
                  <span className="text-[10px] text-orbit-text-muted">{monthDay}</span>
                </div>

                <div className="text-xs space-y-0.5">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-orbit-text">
                      {formatTemp(day.temperatureMax, units.temp)}
                    </span>
                    <span className="text-[11px] text-orbit-text-muted">
                      {formatTemp(day.temperatureMin, units.temp)}
                    </span>
                  </div>
                  <span className="text-[10px] text-orbit-text-secondary truncate block font-sans">
                    {getWeatherCodeLabel(day.weatherCode)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-panel-border/40 text-orbit-text-muted">
                  <span>{formatPrecip(day.precipitationSum, units.precip)}</span>
                  <span>{formatWind(day.windGustsMax, units.wind)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
