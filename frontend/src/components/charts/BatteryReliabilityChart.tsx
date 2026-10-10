'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { BatteryReliabilityItem } from '../../lib/analyticsTypes';

interface BatteryReliabilityChartProps {
  data: BatteryReliabilityItem[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: BatteryReliabilityItem }>;
}

function CustomBatteryTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    if (!item) return null;
    return (
      <div
        className="rounded-lg p-3 shadow-xl text-xs"
        style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
        }}
      >
        <p className="font-semibold text-slate-200 mb-1">{item.band} battery</p>
        <p className="text-slate-300">
          <span
            className="font-semibold"
            style={{ color: item.minPct < 30 ? 'var(--color-danger)' : '#94a3b8' }}
          >
            {item.failureRatePct}%
          </span>{' '}
          of actions failed ({item.failed} of {item.actions})
        </p>
      </div>
    );
  }
  return null;
}

export default function BatteryReliabilityChart({ data }: BatteryReliabilityChartProps) {
  // Dynamically compute weighted failure rates below and above 30% battery
  const belowBands = data.filter((d) => d.maxPct <= 30);
  const aboveBands = data.filter((d) => d.minPct >= 30);

  const belowActions = belowBands.reduce((acc, d) => acc + d.actions, 0);
  const belowFailed = belowBands.reduce((acc, d) => acc + d.failed, 0);
  const aboveActions = aboveBands.reduce((acc, d) => acc + d.actions, 0);
  const aboveFailed = aboveBands.reduce((acc, d) => acc + d.failed, 0);

  const belowRate = belowActions > 0 ? Math.round((belowFailed / belowActions) * 100) : 0;
  const aboveRate = aboveActions > 0 ? Math.round((aboveFailed / aboveActions) * 100) : 0;

  const headline = `Below 30% battery, ${belowRate}% of actions fail. Above it, ${aboveRate}% do.`;

  return (
    <div
      id="battery-reliability-card"
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">
            Battery Reliability &amp; Action Failure Rates
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Failure frequency across battery charge levels during all mission actions
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className="text-xs px-2.5 py-1 rounded-md font-medium"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--color-danger)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            &lt;30% Danger
          </span>
          <span
            className="text-xs px-2.5 py-1 rounded-md font-medium text-slate-400"
            style={{
              background: 'rgba(100, 116, 139, 0.15)',
              border: '1px solid var(--color-border)',
            }}
          >
            &ge;30% Normal
          </span>
        </div>
      </div>

      {/* Computed headline */}
      <div
        className="rounded-lg px-3.5 py-2.5 text-xs font-medium"
        style={{
          background: 'rgba(239, 68, 68, 0.1)',
          borderLeft: '3px solid var(--color-danger)',
          color: 'var(--color-text-primary)',
        }}
      >
        <span className="font-semibold text-red-400">Key Finding: </span>
        {headline}
      </div>

      {/* Chart container */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 20, left: -10, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              opacity={0.4}
              vertical={false}
            />
            <XAxis
              dataKey="band"
              stroke="var(--color-text-muted)"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v) => `${v}%`}
              stroke="var(--color-text-muted)"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<CustomBatteryTooltip />}
              cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
            />
            <ReferenceLine
              x="20-30%"
              stroke="var(--color-warning)"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: '30% battery',
                fill: 'var(--color-warning)',
                position: 'top',
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <Bar dataKey="failureRatePct" name="Failure Rate" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`battery-bar-${index}`}
                  fill={entry.minPct < 30 ? 'var(--color-danger)' : '#64748b'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
