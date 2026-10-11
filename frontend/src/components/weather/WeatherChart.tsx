'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts';
import type {
  HourlyForecast,
  DailyForecast,
  WeatherUnits,
} from '@/lib/weatherTypes';
import {
  getWeatherCodeLabel,
  formatTemp,
  formatPrecip,
  formatWind,
} from './WeatherOverview';

export interface WeatherChartProps {
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  units: WeatherUnits;
  selectedDayIndex: number; // -1 for 48-hour default, 0..6 for specific day
}

export function WeatherChart({
  hourly,
  daily,
  units,
  selectedDayIndex,
}: WeatherChartProps) {
  // Filter data points based on selection
  const chartData = useMemo(() => {
    let rawSlice: HourlyForecast[] = hourly;
    if (selectedDayIndex >= 0 && selectedDayIndex < daily.length) {
      const selectedDate = daily[selectedDayIndex].date; // 'YYYY-MM-DD'
      rawSlice = hourly.filter((h) => h.time.startsWith(selectedDate));
      if (rawSlice.length === 0) {
        // In case hourly times use a slightly different timezone offset, fallback to 24h chunk
        const startIdx = selectedDayIndex * 24;
        rawSlice = hourly.slice(startIdx, startIdx + 24);
      }
    } else {
      rawSlice = hourly.slice(0, 48);
    }

    return rawSlice.map((h) => {
      const d = new Date(h.time);
      const hourLabel = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        hour12: true,
      });
      const shortDay = d.toLocaleDateString('en-US', { weekday: 'short' });

      // Values converted to target units for chart plotting
      const tempVal =
        units.temp === 'F'
          ? Math.round((h.temperature * 9) / 5 + 32)
          : Math.round(h.temperature * 10) / 10;

      const precipVal =
        units.precip === 'in'
          ? Number((h.precipitation / 25.4).toFixed(3))
          : Math.round(h.precipitation * 10) / 10;

      const windVal =
        units.wind === 'mph'
          ? Math.round(h.windSpeed10m * 2.23694)
          : Math.round(h.windSpeed10m * 10) / 10;

      const gustVal =
        units.wind === 'mph'
          ? Math.round(h.windGusts10m * 2.23694)
          : Math.round(h.windGusts10m * 10) / 10;

      return {
        rawTime: h.time,
        label: selectedDayIndex === -1 ? `${shortDay} ${hourLabel}` : hourLabel,
        temperature: tempVal,
        apparentTemperature: h.apparentTemperature,
        precipitation: precipVal,
        precipitationProbability: h.precipitationProbability,
        windSpeed: windVal,
        windGusts: gustVal,
        windSpeed80m: h.windSpeed80m,
        weatherCode: h.weatherCode,
        cloudCover: h.cloudCover,
        shortwaveRadiation: h.shortwaveRadiation,
        relativeHumidity: h.relativeHumidity,
      };
    });
  }, [hourly, daily, selectedDayIndex, units]);

  // Identify sunrise & sunset labels within chartData
  const sunEvents = useMemo(() => {
    const events: Array<{ timeLabel: string; type: 'Sunrise' | 'Sunset' }> = [];
    daily.forEach((d) => {
      if (d.sunrise) {
        const srDate = new Date(d.sunrise);
        const srHour = srDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        const srDay = srDate.toLocaleDateString('en-US', { weekday: 'short' });
        const targetLabel = selectedDayIndex === -1 ? `${srDay} ${srHour}` : srHour;
        if (chartData.some((cd) => cd.label === targetLabel)) {
          events.push({ timeLabel: targetLabel, type: 'Sunrise' });
        }
      }
      if (d.sunset) {
        const ssDate = new Date(d.sunset);
        const ssHour = ssDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        const ssDay = ssDate.toLocaleDateString('en-US', { weekday: 'short' });
        const targetLabel = selectedDayIndex === -1 ? `${ssDay} ${ssHour}` : ssHour;
        if (chartData.some((cd) => cd.label === targetLabel)) {
          events.push({ timeLabel: targetLabel, type: 'Sunset' });
        }
      }
    });
    return events;
  }, [daily, chartData, selectedDayIndex]);

  if (chartData.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-orbit-text-muted">
        No hourly forecast points available for this period.
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-4 border flex flex-col gap-3"
      style={{
        background: 'var(--color-bg-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-orbit-text">
            Hourly Weather Trend ({selectedDayIndex === -1 ? 'Next 48 Hours' : `Day ${selectedDayIndex + 1}`})
          </h3>
          <p className="text-[11px] text-orbit-text-secondary mt-0.5">
            Temperature line, precipitation bars, and wind/gust trends with sunrise and sunset indicators.
          </p>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-orbit-text-muted shrink-0">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-orbit-blue inline-block rounded" /> Temp ({units.temp === 'F' ? '°F' : '°C'})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2 bg-cyan-400/70 inline-block rounded-sm" /> Rain ({units.precip})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-emerald-400 inline-block rounded" /> Wind ({units.wind})
          </span>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d50" opacity={0.6} />

            <XAxis
              dataKey="label"
              tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
              stroke="#1e2d50"
              interval={selectedDayIndex === -1 ? 5 : 2}
            />

            {/* Left Y-Axis: Temperature */}
            <YAxis
              yAxisId="temp"
              domain={['auto', 'auto']}
              tick={{ fill: '#3b82f6', fontSize: 10, fontFamily: 'monospace' }}
              stroke="#1e2d50"
              unit={`°${units.temp}`}
            />

            {/* Right Y-Axis: Rain & Wind */}
            <YAxis
              yAxisId="secondary"
              orientation="right"
              domain={[0, 'auto']}
              tick={{ fill: '#10b981', fontSize: 10, fontFamily: 'monospace' }}
              stroke="#1e2d50"
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div
                    className="p-3 rounded-lg border text-xs font-mono shadow-xl space-y-1.5"
                    style={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      borderColor: '#334155',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <div className="flex items-center justify-between border-b pb-1 gap-4" style={{ borderColor: '#334155' }}>
                      <span className="font-bold text-white">{d.label}</span>
                      <span className="text-[11px] text-amber-400 font-sans">
                        {getWeatherCodeLabel(d.weatherCode)}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between gap-4">
                        <span className="text-orbit-text-secondary">Temperature:</span>
                        <span className="font-bold text-orbit-blue">
                          {d.temperature}°{units.temp} (Feels {formatTemp(d.apparentTemperature, units.temp)})
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-orbit-text-secondary">Precipitation:</span>
                        <span className="font-bold text-cyan-300">
                          {d.precipitation} {units.precip} ({d.precipitationProbability}% chance)
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-orbit-text-secondary">Wind (10m):</span>
                        <span className="font-bold text-emerald-400">
                          {d.windSpeed} {units.wind} (Gusts {d.windGusts} {units.wind})
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-orbit-text-secondary">Hub Wind (80m):</span>
                        <span className="font-bold text-emerald-300">
                          {formatWind(d.windSpeed80m, units.wind)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-orbit-text-secondary">Solar Irradiance:</span>
                        <span className="text-amber-300">
                          {Math.round(d.shortwaveRadiation)} W/m² (Clouds: {Math.round(d.cloudCover)}%)
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-orbit-text-secondary">Relative Humidity:</span>
                        <span className="text-orbit-text">
                          {Math.round(d.relativeHumidity)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            {/* Precipitation Bars */}
            <Bar
              yAxisId="secondary"
              dataKey="precipitation"
              name={`Precipitation (${units.precip})`}
              fill="#06b6d4"
              opacity={0.4}
              maxBarSize={18}
            />

            {/* Wind Line */}
            <Line
              yAxisId="secondary"
              type="monotone"
              dataKey="windSpeed"
              name={`Wind (${units.wind})`}
              stroke="#10b981"
              strokeWidth={1.5}
              dot={false}
            />

            {/* Gust Line (Dashed) */}
            <Line
              yAxisId="secondary"
              type="monotone"
              dataKey="windGusts"
              name={`Gusts (${units.wind})`}
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
            />

            {/* Temperature Line (Prominent) */}
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temperature"
              name={`Temp (°${units.temp})`}
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 2, fill: '#3b82f6' }}
              activeDot={{ r: 5 }}
            />

            {/* Sunrise / Sunset Reference Lines */}
            {sunEvents.map((evt, eIdx) => (
              <ReferenceLine
                key={`${evt.timeLabel}-${eIdx}`}
                x={evt.timeLabel}
                stroke={evt.type === 'Sunrise' ? '#f59e0b' : '#ec4899'}
                strokeDasharray="4 4"
                label={{
                  value: evt.type,
                  fill: evt.type === 'Sunrise' ? '#fbbf24' : '#f472b6',
                  fontSize: 9,
                  position: 'top',
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
