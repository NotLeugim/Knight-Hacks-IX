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
import { useChartThemeColors } from '../../lib/useCssVar';

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
        <div
          className="flex items-center justify-between gap-2 mb-1.5 border-b pb-1"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {item.missionId}
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{
              background:
                item.reportedStatus === 'FAILED'
                  ? 'color-mix(in srgb, var(--color-danger) 20%, transparent)'
                  : 'color-mix(in srgb, var(--color-success) 20%, transparent)',
              color:
                item.reportedStatus === 'FAILED'
                  ? 'var(--color-danger)'
                  : 'var(--color-success)',
            }}
          >
            {item.reportedStatus}
          </span>
        </div>
        <p className="leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {item.missionId} · reported {item.reportedStatus} · {item.actionsSucceeded} of {total} actions succeeded ({succPct}%), {item.actionsFailed} failed ({failPct}%)
        </p>
        <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Config: {item.config}
        </p>
      </div>
    );
  }
  return null;
}

export default function MissionParadoxChart({ data }: MissionParadoxChartProps) {
  const colors = useChartThemeColors();
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
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Mission Paradox: High-Level Status vs. Action Failures
          </h3>
          <p
            className="text-xs mt-0.5"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Individual action results for each mission compared to operator-reported mission status
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <span
            className="px-2.5 py-1 rounded-md font-medium"
            style={{
              background: 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
              color: 'var(--color-warning)',
              border: '1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)',
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
          background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
          borderLeft: '3px solid var(--color-warning)',
          color: 'var(--color-text-primary)',
        }}
      >
        <span className="font-semibold" style={{ color: 'var(--color-warning)' }}>
          Key Finding:{' '}
        </span>
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
              stroke={colors.border}
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
                    fill={isFailed ? colors.warning : colors.textMuted}
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
              stroke={colors.textMuted}
              tick={{ fill: colors.textMuted, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<CustomMissionTooltip />}
              cursor={{ fill: 'color-mix(in srgb, var(--color-text-primary) 4%, transparent)' }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 8, fontSize: 12 }}
            />
            {/* ReferenceLine separating V1 and V2 configurations */}
            <ReferenceLine
              x="M019"
              stroke={colors.border}
              strokeDasharray="3 3"
              label={{
                value: 'V1 | V2 Upgrade',
                fill: colors.textMuted,
                position: 'insideTopLeft',
                fontSize: 10,
              }}
            />
            {/* Visual reference for the only reported FAILED mission */}
            <ReferenceLine
              x="M017"
              stroke={colors.warning}
              strokeDasharray="3 3"
              label={{
                value: 'Reported FAILED',
                fill: colors.warning,
                position: 'top',
                fontSize: 10,
                fontWeight: 600,
              }}
            />
            <Bar
              dataKey="actionsSucceeded"
              stackId="mission"
              name="Actions Succeeded"
              fill={colors.chartSucceeded}
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-out"
              animationBegin={150}
            >
              {missions.map((entry) => (
                <Cell
                  key={`succ-${entry.missionId}`}
                  fill={colors.chartSucceeded}
                  stroke={entry.reportedStatus === 'FAILED' ? colors.warning : undefined}
                  strokeWidth={entry.reportedStatus === 'FAILED' ? 2 : 0}
                />
              ))}
            </Bar>
            <Bar
              dataKey="actionsFailed"
              stackId="mission"
              name="Actions Failed"
              fill={colors.chartFailed}
              radius={[3, 3, 0, 0]}
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-out"
              animationBegin={300}
            >
              {missions.map((entry) => (
                <Cell
                  key={`fail-${entry.missionId}`}
                  fill={colors.chartFailed}
                  stroke={entry.reportedStatus === 'FAILED' ? colors.warning : undefined}
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
