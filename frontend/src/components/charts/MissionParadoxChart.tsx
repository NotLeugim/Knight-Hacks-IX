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
  Legend,
} from 'recharts';
import { MissionParadoxData, MissionParadoxMission } from '../../lib/analyticsTypes';

interface MissionParadoxChartProps {
  data: MissionParadoxData;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MissionParadoxMission }>;
}

function CustomMissionTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    if (!item) return null;
    const total = item.actionsSucceeded + item.actionsFailed;
    const succPct = total > 0 ? Math.round((item.actionsSucceeded / total) * 100) : 0;
    const failPct = total > 0 ? Math.round((item.actionsFailed / total) * 100) : 0;

    return (
      <div
        className="rounded-lg p-3 shadow-xl text-xs max-w-xs"
        style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5 border-b pb-1" style={{ borderColor: 'var(--color-border)' }}>
          <span className="font-semibold text-slate-100">{item.missionId}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{
              background:
                item.reportedStatus === 'FAILED'
                  ? 'rgba(239, 68, 68, 0.2)'
                  : 'rgba(34, 197, 94, 0.2)',
              color:
                item.reportedStatus === 'FAILED'
                  ? 'var(--color-danger)'
                  : 'var(--color-success)',
            }}
          >
            {item.reportedStatus}
          </span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          {item.missionId} · reported {item.reportedStatus} · {item.actionsSucceeded} of {total} actions succeeded ({succPct}%), {item.actionsFailed} failed ({failPct}%)
        </p>
        <p className="text-[11px] text-slate-400 mt-1">Config: {item.config}</p>
      </div>
    );
  }
  return null;
}

export default function MissionParadoxChart({ data }: MissionParadoxChartProps) {
  const { summary, missions } = data;

  const headline = `${summary.completedWithFailures} of ${summary.reportedCompleted} missions reported COMPLETED contained failed actions.`;

  return (
    <div
      id="mission-paradox-card"
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">
            Mission Paradox: High-Level Status vs. Action Failures
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Individual action results for each mission compared to operator-reported mission status
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <span
            className="px-2.5 py-1 rounded-md font-medium"
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--color-warning)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            ⚠️ M017 only reported FAILED
          </span>
        </div>
      </div>

      {/* Computed headline */}
      <div
        className="rounded-lg px-3.5 py-2.5 text-xs font-medium"
        style={{
          background: 'rgba(245, 158, 11, 0.1)',
          borderLeft: '3px solid var(--color-warning)',
          color: 'var(--color-text-primary)',
        }}
      >
        <span className="font-semibold text-amber-400">Key Finding: </span>
        {headline}
      </div>

      {/* Chart container */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={missions}
            margin={{ top: 20, right: 10, left: -20, bottom: 25 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              opacity={0.4}
              vertical={false}
            />
            <XAxis
              dataKey="missionId"
              interval={0}
              height={50}
              tick={(props: { x?: string | number; y?: string | number; payload?: { value?: string } }) => {
                const { x = 0, y = 0, payload } = props;
                const val = payload?.value ?? '';
                const isFailed = val === 'M017';
                return (
                  <text
                    x={x}
                    y={y}
                    dy={12}
                    textAnchor="end"
                    transform={`rotate(-45, ${x}, ${y})`}
                    fill={isFailed ? 'var(--color-warning)' : 'var(--color-text-muted)'}
                    fontSize={isFailed ? 11 : 9.5}
                    fontWeight={isFailed ? 'bold' : 'normal'}
                  >
                    {val}{isFailed ? '*' : ''}
                  </text>
                );
              }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              stroke="var(--color-text-muted)"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<CustomMissionTooltip />}
              cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 8, fontSize: 12 }}
            />
            {/* ReferenceLine separating V1 and V2 configurations */}
            <ReferenceLine
              x="M019"
              stroke="var(--color-border)"
              strokeDasharray="3 3"
              label={{
                value: 'V1 | V2 Upgrade',
                fill: 'var(--color-text-muted)',
                position: 'insideTopLeft',
                fontSize: 10,
              }}
            />
            {/* Visual reference for the only reported FAILED mission */}
            <ReferenceLine
              x="M017"
              stroke="var(--color-warning)"
              strokeDasharray="3 3"
              label={{
                value: 'Reported FAILED',
                fill: 'var(--color-warning)',
                position: 'top',
                fontSize: 10,
                fontWeight: 600,
              }}
            />
            <Bar
              dataKey="actionsSucceeded"
              stackId="mission"
              name="Actions Succeeded"
              fill="var(--color-success)"
            >
              {missions.map((entry) => (
                <Cell
                  key={`succ-${entry.missionId}`}
                  fill="var(--color-success)"
                  stroke={entry.reportedStatus === 'FAILED' ? 'var(--color-warning)' : undefined}
                  strokeWidth={entry.reportedStatus === 'FAILED' ? 2 : 0}
                />
              ))}
            </Bar>
            <Bar
              dataKey="actionsFailed"
              stackId="mission"
              name="Actions Failed"
              fill="var(--color-danger)"
              radius={[3, 3, 0, 0]}
            >
              {missions.map((entry) => (
                <Cell
                  key={`fail-${entry.missionId}`}
                  fill="var(--color-danger)"
                  stroke={entry.reportedStatus === 'FAILED' ? 'var(--color-warning)' : undefined}
                  strokeWidth={entry.reportedStatus === 'FAILED' ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
