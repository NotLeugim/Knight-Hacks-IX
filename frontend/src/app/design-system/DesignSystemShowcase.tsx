'use client';

import React, { useState } from 'react';
import {
  Settings,
  SearchCheck,
  Puzzle,
  Download,
  Filter,
  Eye,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { colors, type StatusType } from '@/styles/tokens';
import { Panel } from '@/components/ui/Panel';
import { KpiCard } from '@/components/ui/KpiCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge, StatusDot, STATUS_MAP } from '@/components/ui/Status';
import { Pill } from '@/components/ui/Pill';
import { SegmentedTabs, type TabItem } from '@/components/ui/SegmentedTabs';
import { DateRangeSelect, type DateRangePreset } from '@/components/ui/DateRangeSelect';
import { SplitRefreshButton } from '@/components/ui/SplitRefreshButton';
import { IconButton } from '@/components/ui/IconButton';
import { Tooltip } from '@/components/ui/Tooltip';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { SubToolbar } from '@/components/ui/SubToolbar';

// ── Sample Robot Data for DataTable ──
interface RobotFleetRecord extends Record<string, unknown> {
  id: string;
  name: string;
  mission: string;
  status: StatusType;
  battery: number;
  waypoint: string;
  lastPing: string;
}

const SAMPLE_ROBOTS: RobotFleetRecord[] = [
  {
    id: 'spot-01',
    name: 'Spot Alpha (SPOT-01)',
    mission: 'Substation Deck Loop',
    status: 'SUCCESS',
    battery: 94,
    waypoint: 'WP-12 (Transformer B)',
    lastPing: '2s ago',
  },
  {
    id: 'spot-02',
    name: 'Spot Bravo (SPOT-02)',
    mission: 'Turbine Hall Patrol',
    status: 'WARN',
    battery: 62,
    waypoint: 'WP-08 (Bearing Housing)',
    lastPing: '14s ago',
  },
  {
    id: 'spot-03',
    name: 'Spot Charlie (SPOT-03)',
    mission: 'Perimeter Security Autowalk',
    status: 'NOMINAL',
    battery: 88,
    waypoint: 'WP-24 (North Gate Fence)',
    lastPing: '5s ago',
  },
  {
    id: 'spot-04',
    name: 'Spot Delta (SPOT-04)',
    mission: 'Switchyard High-Voltage Scan',
    status: 'CRITICAL',
    battery: 21,
    waypoint: 'WP-03 (Capacitor Bank)',
    lastPing: '1m ago',
  },
  {
    id: 'spot-05',
    name: 'Spot Echo (SPOT-05)',
    mission: 'Valve Vault Acoustic Audit',
    status: 'INFO',
    battery: 75,
    waypoint: 'WP-19 (Main Steam Header)',
    lastPing: '8s ago',
  },
  {
    id: 'spot-06',
    name: 'Spot Foxtrot (SPOT-06)',
    mission: 'Docking Station 1 Inactive',
    status: 'STOPPED',
    battery: 100,
    waypoint: 'Docking Pad 01',
    lastPing: '4m ago',
  },
];

export default function DesignSystemShowcase() {
  // Interactive showcase states
  const [activeSegmentTab, setActiveSegmentTab] = useState('missions');
  const [dateRange, setDateRange] = useState<DateRangePreset>('6m');
  const [selectedRobotId, setSelectedRobotId] = useState<string | number>('spot-02');
  const [tableState, setTableState] = useState<'normal' | 'loading' | 'empty'>('normal');

  const demoTabs: TabItem[] = [
    { id: 'live', label: 'Live Mission' },
    { id: 'anomalies', label: 'Anomalies', badge: 3 },
    { id: 'missions', label: 'Missions' },
    { id: 'insights', label: 'Insights' },
    { id: 'disabled', label: 'Archived', disabled: true },
  ];

  const tableColumns: Column<RobotFleetRecord>[] = [
    {
      key: 'name',
      header: 'Robot Name & ID',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orbit-blue shrink-0" />
          <span className="font-semibold text-white">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'mission',
      header: 'Assigned Mission',
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (item) => <StatusBadge status={item.status} size="sm" />,
    },
    {
      key: 'battery',
      header: 'Battery',
      align: 'right',
      sortable: true,
      render: (item) => (
        <span
          className={`font-semibold ${
            item.battery < 30
              ? 'text-status-critical'
              : item.battery < 70
              ? 'text-status-warn'
              : 'text-status-success'
          }`}
        >
          {item.battery}%
        </span>
      ),
    },
    {
      key: 'waypoint',
      header: 'Current Waypoint',
      sortable: true,
      render: (item) => (
        <span className="font-mono text-xs text-text-secondary">{item.waypoint}</span>
      ),
    },
    {
      key: 'lastPing',
      header: 'Last Telemetry',
      align: 'right',
      sortable: true,
      render: (item) => <span className="text-text-muted">{item.lastPing}</span>,
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto pb-24 overflow-y-auto">
      {/* ── Header Banner ── */}
      <div className="border-b border-panel-header-divider pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              SPOTSight Orbit Design System
            </h1>
            <Pill variant="live" pulse>
              ORBIT POLISH PASS
            </Pill>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Verified design system tokens, accessible high-contrast UI components, and Orbit shell chrome.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Pill variant="confidence">ALL CONTRASTS &ge; 4.5:1 PASS</Pill>
          <Pill variant="neutral">TOPBAR 64PX &bull; SUBTOOLBAR 48PX</Pill>
        </div>
      </div>

      {/* ── Section 1: SubToolbar Polish Demo (Title + Tabs + Date Range + Split Refresh) ── */}
      <Panel
        title="1. SubToolbar & SegmentedTabs (Orbit Native Polish)"
        actions={<Pill variant="nominal">FIXED 48PX HEIGHT</Pill>}
      >
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">
            Contextual title (~22px, title case, medium weight, white), optional filter button, translucent white SegmentedTabs (10px radius, 4px padding), borderless DateRangeSelect, and joined split refresh button.
          </p>
          <div className="rounded-panel overflow-hidden shadow-lg border border-[#357AA8]/50">
            <SubToolbar
              title="Unit #1 Live Mission"
              showFilter={true}
              centerSlot={
                <SegmentedTabs
                  tabs={demoTabs}
                  activeTab={activeSegmentTab}
                  onChange={setActiveSegmentTab}
                />
              }
              rightSlot={
                <>
                  <Pill variant="confidence" size="md">
                    <span className="text-white/80">Mission Confidence:</span>{' '}
                    <span className="text-[#55DC99] font-bold">92%</span>
                  </Pill>
                  <Pill variant="live" size="md" pulse>
                    LIVE
                  </Pill>
                  <DateRangeSelect value={dateRange} onChange={setDateRange} />
                  <SplitRefreshButton />
                </>
              }
            />
          </div>
        </div>
      </Panel>

      {/* ── Section 2: Contrast Verification for Status Badges & Pills (>= 4.5:1) ── */}
      <Panel
        title="2. Contrast Verification: StatusBadges & Pills"
        actions={<Pill variant="nominal">WCAG AA &ge; 4.5:1 VERIFIED</Pill>}
      >
        <div className="space-y-6">
          {/* Status Badges with computed contrast ratios */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              StatusBadge Variants (Solid Fills &amp; Contrast Ratio Proof)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(Object.keys(STATUS_MAP) as StatusType[]).map((status) => {
                const config = STATUS_MAP[status];
                return (
                  <div
                    key={status}
                    className="flex items-center justify-between p-2.5 rounded-button bg-[#1C2024]"
                  >
                    <StatusBadge status={status} pulse={status === 'CRITICAL' || status === 'HIGH'} />
                    <div className="flex items-center gap-1.5 text-right">
                      <span className="font-mono text-xs font-semibold text-[#55DC99]">
                        {config.contrastRatio}
                      </span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#55DC99]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Dots */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              StatusDot Variants (Inline Minimal Dot + Label)
            </h3>
            <div className="flex flex-wrap items-center gap-6 p-4 rounded-button bg-[#1C2024]">
              {(['SUCCESS', 'NOMINAL', 'INFO', 'LOW', 'WARN', 'MEDIUM', 'CRITICAL', 'HIGH', 'STOPPED'] as StatusType[]).map(
                (status) => (
                  <StatusDot key={status} status={status} pulse={status === 'CRITICAL'} />
                )
              )}
            </div>
          </div>

          {/* Pill Variants with contrast ratios */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              Pill Variants &amp; Contrast Ratios
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-2.5 rounded-button bg-[#1C2024]">
                <Pill variant="live" pulse>
                  LIVE
                </Pill>
                <span className="font-mono text-xs text-[#55DC99] font-semibold">6.95:1 (PASS)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-button bg-[#1C2024]">
                <Pill variant="confidence">
                  <span className="text-white/80">Confidence:</span>{' '}
                  <span className="text-[#55DC99] font-bold">92%</span>
                </Pill>
                <span className="font-mono text-xs text-[#55DC99] font-semibold">14.2:1 (PASS)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-button bg-[#1C2024]">
                <Pill variant="stub">STUB</Pill>
                <span className="font-mono text-xs text-[#55DC99] font-semibold">8.80:1 (PASS)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-button bg-[#1C2024]">
                <Pill variant="nominal">NOMINAL &bull; 100%</Pill>
                <span className="font-mono text-xs text-[#55DC99] font-semibold">6.09:1 (PASS)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-button bg-[#1C2024]">
                <Pill variant="warn">ELEVATED THERMAL</Pill>
                <span className="font-mono text-xs text-[#55DC99] font-semibold">8.30:1 (PASS)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-button bg-[#1C2024]">
                <Pill variant="critical">ACOUSTIC ANOMALY</Pill>
                <span className="font-mono text-xs text-[#55DC99] font-semibold">5.29:1 (PASS)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-button bg-[#1C2024]">
                <Pill variant="info">GPS RTK FIXED</Pill>
                <span className="font-mono text-xs text-[#55DC99] font-semibold">6.57:1 (PASS)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-button bg-[#1C2024]">
                <Pill variant="neutral">STATION 04</Pill>
                <span className="font-mono text-xs text-[#55DC99] font-semibold">8.80:1 (PASS)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-button bg-[#1C2024]">
                <Pill variant="outline">OFFLINE SIM</Pill>
                <span className="font-mono text-xs text-[#55DC99] font-semibold">11.5:1 (PASS)</span>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* ── Section 3: Panel Variants (With and Without Subtitle) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel
          title="Panel Variant: Title Only (Orbit Default)"
          actions={<Pill variant="neutral">DEFAULT</Pill>}
        >
          <div className="space-y-2">
            <p className="text-sm text-text-primary">
              Orbit panels eliminate the visible 1px border and differentiate purely through fill (charcoal `#23272B` on dark `#101214`).
            </p>
            <p className="text-xs text-text-secondary">
              Header consists of 18px semibold white title with divider beneath; right slot accommodates action buttons or status badges.
            </p>
          </div>
        </Panel>

        <Panel
          title="Panel Variant: With Subtitle"
          subtitle="Secondary metadata is rendered within the body block or optional subtitle header line"
          actions={<Pill variant="confidence">SUBTITLE ACTIVE</Pill>}
        >
          <div className="space-y-2">
            <p className="text-sm text-text-primary">
              When context requires secondary guidance, subtitles render as clean 12px secondary text beneath the main title without adding clutter.
            </p>
          </div>
        </Panel>
      </div>

      {/* ── Section 4: KPI Cards Row of 5 (Exact Accent Bars) ── */}
      <Panel
        title="4. KPI Cards (5 Ordered Accent Bars)"
        actions={<Pill variant="neutral">4PX BOTTOM BAR</Pill>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            label="Distance Traveled"
            value="123.04"
            unit="km"
            accent={1}
            change="+4.2%"
            changeType="positive"
            sublabel="Across 24 patrols"
          />
          <KpiCard
            label="Waypoints Visited"
            value="48"
            unit="/ 50"
            accent={2}
            change="96%"
            changeType="positive"
            sublabel="Current route target"
          />
          <KpiCard
            label="Patrol Speed"
            value="1.45"
            unit="m/s"
            accent={3}
            change="STEADY"
            changeType="neutral"
            sublabel="Nominal cruise velocity"
          />
          <KpiCard
            label="Battery Level"
            value="84"
            unit="%"
            accent={4}
            change="HEALTHY"
            changeType="positive"
            sublabel="Remaining run: 3.2 hrs"
          />
          <KpiCard
            label="Thermal Alerts"
            value="3"
            unit="events"
            accent={5}
            change="TRIAGE"
            changeType="negative"
            sublabel="Requires operator sign-off"
          />
        </div>
      </Panel>

      {/* ── Section 5: Data Table (All States: 6 Rows, Sorted, Selected, Loading, Empty) ── */}
      <Panel
        title="5. DataTable Component (Orbit Table Style)"
        actions={
          <div className="flex items-center gap-1.5 bg-[#1C2024] p-1 rounded-button">
            <button
              onClick={() => setTableState('normal')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-[6px] transition-colors cursor-pointer ${
                tableState === 'normal' ? 'bg-orbit-blue text-white' : 'text-text-secondary hover:text-white'
              }`}
            >
              6 Sample Rows
            </button>
            <button
              onClick={() => setTableState('loading')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-[6px] transition-colors cursor-pointer ${
                tableState === 'loading' ? 'bg-orbit-blue text-white' : 'text-text-secondary hover:text-white'
              }`}
            >
              Loading Skeletons
            </button>
            <button
              onClick={() => setTableState('empty')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-[6px] transition-colors cursor-pointer ${
                tableState === 'empty' ? 'bg-orbit-blue text-white' : 'text-text-secondary hover:text-white'
              }`}
            >
              Orbit Empty Pattern
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-text-muted px-1">
            <span>
              Selected Row ID:{' '}
              <span className="font-mono text-white font-semibold">{selectedRobotId || 'None'}</span>
            </span>
            <span>Click any row or use Tab + Enter to select</span>
          </div>

          <DataTable<RobotFleetRecord>
            columns={tableColumns}
            data={tableState === 'empty' ? [] : SAMPLE_ROBOTS}
            keyExtractor={(item) => item.id}
            selectedId={tableState === 'normal' ? selectedRobotId : undefined}
            onRowClick={(item) => setSelectedRobotId(item.id)}
            loading={tableState === 'loading'}
            loadingRowCount={5}
            emptyTitle="No Spot Robots In Service"
            emptyDescription="All robots are currently offline or docked for scheduled battery swaps."
            renderRowActions={(item) => (
              <div className="flex items-center justify-end gap-1">
                <IconButton
                  icon={<Eye className="w-3.5 h-3.5" />}
                  label={`Inspect ${item.name}`}
                  tooltip={`Live telemetry stream for ${item.name}`}
                  size="sm"
                  variant="ghost"
                />
                <IconButton
                  icon={<Download className="w-3.5 h-3.5" />}
                  label={`Download logs for ${item.name}`}
                  tooltip="Export inspection CSV"
                  size="sm"
                  variant="ghost"
                />
              </div>
            )}
          />
        </div>
      </Panel>

      {/* ── Section 6: Color Swatches & Tokens ── */}
      <Panel
        title="6. Color Palette Swatches"
        actions={<Pill variant="neutral">TOKENS IN TOKENS.TS</Pill>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            <ColorSwatch name="navy" hex={colors.navy} desc="TopBar (64px)" />
            <ColorSwatch name="orbitBlue" hex={colors.orbitBlue} desc="SubToolbar (48px)" />
            <ColorSwatch name="bg" hex={colors.bg} desc="Page Background" />
            <ColorSwatch name="panel" hex={colors.panel} desc="Charcoal Surface" />
            <ColorSwatch name="tableHeader" hex={colors.tableHeaderBg} desc="Table Header" />
            <ColorSwatch name="rowSelected" hex={colors.rowSelected} desc="Selected Row" />
          </div>
        </div>
      </Panel>

      {/* ── Section 7: Tooltips, Skeletons, & EmptyState ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="7. Tooltips & Skeletons">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-center">
              <Tooltip content="Tooltip positioned on top" position="top">
                <button className="px-3 py-1.5 text-xs font-semibold rounded-button bg-[#2A3036] text-white hover:bg-[#343B42]">
                  Top Tooltip
                </button>
              </Tooltip>
              <Tooltip content="Tooltip positioned on bottom" position="bottom">
                <button className="px-3 py-1.5 text-xs font-semibold rounded-button bg-[#2A3036] text-white hover:bg-[#343B42]">
                  Bottom Tooltip
                </button>
              </Tooltip>
              <Tooltip content="Tooltip positioned on left" position="left">
                <button className="px-3 py-1.5 text-xs font-semibold rounded-button bg-[#2A3036] text-white hover:bg-[#343B42]">
                  Left Tooltip
                </button>
              </Tooltip>
              <Tooltip content="Tooltip positioned on right" position="right">
                <button className="px-3 py-1.5 text-xs font-semibold rounded-button bg-[#2A3036] text-white hover:bg-[#343B42]">
                  Right Tooltip
                </button>
              </Tooltip>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton variant="circle" className="w-10 h-10" />
                <div className="space-y-2 flex-1">
                  <Skeleton variant="text" className="w-3/4" />
                  <Skeleton variant="text" className="w-1/2" />
                </div>
              </div>
              <Skeleton variant="rect" className="h-10 w-full" />
            </div>
          </div>
        </Panel>

        <Panel title="8. Orbit EmptyState (No Dashed Box)">
          <EmptyState
            icon={<Cpu className="w-6 h-6 text-orbit-blue" />}
            title="No Edge Computations Pending"
            description="The on-board Spot AI inference core is in nominal idle state awaiting the next thermal sweep."
            action={
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-button bg-orbit-blue hover:bg-orbit-blue/90 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <span>Trigger Manual Diagnostic</span>
              </button>
            }
          />
        </Panel>
      </div>
    </div>
  );
}

// ── Reusable Color Swatch Subcomponent ──
function ColorSwatch({
  name,
  hex,
  desc,
}: {
  name: string;
  hex: string;
  desc: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Click to copy ${hex}`}
      className="flex flex-col text-left rounded-button p-2 bg-[#1C2024] hover:bg-[#252A2E] transition-colors group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orbit-blue"
    >
      <div
        className="w-full h-10 rounded-[6px] mb-2 flex items-center justify-center font-mono text-xs font-semibold select-none text-white shadow-xs"
        style={{ backgroundColor: hex }}
      >
        {copied ? 'COPIED!' : hex}
      </div>
      <span className="text-xs font-semibold text-white group-hover:text-orbit-blue transition-colors truncate">
        {name}
      </span>
      <span className="text-[11px] text-text-muted truncate">{desc}</span>
    </button>
  );
}
