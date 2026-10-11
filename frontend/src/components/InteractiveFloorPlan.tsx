'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  MapContainer,
  SVGOverlay,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Layers,
  Radio,
  Thermometer,
  Activity,
  Zap,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { TriageAnomaly } from '@/lib/triageTypes';
import {
  ActionRecord,
  WaypointHeatMetrics,
  resolveWaypointHeat,
  computeAllWaypointsHeat,
  resolveWaypointFailureDetails,
  computeFleetFailureSummary,
  WaypointFailureDetails,
  FleetFailureSummary,
  formatActionTypeName,
  computeTooltipLayout,
  computePinnedPanelLayout,
  BoundingBox,
} from '@/lib/actionMode';
import { actionsFixture } from '@/lib/actionsFixture';

// ── Types ────────────────────────────────────────────────────────────────────

export type ActiveFloor = 'Floor 1' | 'Floor 2';

export type WaypointStatus = 'nominal' | 'warning' | 'critical' | 'info';

export type OverlayMode = 'pathfinding' | 'action';

export interface FloorWaypoint {
  id: string; // e.g. 'WP01'
  floor: 1 | 2;
  coords: [number, number]; // [lat, lng] -> [800 - svgY, svgX]
  status: WaypointStatus;
  name: string;
  assetId: string;
  zone: string;
  temperature?: string;
  vibration?: string;
  batteryPct?: number;
  description: string;
}

export interface InteractiveFloorPlanProps {
  className?: string;
  style?: React.CSSProperties;
  initialFloor?: ActiveFloor;
  selectedIssueId?: string | null;
  onSelectIssueId?: (id: string | null) => void;
  selectedWaypointId?: string | null;
  onSelectWaypointId?: (id: string | null) => void;
  onSelectWaypoint?: (wp: FloorWaypoint | null) => void;
  anomalies?: TriageAnomaly[];
  actions?: ActionRecord[];
  overlayMode?: OverlayMode;
  onOverlayModeChange?: (mode: OverlayMode) => void;
  onNodeSelect?: (nodeId: string, payload?: any) => void;
}

// ── Waypoint Data Definitions (Clean Nominal Baseline) ───────────────────────

export const FLOOR_WAYPOINTS: FloorWaypoint[] = [
  // ── Floor 1 Waypoints ──────────────────────────────────────────────────────
  {
    id: 'WP01',
    floor: 1,
    coords: [95, 155], // [lat, lng] -> svgX=155, svgY=705
    status: 'nominal',
    name: 'Primary Ingress / Loading Dock',
    assetId: 'DOCK-BAY-01',
    zone: 'DOCK 01 // STAGING',
    temperature: '24.2 °C',
    vibration: '0.04 mm/s',
    batteryPct: 98,
    description: 'Vehicle loading dock entrance and material staging bay.',
  },
  {
    id: 'WP02',
    floor: 1,
    coords: [325, 140], // [lat, lng] -> svgX=140, svgY=475
    status: 'nominal',
    name: 'UPS & Battery Switchgear Bay',
    assetId: 'UPS-RACK-102',
    zone: 'UPS / BATTERY BAY',
    temperature: '38.6 °C',
    vibration: '0.12 mm/s',
    batteryPct: 94,
    description: 'Backup battery rack and emergency uninterruptible power feed.',
  },
  {
    id: 'WP03',
    floor: 1,
    coords: [355, 325], // [lat, lng] -> svgX=325, svgY=445
    status: 'nominal',
    name: 'Primary Water Pump & Tank Skid',
    assetId: 'PUMP-SKID-201',
    zone: 'HYDRAULIC PUMP SKID',
    temperature: '22.0 °C',
    vibration: '0.08 mm/s',
    batteryPct: 91,
    description: 'Twin cyan pressurization tanks and primary water manifold.',
  },
  {
    id: 'WP04',
    floor: 1,
    coords: [590, 255], // [lat, lng] -> svgX=255, svgY=210
    status: 'nominal',
    name: 'Industrial Reactor / Boilers',
    assetId: 'BOILER-UNIT-01',
    zone: 'BOILER / REACTOR 01',
    temperature: '84.5 °C',
    vibration: '0.15 mm/s',
    batteryPct: 86,
    description: 'Twin high-pressure thermal reaction vessels with telemetry sensors.',
  },
  {
    id: 'WP05',
    floor: 1,
    coords: [385, 725], // [lat, lng] -> svgX=725, svgY=415
    status: 'nominal',
    name: 'Main Steam Pipeline & Gantry',
    assetId: 'STM-PIPE-201',
    zone: 'MAIN STEAM GANTRY // CATWALK',
    temperature: '118.4 °C',
    vibration: '1.42 mm/s',
    batteryPct: 82,
    description: 'High-pressure steam bypass pipeline and central maintenance catwalk.',
  },
  {
    id: 'WP06',
    floor: 1,
    coords: [590, 880], // [lat, lng] -> svgX=880, svgY=210
    status: 'nominal',
    name: 'Steam Turbine Generator Hall',
    assetId: 'TURB-GEN-01',
    zone: 'STEAM TURBINE GEN-01',
    temperature: '62.1 °C',
    vibration: '0.22 mm/s',
    batteryPct: 78,
    description: 'Heavy turbine generator unit and condenser feed manifold.',
  },
  {
    id: 'WP07',
    floor: 1,
    coords: [370, 1065], // [lat, lng] -> svgX=1065, svgY=430
    status: 'nominal',
    name: 'East Service & Control Gallery',
    assetId: 'CTRL-PNL-107',
    zone: 'EAST SERVICE CORRIDOR',
    temperature: '26.8 °C',
    vibration: '0.05 mm/s',
    batteryPct: 74,
    description: 'Wall-mounted breaker panels and auxiliary electrical switches.',
  },
  {
    id: 'WP08',
    floor: 1,
    coords: [135, 555], // [lat, lng] -> svgX=555, svgY=665
    status: 'nominal',
    name: 'Aux Feedwater Vessel & Pump Skid',
    assetId: 'FW-VESSEL-08',
    zone: 'AUX FEEDWATER PUMP',
    temperature: '31.4 °C',
    vibration: '0.09 mm/s',
    batteryPct: 70,
    description: 'Horizontal blue cylindrical vessel with centrifugal motor feed.',
  },
  {
    id: 'WP09',
    floor: 1,
    coords: [135, 870], // [lat, lng] -> svgX=870, svgY=665
    status: 'nominal',
    name: 'High-Pressure Gas Compressor',
    assetId: 'COMP-BAY-02',
    zone: 'GAS COMPRESSOR B-02',
    temperature: '48.9 °C',
    vibration: '0.31 mm/s',
    batteryPct: 65,
    description: 'Horizontal cylindrical gas compressor unit and loop piping.',
  },
  {
    id: 'WP10',
    floor: 1,
    coords: [125, 1060], // [lat, lng] -> svgX=1060, svgY=675
    status: 'nominal',
    name: 'Water Treatment & Filter Skid',
    assetId: 'FILT-SKID-10',
    zone: 'WATER TREATMENT SKID',
    temperature: '19.8 °C',
    vibration: '0.04 mm/s',
    batteryPct: 62,
    description: 'Vertical filtration tubes and backwash manifold valves.',
  },

  // ── Floor 2 Waypoints ──────────────────────────────────────────────────────
  {
    id: 'WP11',
    floor: 2,
    coords: [540, 370], // [lat, lng] -> svgX=370, svgY=260
    status: 'nominal',
    name: 'HV Battery Array & Inverters',
    assetId: 'BATT-DECK-2A',
    zone: 'HV BATTERY ARRAY 2A',
    temperature: '36.2 °C',
    vibration: '0.11 mm/s',
    batteryPct: 58,
    description: 'High-voltage battery cabinets with boundary safety lines.',
  },
  {
    id: 'WP12',
    floor: 2,
    coords: [540, 830], // [lat, lng] -> svgX=830, svgY=260
    status: 'nominal',
    name: 'Vertical Condenser Skid & Columns',
    assetId: 'COND-COL-02',
    zone: 'VERTICAL CONDENSER SKID',
    temperature: '23.4 °C',
    vibration: '0.06 mm/s',
    batteryPct: 55,
    description: 'Twin vertical heat exchanger pipes and condenser vessel.',
  },
  {
    id: 'WP13',
    floor: 2,
    coords: [260, 370], // [lat, lng] -> svgX=370, svgY=540
    status: 'nominal',
    name: 'Material Logistics & Spares',
    assetId: 'STG-BAY-13',
    zone: 'MATERIAL LOGISTICS',
    temperature: '21.5 °C',
    vibration: '0.02 mm/s',
    batteryPct: 52,
    description: 'Spare parts inventory, crates, and pallet staging.',
  },
  {
    id: 'WP14',
    floor: 2,
    coords: [260, 830], // [lat, lng] -> svgX=830, svgY=540
    status: 'nominal',
    name: 'Auxiliary Turbine & Gen 2',
    assetId: 'SEC-TURB-14',
    zone: 'AUXILIARY TURBINE // GEN 2',
    temperature: '54.7 °C',
    vibration: '0.18 mm/s',
    batteryPct: 48,
    description: 'Auxiliary power generation unit with vibration monitoring.',
  },
  {
    id: 'WP15',
    floor: 2,
    coords: [95, 600], // [lat, lng] -> svgX=600, svgY=705
    status: 'nominal',
    name: 'Mezzanine Crane & Hoist Deck',
    assetId: 'MEZZ-DOCK-15',
    zone: 'MEZZANINE CRANE & HOIST DECK',
    temperature: '22.0 °C',
    vibration: '0.03 mm/s',
    batteryPct: 45,
    description: 'Overhead crane staging deck with yellow hazard boundary markings.',
  },
];

// ── Refined Floor 1 Patrol Route (Aligned with Lowered Pins) ─────────────────

const FLOOR1_PATROL_SVG = `
  M 155 705 
  L 260 705 
  L 260 472 
  L 140 472 
  L 140 478 
  L 260 478 
  L 260 445 
  L 325 445 
  L 325 270 
  L 325 255 
  L 235 255 
  L 252 210 
  L 258 210 
  L 235 255 
  L 440 255 
  L 460 415 
  L 725 415 
  L 990 415 
  L 1005 255 
  L 877 255 
  L 877 210 
  L 883 210 
  L 883 255 
  L 1010 270 
  L 1065 270 
  L 1065 430 
  L 1065 465 
  L 1010 465 
  L 555 465 
  L 555 665 
  L 670 665 
  L 760 665 
  L 870 665 
  L 980 665 
  L 1000 665 
  L 1060 675 
  L 1000 465 
  L 715 465 
  L 715 600
`;

// ── Refined Floor 2 Patrol Route (Aligned with Lowered Pins) ─────────────────

const FLOOR2_PATROL_SVG = `
  M 600 560 
  L 600 630 
  L 600 705 
  L 600 630 
  L 370 630 
  L 370 540 
  L 370 335 
  L 370 260 
  L 375 260 
  L 375 335 
  L 375 630 
  L 830 630 
  L 830 540 
  L 830 335 
  L 830 260
`;

// ── Custom Leaflet DivIcon Builder (With Radar Blip Mount Animation) ─────────

function createBlueprintPin(
  wp: FloorWaypoint,
  isSelected: boolean,
  mode: OverlayMode = 'pathfinding',
  heat?: WaypointHeatMetrics
) {
  if (typeof window === 'undefined') return undefined;

  if (mode === 'action' && heat) {
    const isFailing = heat.isFailing;
    const color = heat.color;
    const radius = heat.glowRadius;
    const opacity = heat.glowOpacity;

    // Anchor at exact center: iconSize is [40, 40], iconAnchor is [20, 20]
    const html = `
      <div class="action-heatmap-pin-wrapper" style="
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: visible;
      ">
        <style>
          .action-heatmap-pin-wrapper {
            overflow: visible !important;
          }
          @keyframes heatmap-halo-breathe {
            0% { transform: scale(0.94); opacity: ${Math.max(0.25, opacity * 0.85)}; }
            100% { transform: scale(1.06); opacity: ${opacity}; }
          }
          @keyframes heatmap-core-pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.18); }
            100% { transform: scale(1); }
          }
        </style>

        <!-- Soft Radial Glow / Blurred Gradient (Additive / Screen Blended) -->
        <div style="
          position: absolute;
          left: ${20 - radius}px;
          top: ${20 - radius}px;
          width: ${radius * 2}px;
          height: ${radius * 2}px;
          border-radius: 9999px;
          background: radial-gradient(circle, ${heat.glowRgba} 0%, ${color}55 35%, ${color}20 60%, transparent 75%);
          mix-blend-mode: screen;
          filter: blur(8px);
          pointer-events: none;
          z-index: 1;
          ${isFailing ? 'animation: heatmap-halo-breathe 2.4s ease-in-out infinite alternate;' : ''}
        "></div>

        ${
          isFailing
            ? `
        <!-- Outer diffuse glow for adjacent hot node blending -->
        <div style="
          position: absolute;
          left: ${20 - Math.round(radius * 1.35)}px;
          top: ${20 - Math.round(radius * 1.35)}px;
          width: ${Math.round(radius * 2.7)}px;
          height: ${Math.round(radius * 2.7)}px;
          border-radius: 9999px;
          background: radial-gradient(circle, ${heat.glowRgba} 0%, transparent 65%);
          mix-blend-mode: screen;
          filter: blur(14px);
          pointer-events: none;
          opacity: 0.6;
          z-index: 0;
        "></div>
        `
            : ''
        }

        <!-- Small Solid Core Marker (Clickable & Identifiable) -->
        <div style="
          position: relative;
          z-index: 10;
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background-color: ${color};
          border: 2px solid ${isFailing ? '#ffffff' : '#a7f3d0'};
          box-shadow: 0 0 10px ${color}, inset 0 0 3px rgba(0, 0, 0, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          ${isSelected ? 'transform: scale(1.4); box-shadow: 0 0 20px #ffffff;' : ''}
          ${isFailing && heat.heatScore > 0.4 ? 'animation: heatmap-core-pulse 2s ease-in-out infinite;' : ''}
        ">
          <span style="width: 4px; height: 4px; border-radius: 9999px; background-color: #071b33;"></span>
        </div>

        <!-- Waypoint ID Pill Label -->
        <div style="
          position: absolute;
          top: 26px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 12;
          padding: 1px 4px;
          border-radius: 4px;
          background-color: rgba(7, 27, 51, 0.95);
          border: 1px solid ${color};
          color: #ffffff;
          font-family: ui-monospace, monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.04em;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
          pointer-events: none;
        ">
          ${wp.id}${isFailing ? ` · ${heat.failedCount}F` : ''}
        </div>
      </div>
    `;

    return L.divIcon({
      className: 'heatmap-waypoint-pin',
      html,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });
  }

  let isCritical = wp.status === 'critical';
  let isWarning = wp.status === 'warning';
  let isNominal = wp.status === 'nominal';

  let color = '#38bdf8'; // Electric blue default
  let glow = 'rgba(56, 189, 248, 0.6)';

  if (isCritical) {
    color = '#ef4444';
    glow = 'rgba(239, 68, 68, 0.9)';
  } else if (isWarning) {
    color = '#f59e0b';
    glow = 'rgba(245, 158, 11, 0.8)';
  } else if (isNominal) {
    color = '#10b981';
    glow = 'rgba(16, 185, 129, 0.8)';
  }

  // Exact anchor positioning: iconSize is [32, 42], iconAnchor is [16, 42].
  const html = `
    <div class="blueprint-pin-wrapper" style="
      position: relative;
      width: 32px;
      height: 42px;
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: radar-blip-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    ">
      <style>
        @keyframes radar-blip-pop {
          0% { transform: scale(0.2); opacity: 0; }
          65% { transform: scale(1.15); opacity: 1; }
          85% { transform: scale(0.95); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes radar-blip-ripple {
          0% { transform: scale(0.2); opacity: 0.95; }
          60% { transform: scale(2.0); opacity: 0.4; }
          100% { transform: scale(2.8); opacity: 0; }
        }
      </style>

      <!-- One-time Mount Radar Ripple Ring (Radar Blip Activating) -->
      <span style="
        position: absolute;
        top: -6px;
        left: -6px;
        width: 44px;
        height: 44px;
        border-radius: 9999px;
        border: 2px solid ${color};
        background: radial-gradient(circle, ${glow} 0%, transparent 70%);
        pointer-events: none;
        animation: radar-blip-ripple 0.9s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
      "></span>

      ${
        isCritical
          ? `
        <!-- Continuous Radar Ping Pulse for Critical Waypoint -->
        <span class="animate-ping" style="position: absolute; top: -6px; left: -6px; width: 44px; height: 44px; border-radius: 9999px; background-color: rgba(239, 68, 68, 0.55); pointer-events: none;"></span>
        <span class="animate-pulse" style="position: absolute; top: 0px; left: 0px; width: 32px; height: 32px; border-radius: 9999px; background-color: rgba(239, 68, 68, 0.35); pointer-events: none;"></span>
      `
          : ''
      }

      <!-- Pin Head with Waypoint Glow -->
      <div style="
        position: relative;
        z-index: 10;
        width: 24px;
        height: 24px;
        border-radius: 9999px;
        background-color: ${color};
        border: 2px solid #ffffff;
        box-shadow: 0 0 16px ${glow};
        display: flex;
        align-items: center;
        justify-content: center;
        ${isSelected ? 'transform: scale(1.2); box-shadow: 0 0 24px #ffffff;' : ''}
      ">
        <span style="width: 8px; height: 8px; border-radius: 9999px; background-color: #0c2340;"></span>
      </div>

      <!-- Pin Tip Triangle pointing down to exact coord -->
      <div style="
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 6px solid ${color};
        margin-top: -1px;
        z-index: 9;
      "></div>

      <!-- Waypoint ID Pill Label -->
      <div style="
        margin-top: 2px;
        padding: 1px 4px;
        border-radius: 4px;
        background-color: rgba(12, 35, 64, 0.95);
        border: 1px solid ${color};
        color: #ffffff;
        font-family: ui-monospace, monospace;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.05em;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
      ">
        ${wp.id}
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'blueprint-floor-plan-pin',
    html,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });
}

// ── Map Controller: Cinematic FlyTo on Waypoint Select & Click-Off Dismissal ──

function MapInteractionController({
  activeFloor,
  selectedWp,
  selectedIssueId,
  onDismiss,
}: {
  activeFloor: ActiveFloor;
  selectedWp: FloorWaypoint | null;
  selectedIssueId?: string | null;
  onDismiss: () => void;
}) {
  const map = useMap();
  const prevSelectedRef = useRef<string | null>(null);

  // Click-Off Dismissal: listen for background canvas clicks
  useMapEvents({
    click: () => {
      onDismiss();
    },
  });

  const defaultBounds: [[number, number], [number, number]] = useMemo(() => {
    return activeFloor === 'Floor 1'
      ? [
          [0, 0],
          [800, 1200],
        ]
      : [
          [50, 180],
          [750, 1020],
        ];
  }, [activeFloor]);

  // Cinematic FlyTo when a waypoint or issue is selected, and smooth reset on dismiss
  useEffect(() => {
    if (selectedIssueId || selectedWp) {
      if (selectedWp) {
        prevSelectedRef.current = selectedIssueId || selectedWp.id;
        map.flyTo(selectedWp.coords, 0.8, {
          animate: true,
          duration: 1.2,
        });
      }
    } else {
      // Zoom out / Reset bounds on dismiss
      if (prevSelectedRef.current !== null) {
        prevSelectedRef.current = null;
        map.setView([400, 600], 0, {
          animate: true,
          duration: 1.2,
        });
      }
    }
  }, [selectedIssueId, selectedWp, map]);

  // Re-fit floor bounds when activeFloor changes without an active selection
  useEffect(() => {
    if (!selectedIssueId && !selectedWp) {
      map.fitBounds(defaultBounds, { padding: [6, 6], duration: 0.8 });
    }
  }, [activeFloor, defaultBounds, selectedIssueId, selectedWp, map]);

  return null;
}

// ── Action Mode Map Position Controller: tracks container coordinates for hovered & selected markers ──

function ActionMapPositionController({
  hoveredWpId,
  waypoints,
  onHoverPosChange,
}: {
  hoveredWpId: string | null;
  waypoints: FloorWaypoint[];
  onHoverPosChange: (pos: { x: number; y: number } | null) => void;
}) {
  const map = useMap();

  const updatePositions = useCallback(() => {
    if (hoveredWpId) {
      const hWp = waypoints.find((w) => w.id === hoveredWpId);
      if (hWp) {
        const pt = map.latLngToContainerPoint(hWp.coords);
        onHoverPosChange({ x: pt.x, y: pt.y });
      } else {
        onHoverPosChange(null);
      }
    } else {
      onHoverPosChange(null);
    }
  }, [hoveredWpId, waypoints, map, onHoverPosChange]);

  useEffect(() => {
    updatePositions();
  }, [updatePositions]);

  useMapEvents({
    move: updatePositions,
    zoom: updatePositions,
    resize: updatePositions,
  });

  return null;
}

// ── Floor 1 Architectural CAD Blueprint SVG (High Visibility + Wall Cutouts) ─

function Floor1BlueprintOverlay({ showRoute }: { showRoute: boolean }) {
  return (
    <SVGOverlay
      attributes={{
        viewBox: '0 0 1200 800',
        preserveAspectRatio: 'xMidYMid meet',
      }}
      bounds={[
        [0, 0],
        [800, 1200],
      ]}
    >
      <defs>
        {/* CAD Grid Pattern */}
        <pattern id="cad-grid-f1" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1d4373" strokeWidth="0.8" />
        </pattern>

        {/* Critical Expansion Joint Heat Pulse */}
        <radialGradient id="anomaly-radar-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#ef4444" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ── 1. Brighter Blueprint Base Background ── */}
      <rect x="0" y="0" width="1200" height="800" fill="#0c2340" />
      <rect x="0" y="0" width="1200" height="800" fill="url(#cad-grid-f1)" opacity="0.75" />

      {/* ── 2. CAD Column Reference Axes & Bubbles ── */}
      <line x1="40" y1="155" x2="1160" y2="155" stroke="#25538f" strokeWidth="1.2" strokeDasharray="6 8" />
      <line x1="40" y1="365" x2="1160" y2="365" stroke="#25538f" strokeWidth="1.2" strokeDasharray="6 8" />
      <line x1="40" y1="605" x2="1160" y2="605" stroke="#25538f" strokeWidth="1.2" strokeDasharray="6 8" />

      <line x1="255" y1="30" x2="255" y2="770" stroke="#25538f" strokeWidth="1.2" strokeDasharray="6 8" />
      <line x1="555" y1="30" x2="555" y2="770" stroke="#25538f" strokeWidth="1.2" strokeDasharray="6 8" />
      <line x1="725" y1="30" x2="725" y2="770" stroke="#25538f" strokeWidth="1.2" strokeDasharray="6 8" />
      <line x1="880" y1="30" x2="880" y2="770" stroke="#25538f" strokeWidth="1.2" strokeDasharray="6 8" />

      {/* Column Axis Callout Bubbles */}
      <g>
        <circle cx="255" cy="40" r="13" fill="#123561" stroke="#38bdf8" strokeWidth="1.5" />
        <text x="255" y="44" fill="#e0f2fe" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">1A</text>

        <circle cx="555" cy="40" r="13" fill="#123561" stroke="#38bdf8" strokeWidth="1.5" />
        <text x="555" y="44" fill="#e0f2fe" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">1B</text>

        <circle cx="725" cy="40" r="13" fill="#123561" stroke="#38bdf8" strokeWidth="1.5" />
        <text x="725" y="44" fill="#e0f2fe" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">1C</text>

        <circle cx="880" cy="40" r="13" fill="#123561" stroke="#38bdf8" strokeWidth="1.5" />
        <text x="880" y="44" fill="#e0f2fe" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">1D</text>

        <circle cx="50" cy="155" r="13" fill="#123561" stroke="#38bdf8" strokeWidth="1.5" />
        <text x="50" y="159" fill="#e0f2fe" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">N</text>

        <circle cx="50" cy="365" r="13" fill="#123561" stroke="#38bdf8" strokeWidth="1.5" />
        <text x="50" y="369" fill="#e0f2fe" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">M</text>

        <circle cx="50" cy="605" r="13" fill="#123561" stroke="#38bdf8" strokeWidth="1.5" />
        <text x="50" y="609" fill="#e0f2fe" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">S</text>
      </g>

      {/* ── 3. High-Contrast Outer Foundation Walls ── */}
      <rect
        x="70"
        y="60"
        width="1060"
        height="680"
        fill="#122f54"
        stroke="#7dd3fc"
        strokeWidth="4"
        rx="2"
      />

      {/* ── 4. Architectural Rooms with Physical Door Cutouts/Gaps in SVG Walls ── */}

      {/* Room 1: Boiler / Reactor Cell (WP04) with doorway opening at x=215..255 */}
      <g id="room-wp04">
        <rect x="80" y="70" width="350" height="170" fill="#163964" />
        <path
          d="M 255 240 L 430 240 L 430 70 L 80 70 L 80 240 L 215 240"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
        />
        <circle cx="190" cy="155" r="38" fill="none" stroke="#7dd3fc" strokeWidth="2.5" strokeDasharray="6 3" />
        <circle cx="190" cy="155" r="14" fill="#1b467a" stroke="#bae6fd" strokeWidth="2" />
        <circle cx="320" cy="155" r="38" fill="none" stroke="#7dd3fc" strokeWidth="2.5" strokeDasharray="6 3" />
        <circle cx="320" cy="155" r="14" fill="#1b467a" stroke="#bae6fd" strokeWidth="2" />
        {/* Door Swing Arc inside cutout */}
        <path d="M 215 240 A 25 25 0 0 1 240 215" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="215" y1="240" x2="240" y2="215" stroke="#7dd3fc" strokeWidth="2" />
        {/* Room Header Label (Safely above WP04) */}
        <text x="95" y="86" fill="#ffffff" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight="700" letterSpacing="0.08em">
          BOILER / REACTOR 01
        </text>
      </g>

      {/* Room 2: North Utility & HVAC with doorway opening at x=515..555 */}
      <g id="room-utility">
        <rect x="460" y="70" width="150" height="170" fill="#14345c" />
        <path
          d="M 555 240 L 610 240 L 610 70 L 460 70 L 460 240 L 515 240"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.5"
        />
        <path d="M 515 240 A 22 22 0 0 1 537 218" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="515" y1="240" x2="537" y2="218" stroke="#7dd3fc" strokeWidth="2" />
        <text x="475" y="86" fill="#e0f2fe" fontSize="11" fontFamily="ui-monospace, monospace" fontWeight="600" letterSpacing="0.08em">
          HVAC / UTILITY
        </text>
      </g>

      {/* Stairwell N-1 with bottom portal opening */}
      <g id="stairs-north">
        <rect x="630" y="70" width="70" height="170" fill="#0f294a" />
        <path
          d="M 685 240 L 700 240 L 700 70 L 630 70 L 630 240 L 645 240"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.5"
        />
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`stair-n-${i}`} x1="632" y1={85 + i * 15} x2="698" y2={85 + i * 15} stroke="#38bdf8" strokeWidth="1.5" opacity="0.8" />
        ))}
        <text x="638" y="86" fill="#bae6fd" fontSize="9.5" fontFamily="ui-monospace, monospace" fontWeight="bold">
          STAIRS N-1
        </text>
      </g>

      {/* Room 3: Turbine Generator Hall (WP06) with doorway opening at x=860..900 */}
      <g id="room-wp06">
        <rect x="720" y="70" width="320" height="170" fill="#163964" />
        <path
          d="M 900 240 L 1040 240 L 1040 70 L 720 70 L 720 240 L 860 240"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
        />
        <rect x="770" y="115" width="220" height="80" rx="10" fill="#1d487d" stroke="#7dd3fc" strokeWidth="2.5" />
        <line x1="770" y1="155" x2="990" y2="155" stroke="#bae6fd" strokeWidth="2" strokeDasharray="5 5" />
        <path d="M 860 240 A 25 25 0 0 1 885 215" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="860" y1="240" x2="885" y2="215" stroke="#7dd3fc" strokeWidth="2" />
        {/* Room Header Label (Safely above WP06) */}
        <text x="735" y="86" fill="#ffffff" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight="700" letterSpacing="0.08em">
          STEAM TURBINE GEN-01
        </text>
      </g>

      {/* Room 4: Hydraulic Pump Skid (WP03) with doorways at north and east */}
      <g id="room-wp03">
        <rect x="220" y="270" width="210" height="210" fill="#163964" />
        <path
          d="M 345 270 L 430 270 L 430 355 M 430 395 L 430 480 L 220 480 L 220 270 L 305 270"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
        />
        <circle cx="280" cy="350" r="30" fill="none" stroke="#34d399" strokeWidth="2.5" />
        <circle cx="370" cy="350" r="28" fill="none" stroke="#34d399" strokeWidth="2.5" />
        <path d="M 250 420 L 325 420 L 325 350 L 400 350" fill="none" stroke="#10b981" strokeWidth="3" />
        <path d="M 305 270 A 25 25 0 0 0 330 295" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="305" y1="270" x2="330" y2="295" stroke="#7dd3fc" strokeWidth="2" />
        {/* Room Header Label (Safely above WP03) */}
        <text x="235" y="288" fill="#a7f3d0" fontSize="11.5" fontFamily="ui-monospace, monospace" fontWeight="700" letterSpacing="0.08em">
          HYDRAULIC PUMP SKID
        </text>
      </g>

      {/* Room 5: Battery & UPS Room (WP02) with doorway opening at east wall x=200, y=345..385 */}
      <g id="room-wp02">
        <rect x="80" y="300" width="120" height="270" fill="#163964" />
        <path
          d="M 200 345 L 200 300 L 80 300 L 80 570 L 200 570 L 200 385"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
        />
        {[0, 1, 2, 3].map((row) => (
          <g key={`ups-cad-${row}`}>
            <rect x="95" y={335 + row * 55} width="40" height="35" fill="#1a4577" stroke="#fbbf24" strokeWidth="2" />
            <rect x="145" y={335 + row * 55} width="40" height="35" fill="#1a4577" stroke="#fbbf24" strokeWidth="2" />
          </g>
        ))}
        <path d="M 200 345 A 25 25 0 0 1 175 370" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="200" y1="345" x2="175" y2="370" stroke="#7dd3fc" strokeWidth="2" />
        {/* Room Header Label (Safely above WP02) */}
        <text x="90" y="316" fill="#fde68a" fontSize="11" fontFamily="ui-monospace, monospace" fontWeight="700" letterSpacing="0.08em">
          UPS / BATTERY BAY
        </text>
      </g>

      {/* Central Gantry & Main Pipeline (WP05 - CRITICAL ANOMALY) */}
      <g id="room-wp05">
        <rect x="460" y="265" width="530" height="200" fill="#122f54" />
        <path
          d="M 460 345 L 460 265 L 990 265 L 990 345 M 990 385 L 990 465 L 460 465 L 460 385"
          fill="none"
          stroke="#facc15"
          strokeWidth="2.5"
          strokeDasharray="8 4"
        />
        <line x1="470" y1="330" x2="980" y2="330" stroke="#7dd3fc" strokeWidth="3.5" />
        <line x1="470" y1="365" x2="980" y2="365" stroke="#7dd3fc" strokeWidth="3.5" />
        <line x1="470" y1="400" x2="980" y2="400" stroke="#7dd3fc" strokeWidth="3.5" />

        {/* Critical Expansion Joint Hotspot & Warning Badge */}
        <rect x="670" y="342" width="110" height="26" fill="#991b1b" stroke="#ef4444" strokeWidth="2.5" />
        <text x="678" y="359" fill="#fee2e2" fontSize="10.5" fontFamily="ui-monospace, monospace" fontWeight="bold">
          ! EXPANSION JT !
        </text>
        <circle cx="725" cy="415" r="44" fill="url(#anomaly-radar-glow)" />

        {/* Header Label (Safely above WP05) */}
        <text x="475" y="282" fill="#fde047" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight="700" letterSpacing="0.08em">
          MAIN STEAM GANTRY // CATWALK
        </text>
      </g>

      {/* Room 7: East Service Corridor (WP07) */}
      <g id="room-wp07">
        <rect x="1010" y="240" width="110" height="250" fill="#163964" />
        <path
          d="M 1010 250 L 1010 240 L 1120 240 L 1120 490 L 1010 490 L 1010 480 M 1010 440 L 1010 290"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
        />
        {[0, 1, 2, 3].map((i) => (
          <rect key={`pnl-cad-${i}`} x="1065" y={270 + i * 50} width="40" height="30" fill="#1b4578" stroke="#7dd3fc" strokeWidth="1.8" />
        ))}
        {/* Header Label (Safely above WP07) */}
        <text x="1018" y="254" fill="#e0f2fe" fontSize="10" fontFamily="ui-monospace, monospace" fontWeight="700" letterSpacing="0.08em">
          EAST SERVICE CORRIDOR
        </text>
      </g>

      {/* Room 8: Loading Dock Ingress (WP01) */}
      <g id="room-wp01">
        <rect x="80" y="600" width="150" height="130" fill="#163964" />
        <path
          d="M 230 645 L 230 600 L 80 600 L 80 730 L 230 730 L 230 685"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
        />
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={`dock-cad-${i}`}
            x1={85 + i * 18}
            y1="720"
            x2={115 + i * 18}
            y2="660"
            stroke="#facc15"
            strokeWidth="2.5"
            opacity="0.9"
          />
        ))}
        <path d="M 230 645 A 25 25 0 0 1 205 670" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="230" y1="645" x2="205" y2="670" stroke="#7dd3fc" strokeWidth="2" />
        {/* Header Label (Safely above WP01) */}
        <text x="95" y="616" fill="#fde68a" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight="700" letterSpacing="0.08em">
          DOCK 01 // STAGING
        </text>
      </g>

      {/* Central Garden / Courtyard */}
      <g id="courtyard">
        <rect x="250" y="600" width="170" height="130" fill="#0c2545" stroke="#25538f" strokeWidth="2" />
        <text x="295" y="670" fill="#7dd3fc" fontSize="11" fontFamily="ui-monospace, monospace" fontWeight="bold" opacity="0.8">
          COURTYARD
        </text>
      </g>

      {/* Room 9: Aux Feedwater Pump Skid (WP08) */}
      <g id="room-wp08">
        <rect x="440" y="490" width="230" height="230" fill="#163964" />
        <path
          d="M 535 490 L 440 490 L 440 720 L 670 720 L 670 625 M 670 585 L 670 490 L 575 490"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
        />
        <rect x="475" y="525" width="160" height="50" rx="16" fill="#1d487d" stroke="#7dd3fc" strokeWidth="2.5" />
        <line x1="475" y1="550" x2="635" y2="550" stroke="#bae6fd" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d="M 535 490 A 25 25 0 0 0 560 515" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="535" y1="490" x2="560" y2="515" stroke="#7dd3fc" strokeWidth="2" />
        {/* Header Label (Safely above WP08) */}
        <text x="455" y="506" fill="#e0f2fe" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight="700" letterSpacing="0.08em">
          AUX FEEDWATER PUMP
        </text>
      </g>

      {/* Stairs S-1 with North Entrance Portal for Multi-Floor Handoff */}
      <g id="stairs-south">
        <rect x="685" y="540" width="60" height="180" fill="#0f294a" />
        <path
          d="M 745 540 L 745 720 L 685 720 L 685 540"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.5"
        />
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`stair-s-${i}`} x1="687" y1={555 + i * 15} x2="743" y2={555 + i * 15} stroke="#38bdf8" strokeWidth="1.5" opacity="0.8" />
        ))}
        <text x="692" y="525" fill="#bae6fd" fontSize="9.5" fontFamily="ui-monospace, monospace" fontWeight="bold">
          STAIRS S-1
        </text>
      </g>

      {/* Room 11: Gas Compressor Hall B (WP09) */}
      <g id="room-wp09">
        <rect x="760" y="490" width="220" height="230" fill="#163964" />
        <path
          d="M 850 490 L 760 490 L 760 720 L 980 720 L 980 625 M 980 585 L 980 490 L 890 490"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
        />
        <rect x="790" y="525" width="160" height="60" rx="20" fill="#1d487d" stroke="#7dd3fc" strokeWidth="2.5" />
        <circle cx="870" cy="555" r="18" fill="none" stroke="#bae6fd" strokeWidth="2" />
        <path d="M 850 490 A 25 25 0 0 0 875 515" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="850" y1="490" x2="875" y2="515" stroke="#7dd3fc" strokeWidth="2" />
        {/* Header Label (Safely above WP09) */}
        <text x="775" y="506" fill="#e0f2fe" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight="700" letterSpacing="0.08em">
          GAS COMPRESSOR B-02
        </text>
      </g>

      {/* Room 12: Water Treatment Skid (WP10) */}
      <g id="room-wp10">
        <rect x="1000" y="510" width="120" height="210" fill="#163964" />
        <path
          d="M 1000 585 L 1000 510 L 1120 510 L 1120 720 L 1000 720 L 1000 625"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
        />
        <line x1="1040" y1="535" x2="1040" y2="695" stroke="#34d399" strokeWidth="3.5" />
        <line x1="1080" y1="535" x2="1080" y2="695" stroke="#34d399" strokeWidth="3.5" />
        <path d="M 1000 585 A 25 25 0 0 1 1025 560" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="1000" y1="585" x2="1025" y2="560" stroke="#7dd3fc" strokeWidth="2" />
        {/* Header Label (Safely above WP10) */}
        <text x="1008" y="524" fill="#a7f3d0" fontSize="10" fontFamily="ui-monospace, monospace" fontWeight="700" letterSpacing="0.08em">
          WATER TREATMENT SKID
        </text>
      </g>

      {/* ── 5. SPOT Bot Hallway Patrol Route ── */}
      {showRoute && (
        <g id="spot-patrol-route-f1">
          <path
            d={FLOOR1_PATROL_SVG}
            fill="none"
            stroke="#00e5ff"
            strokeWidth="8"
            strokeOpacity="0.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={FLOOR1_PATROL_SVG}
            fill="none"
            stroke="#00f0ff"
            strokeWidth="3.5"
            strokeDasharray="10 8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </SVGOverlay>
  );
}

// ── Floor 2 Architectural CAD Blueprint SVG (High Visibility + Wall Cutouts) ─

function Floor2BlueprintOverlay({ showRoute }: { showRoute: boolean }) {
  return (
    <SVGOverlay
      attributes={{
        viewBox: '0 0 1200 800',
        preserveAspectRatio: 'xMidYMid meet',
      }}
      bounds={[
        [0, 0],
        [800, 1200],
      ]}
    >
      <defs>
        <pattern id="cad-grid-f2" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1d4373" strokeWidth="0.8" />
        </pattern>
      </defs>

      {/* Base Background */}
      <rect x="0" y="0" width="1200" height="800" fill="#0c2340" />
      <rect x="0" y="0" width="1200" height="800" fill="url(#cad-grid-f2)" opacity="0.75" />

      {/* Outer Concrete Boundary for Floor 2 */}
      <rect
        x="180"
        y="50"
        width="840"
        height="700"
        fill="#122f54"
        stroke="#7dd3fc"
        strokeWidth="4"
        rx="2"
      />

      {/* Central Stairwell Shaft (STAIRS C-2) - Closed Shaft */}
      <rect x="565" y="60" width="70" height="560" fill="#0f294a" stroke="#38bdf8" strokeWidth="2.5" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={`f2-stair-${i}`}
          x1="567"
          y1={75 + i * 22}
          x2="633"
          y2={75 + i * 22}
          stroke="#38bdf8"
          strokeWidth="1.5"
          opacity="0.8"
        />
      ))}
      <text x="575" y="76" fill="#bae6fd" fontSize="9.5" fontFamily="ui-monospace, monospace" fontWeight="bold">
        STAIRS C-2
      </text>

      {/* Room 1: HV Battery Array 2A (WP11) */}
      <g id="f2-room-wp11">
        <rect x="200" y="70" width="345" height="265" fill="#163964" />
        <path
          d="M 545 310 L 545 70 L 200 70 L 200 335 L 345 335 M 395 335 L 545 335 L 545 310"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
        />
        {[0, 1, 2, 3].map((col) => (
          <g key={`f2-b-${col}`}>
            <rect x={235 + col * 70} y="115" width="50" height="70" fill="#1a4577" stroke="#fbbf24" strokeWidth="2" />
            <rect x={235 + col * 70} y="210" width="50" height="70" fill="#1a4577" stroke="#fbbf24" strokeWidth="2" />
          </g>
        ))}
        <path d="M 395 335 A 25 25 0 0 1 370 360" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="395" y1="335" x2="370" y2="360" stroke="#7dd3fc" strokeWidth="2" />
        {/* Header Label (Safely above WP11) */}
        <text x="220" y="88" fill="#fde68a" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight="700" letterSpacing="0.08em">
          HV BATTERY ARRAY 2A
        </text>
      </g>

      {/* Room 2: Vertical Condenser Skid (WP12) */}
      <g id="f2-room-wp12">
        <rect x="655" y="70" width="345" height="265" fill="#163964" />
        <path
          d="M 655 310 L 655 70 L 1000 70 L 1000 335 L 855 335 M 805 335 L 655 335 L 655 310"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
        />
        <line x1="710" y1="95" x2="710" y2="305" stroke="#38bdf8" strokeWidth="5.5" />
        <line x1="755" y1="95" x2="755" y2="305" stroke="#38bdf8" strokeWidth="5.5" />
        <rect x="815" y="105" width="85" height="200" rx="14" fill="#1d487d" stroke="#7dd3fc" strokeWidth="2.5" />
        <path d="M 805 335 A 25 25 0 0 0 830 360" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="805" y1="335" x2="830" y2="360" stroke="#7dd3fc" strokeWidth="2" />
        {/* Header Label (Safely above WP12) */}
        <text x="675" y="88" fill="#e0f2fe" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight="700" letterSpacing="0.08em">
          VERTICAL CONDENSER SKID
        </text>
      </g>

      {/* Room 3: Material Logistics (WP13) */}
      <g id="f2-room-wp13">
        <rect x="200" y="360" width="345" height="250" fill="#163964" />
        <path
          d="M 345 360 L 200 360 L 200 610 L 345 610 M 395 610 L 545 610 L 545 360 L 395 360"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
        />
        {[0, 1].map((row) => (
          <g key={`pal-${row}`}>
            <rect x="250" y={410 + row * 85} width="75" height="65" fill="#1a4577" stroke="#f59e0b" strokeWidth="2" />
            <rect x="350" y={410 + row * 85} width="75" height="65" fill="#1a4577" stroke="#f59e0b" strokeWidth="2" />
          </g>
        ))}
        <path d="M 395 610 A 25 25 0 0 1 370 635" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="395" y1="610" x2="370" y2="635" stroke="#7dd3fc" strokeWidth="2" />
        {/* Header Label (Safely above WP13) */}
        <text x="220" y="378" fill="#fde68a" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight="700" letterSpacing="0.08em">
          MATERIAL LOGISTICS
        </text>
      </g>

      {/* Room 4: Auxiliary Turbine / Gen 2 (WP14) */}
      <g id="f2-room-wp14">
        <rect x="655" y="360" width="345" height="250" fill="#163964" />
        <path
          d="M 855 360 L 1000 360 L 1000 610 L 855 610 M 805 610 L 655 610 L 655 360 L 805 360"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
        />
        <rect x="715" y="415" width="200" height="120" rx="8" fill="#1d487d" stroke="#7dd3fc" strokeWidth="2.5" />
        <circle cx="780" cy="475" r="26" fill="none" stroke="#bae6fd" strokeWidth="2" />
        <path d="M 805 610 A 25 25 0 0 0 830 635" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="805" y1="610" x2="830" y2="635" stroke="#7dd3fc" strokeWidth="2" />
        {/* Header Label (Safely above WP14) */}
        <text x="675" y="378" fill="#e0f2fe" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight="700" letterSpacing="0.08em">
          AUXILIARY TURBINE // GEN 2
        </text>
      </g>

      {/* Mezzanine Crane Staging Deck (WP15) */}
      <g id="f2-room-wp15">
        <rect x="240" y="630" width="720" height="100" fill="#163964" />
        <path
          d="M 240 630 L 240 730 L 960 730 L 960 630 M 640 630 L 960 630 M 560 630 L 240 630"
          fill="none"
          stroke="#facc15"
          strokeWidth="2.5"
        />
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={`chev-${i}`}
            x1={280 + i * 55}
            y1="710"
            x2={310 + i * 55}
            y2="650"
            stroke="#facc15"
            strokeWidth="3"
            opacity="0.9"
          />
        ))}
        {/* Header Label (Safely left of WP15) */}
        <text x="260" y="646" fill="#fde68a" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight="700" letterSpacing="0.08em">
          MEZZANINE CRANE & HOIST DECK
        </text>
      </g>

      {/* ── SPOT Bot Patrol Route ── */}
      {showRoute && (
        <g id="spot-patrol-route-f2">
          <path
            d={FLOOR2_PATROL_SVG}
            fill="none"
            stroke="#00e5ff"
            strokeWidth="8"
            strokeOpacity="0.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={FLOOR2_PATROL_SVG}
            fill="none"
            stroke="#00f0ff"
            strokeWidth="3.5"
            strokeDasharray="10 8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </SVGOverlay>
  );
}

// ── Main Client Component ────────────────────────────────────────────────────

export default function InteractiveFloorPlan({
  className = '',
  style,
  initialFloor = 'Floor 1',
  selectedIssueId = null,
  onSelectIssueId,
  selectedWaypointId = null,
  onSelectWaypointId,
  onSelectWaypoint,
  anomalies,
  actions,
  overlayMode,
  onOverlayModeChange,
  onNodeSelect,
}: InteractiveFloorPlanProps) {
  const [activeFloor, setActiveFloor] = useState<ActiveFloor>(initialFloor);
  const [showRoute, setShowRoute] = useState<boolean>(true);
  const [selectedWp, setSelectedWp] = useState<FloorWaypoint | null>(null);

  // Controlled or uncontrolled Mode state: defaults to 'pathfinding'
  const [internalMode, setInternalMode] = useState<OverlayMode>('pathfinding');
  const activeMode = overlayMode ?? internalMode;
  const setMode = useCallback(
    (newMode: OverlayMode) => {
      setInternalMode(newMode);
      onOverlayModeChange?.(newMode);
    },
    [onOverlayModeChange]
  );

  const currentActions = actions ?? actionsFixture;

  const [fleetSummaryExpanded, setFleetSummaryExpanded] = useState<boolean>(true);

  // Container ref and tooltip hover state
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredWpId, setHoveredWpId] = useState<string | null>(null);
  const [hoveredPos, setHoveredPos] = useState<{ x: number; y: number } | null>(null);

  // Progressive disclosure states for pinned failure detail panel
  const [expandedEvidenceIds, setExpandedEvidenceIds] = useState<Record<string, boolean>>({});
  const [showAllCauses, setShowAllCauses] = useState<boolean>(false);
  const [showIndividualActions, setShowIndividualActions] = useState<boolean>(false);

  // Clear hover state on mode change or floor switch
  useEffect(() => {
    setHoveredWpId(null);
    setHoveredPos(null);
  }, [activeMode, activeFloor]);

  // Reset progressive disclosure on waypoint selection change
  useEffect(() => {
    setExpandedEvidenceIds({});
    setShowAllCauses(false);
    setShowIndividualActions(false);
  }, [selectedWp?.id]);

  const getKeepOutZones = useCallback((): BoundingBox[] => {
    if (!containerRef.current) return [];
    const containerRect = containerRef.current.getBoundingClientRect();
    const zones: BoundingBox[] = [];

    const ids = ['mode-toggle-segmented', 'action-mode-legend', 'fleet-failure-summary-card'];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) {
        const r = el.getBoundingClientRect();
        zones.push({
          left: Math.max(0, r.left - containerRect.left),
          top: Math.max(0, r.top - containerRect.top),
          width: r.width,
          height: r.height,
        });
      }
    }

    if (zones.length === 0) {
      zones.push({
        left: 16,
        top: 16,
        width: 440,
        height: 64,
      });
      zones.push({
        left: Math.max(0, containerRect.width - 420),
        top: 16,
        width: 400,
        height: fleetSummaryExpanded ? 340 : 130,
      });
    }

    return zones;
  }, [fleetSummaryExpanded]);

  // Compute Action Mode failure heat across all waypoints
  const waypointHeatMap = useMemo(() => {
    const ids = FLOOR_WAYPOINTS.map((w) => w.id);
    return computeAllWaypointsHeat(ids, currentActions);
  }, [currentActions]);

  // Compute Action Mode failure details across all waypoints
  const waypointFailureDetailsMap = useMemo(() => {
    const detailsMap: Record<string, WaypointFailureDetails> = {};
    for (const wp of FLOOR_WAYPOINTS) {
      detailsMap[wp.id] = resolveWaypointFailureDetails(wp.id, currentActions);
    }
    return detailsMap;
  }, [currentActions]);

  // Compute fleet-level failure summary across all missions
  const fleetSummary = useMemo(() => {
    return computeFleetFailureSummary(currentActions);
  }, [currentActions]);

  // Compute dynamic status of all waypoints across both floors based on hoisted anomalies
  const allDynamicWaypoints = useMemo(() => {
    if (!anomalies || anomalies.length === 0) {
      return FLOOR_WAYPOINTS;
    }

    return FLOOR_WAYPOINTS.map((wp) => {
      // Find all anomalies mapped to this waypoint
      const matchingAnomalies = anomalies.filter((a) => {
        const rawLoc = a.location_id || '';
        const normLoc = rawLoc.trim().toUpperCase().replace(/[-_]/g, '');
        const normWp = wp.id.toUpperCase().replace(/[-_]/g, '');
        return (
          normLoc === normWp ||
          normLoc === `WP${parseInt(wp.id.replace('WP', ''), 10)}`
        );
      });

      if (matchingAnomalies.length === 0) return wp;

      // Check if any matching anomaly is CRITICAL / HIGH / WARNING
      const hasCritical = matchingAnomalies.some(
        (a) => a.severity?.toUpperCase() === 'CRITICAL'
      );
      const hasWarning = matchingAnomalies.some((a) => {
        const s = a.severity?.toUpperCase();
        return s === 'HIGH' || s === 'WARNING' || s === 'MEDIUM';
      });

      let status: WaypointStatus = 'nominal';
      if (hasCritical) {
        status = 'critical';
      } else if (hasWarning) {
        status = 'warning';
      }

      const primaryAnomaly = matchingAnomalies[0];
      const description = primaryAnomaly.description || wp.description;
      const assetId = primaryAnomaly.asset_id || wp.assetId;

      return {
        ...wp,
        status,
        description,
        assetId,
      };
    });
  }, [anomalies]);

  // Synchronize waypoints for the active floor
  const visibleWaypoints = useMemo(() => {
    return allDynamicWaypoints.filter(
      (w) => w.floor === (activeFloor === 'Floor 1' ? 1 : 2)
    );
  }, [activeFloor, allDynamicWaypoints]);

  const criticalWaypoints = useMemo(() => {
    return visibleWaypoints.filter((wp) => wp.status === 'critical');
  }, [visibleWaypoints]);

  // Find selected issue object dynamically from anomalies
  const selectedIssue = useMemo(() => {
    if (!selectedIssueId || !anomalies) return null;
    return (
      anomalies.find(
        (a) =>
          (a.id && a.id.toLowerCase() === selectedIssueId.toLowerCase()) ||
          (a.anomaly_id && a.anomaly_id.toLowerCase() === selectedIssueId.toLowerCase())
      ) || null
    );
  }, [selectedIssueId, anomalies]);

  // Determine parent waypoint ID from selected issue or explicit prop
  const effectiveWaypointId = useMemo(() => {
    if (selectedIssue?.location_id) {
      const raw = selectedIssue.location_id.trim().toUpperCase().replace(/[-_]/g, '');
      const numMatch = raw.match(/\d+/);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        return `WP${num.toString().padStart(2, '0')}`;
      }
      return selectedIssue.location_id.toUpperCase();
    }
    return selectedWaypointId;
  }, [selectedIssue, selectedWaypointId]);

  // Sync external selection with internal state & auto-switch floor if needed
  useEffect(() => {
    if (effectiveWaypointId) {
      const match = allDynamicWaypoints.find(
        (w) => w.id.toUpperCase() === effectiveWaypointId.toUpperCase()
      );
      if (match) {
        const targetFloor: ActiveFloor = match.floor === 1 ? 'Floor 1' : 'Floor 2';
        if (targetFloor !== activeFloor) {
          setActiveFloor(targetFloor);
        }
        setSelectedWp(match);
      }
    } else if (!selectedIssueId && !selectedWaypointId) {
      setSelectedWp(null);
    }
  }, [effectiveWaypointId, selectedIssueId, selectedWaypointId, allDynamicWaypoints, activeFloor]);

  const handleMarkerClick = useCallback(
    (wp: FloorWaypoint) => {
      setSelectedWp(wp);
      onSelectWaypointId?.(wp.id);
      onSelectWaypoint?.(wp);

      // In Action Mode: clicking any waypoint with failedCount > 0 calls onNodeSelect(nodeId, payload)
      if (activeMode === 'action') {
        const heat = waypointHeatMap[wp.id];
        const details = waypointFailureDetailsMap[wp.id];
        if (heat && heat.failedCount > 0) {
          const payload = {
            waypointId: wp.id,
            failedCount: heat.failedCount,
            totalCount: heat.totalCount,
            failureRate: heat.failureRate,
            heatScore: heat.heatScore,
            color: heat.color,
            actionTypeBreakdown: details?.actionTypeBreakdown || [],
            possibleCauses: details?.possibleCauses || [],
            failedActions: details?.failedActions || [],
          };
          onNodeSelect?.(wp.id, payload);
        }
      }

      // Look up issue for this waypoint to sync selectedIssueId
      const matchingAnomalies = anomalies?.filter((a) => {
        const rawLoc = a.location_id || '';
        const normLoc = rawLoc.trim().toUpperCase().replace(/[-_]/g, '');
        const normWp = wp.id.toUpperCase().replace(/[-_]/g, '');
        return normLoc === normWp;
      });

      if (matchingAnomalies && matchingAnomalies.length > 0) {
        const crit = matchingAnomalies.find((a) => a.severity?.toUpperCase() === 'CRITICAL');
        const primary = crit || matchingAnomalies[0];
        const issueId = primary.id || primary.anomaly_id || null;
        onSelectIssueId?.(issueId);
      } else {
        onSelectIssueId?.(null);
      }
    },
    [activeMode, waypointHeatMap, waypointFailureDetailsMap, onNodeSelect, anomalies, onSelectIssueId, onSelectWaypointId, onSelectWaypoint]
  );

  const handleDismiss = useCallback(() => {
    setSelectedWp(null);
    onSelectIssueId?.(null);
    onSelectWaypointId?.(null);
    onSelectWaypoint?.(null);
  }, [onSelectIssueId, onSelectWaypointId, onSelectWaypoint]);

  // Dismiss pinned panel on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDismiss]);



  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex flex-col bg-[#071b33] text-slate-100 overflow-hidden rounded-xl border border-sky-900 shadow-2xl select-none ${className}`}
      style={style}
    >
      {/* ── Top Bar: Floor Switcher, Mode Toggle & Patrol Route Toggle ── */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-wrap items-center gap-2">
        {/* Mode Toggle (Segmented Control: Pathfinding Mode vs Action Mode) */}
        <div
          id="mode-toggle-segmented"
          className="flex items-center bg-[#0c2340]/95 backdrop-blur-md p-1 rounded-lg border border-sky-600/60 shadow-xl"
        >
          <button
            id="toggle-mode-pathfinding"
            type="button"
            onClick={() => setMode('pathfinding')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold tracking-wide transition-all ${
              activeMode === 'pathfinding'
                ? 'bg-sky-500/35 text-sky-200 border border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-sky-900/50 border border-transparent'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Pathfinding Mode</span>
          </button>
          <button
            id="toggle-mode-action"
            type="button"
            onClick={() => setMode('action')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold tracking-wide transition-all ${
              activeMode === 'action'
                ? 'bg-amber-500/30 text-amber-200 border border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-sky-900/50 border border-transparent'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Action Mode</span>
          </button>
        </div>

        {/* Floor Selection Tabs */}
        <div className="flex items-center bg-[#0c2340]/95 backdrop-blur-md p-1 rounded-lg border border-sky-600/60 shadow-xl">
          {(['Floor 1', 'Floor 2'] as ActiveFloor[]).map((floor) => {
            const isActive = activeFloor === floor;
            return (
              <button
                key={floor}
                id={`floor-tab-${floor.toLowerCase().replace(' ', '-')}`}
                onClick={() => setActiveFloor(floor)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold tracking-wide transition-all ${
                  isActive
                    ? 'bg-sky-500/35 text-sky-200 border border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                    : 'text-slate-300 hover:text-white hover:bg-sky-900/50'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                {floor}
              </button>
            );
          })}
        </div>

        {/* SPOT Patrol Route Toggle (Active in Pathfinding Mode) */}
        {activeMode === 'pathfinding' && (
          <button
            id="toggle-patrol-route"
            onClick={() => setShowRoute((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold backdrop-blur-md border transition-all shadow-xl ${
              showRoute
                ? 'bg-sky-500/35 border-sky-400 text-sky-100 shadow-[0_0_14px_rgba(56,189,248,0.45)]'
                : 'bg-[#0c2340]/90 border-sky-800 text-slate-300 hover:text-white hover:bg-sky-900/40'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${showRoute ? 'animate-pulse text-cyan-300' : 'text-slate-400'}`} />
            <span>SPOT Patrol Route</span>
            <span
              className={`w-2 h-2 rounded-full ml-1 ${
                showRoute ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-slate-500'
              }`}
            />
          </button>
        )}
      </div>

      {/* ── Top-Right Legend: Action Mode Heat Map vs Pathfinding Blueprint Status ── */}
      {activeMode === 'action' ? (
        <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
          {/* Action Mode Heat Legend */}
          <div
            id="action-mode-legend"
            className="flex items-center gap-2.5 bg-[#0c2340]/95 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-sky-500/60 shadow-xl text-xs font-mono"
          >
            <div className="flex items-center gap-1.5 text-sky-300 font-bold text-[11px] uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span>Failure rate:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-emerald-400 font-semibold">Low</span>
              <div
                className="w-24 sm:w-32 h-2.5 rounded-full shadow-inner border border-sky-700/60"
                style={{
                  background: 'linear-gradient(to right, #10b981 0%, #eab308 25%, #f97316 60%, #dc2626 100%)',
                }}
                title="Continuous heat ramp: Green (Low/0%) → Yellow → Orange → Red (High failure rate)"
              />
              <span className="text-[10px] text-red-400 font-bold">High</span>
            </div>
          </div>

          {/* ── Top-Right Fleet Failure Summary Card (Completed Mission Paradox) ── */}
          <div
            id="fleet-failure-summary-card"
            className="w-80 sm:w-96 bg-[#0c2340]/95 backdrop-blur-md rounded-xl border border-sky-600/70 shadow-2xl p-3 text-xs font-mono select-none animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <div className="flex items-center justify-between border-b border-sky-800/80 pb-1.5 mb-1.5">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-bold text-white text-[11px] uppercase tracking-wide">
                  Mission Paradox Summary
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFleetSummaryExpanded((prev) => !prev)}
                className="text-[10px] text-sky-300 hover:text-white px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800 transition-colors flex items-center gap-1 cursor-pointer"
                aria-label="Toggle fleet failure summary"
              >
                <span>{fleetSummaryExpanded ? 'Collapse' : 'Expand'}</span>
                {fleetSummaryExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Main Stats Line */}
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-slate-300">
                <strong className="text-red-400 font-bold">{fleetSummary.totalFailedActions}</strong> failed actions in{' '}
                <strong className="text-amber-300 font-bold">{fleetSummary.missionsWithFailuresCount}</strong> of{' '}
                <strong className="text-white">{fleetSummary.totalMissionsCount}</strong> missions
              </span>
              <span className="text-[10px] text-red-300 font-bold px-1.5 py-0.5 rounded bg-red-950/60 border border-red-800/60">
                {(fleetSummary.fleetFailureRate * 100).toFixed(1)}% Fail
              </span>
            </div>

            {fleetSummaryExpanded && (
              <div className="space-y-2 pt-1 border-t border-sky-900/60 text-[10px]">
                {/* Top Failing Waypoints */}
                <div>
                  <div className="text-slate-400 uppercase font-semibold text-[9px] mb-1">
                    Top Failing Waypoints:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {fleetSummary.topFailingWaypoints.slice(0, 5).map((wp) => (
                      <span
                        key={wp.waypointId}
                        className="px-1.5 py-0.5 rounded bg-[#081a30] border border-sky-800 text-sky-200"
                      >
                        <strong>{wp.waypointId}</strong> ({wp.failedCount}F)
                      </span>
                    ))}
                  </div>
                </div>

                {/* Top Failed Action Types */}
                <div>
                  <div className="text-slate-400 uppercase font-semibold text-[9px] mb-1">
                    Top Failed Action Types:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {fleetSummary.topFailedActionTypes.slice(0, 4).map((at) => (
                      <span
                        key={at.actionType}
                        className="px-1.5 py-0.5 rounded bg-[#081a30] border border-sky-800 text-slate-200"
                      >
                        {at.actionType} <span className="text-red-400 font-bold">×{at.count}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Top Cause Categories */}
                <div>
                  <div className="text-slate-400 uppercase font-semibold text-[9px] mb-1">
                    Top Cause Categories:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {fleetSummary.topCauseCategories.filter((c) => c.count > 0).map((c) => (
                      <span
                        key={c.category}
                        className="px-1.5 py-0.5 rounded bg-[#081a30] border border-sky-800 text-amber-300"
                      >
                        {c.category}: <strong>{c.count}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="absolute top-4 right-4 z-[1000] hidden md:flex items-center gap-3.5 bg-[#0c2340]/95 backdrop-blur-md px-4 py-1.5 rounded-lg border border-sky-700/80 shadow-xl text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]"></span>
            <span className="text-slate-200 font-semibold">Nominal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]"></span>
            <span className="text-slate-200 font-semibold">Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_10px_#ef4444]"></span>
            </span>
            <span className="text-red-300 font-bold">
              Critical ({criticalWaypoints.length > 0 ? criticalWaypoints.map((w) => w.id).join(', ') : 'None'})
            </span>
          </div>
        </div>
      )}

      {/* ── Leaflet Map Container ── */}
      <div className="relative flex-1 w-full h-full">
        <MapContainer
          crs={L.CRS.Simple}
          zoomControl={false}
          bounds={[
            [0, 0],
            [800, 1200],
          ]}
          maxBounds={[
            [-100, -100],
            [900, 1300],
          ]}
          minZoom={-0.8}
          maxZoom={3}
          zoomSnap={0.05}
          center={[400, 600]}
          zoom={0}
          attributionControl={false}
          className="w-full h-full bg-[#0c2340]"
        >
          {/* Map Interaction Controller: FlyTo on selection & Click-Off Dismissal */}
          <MapInteractionController
            activeFloor={activeFloor}
            selectedWp={selectedWp}
            selectedIssueId={selectedIssueId}
            onDismiss={handleDismiss}
          />

          {/* Action Mode Map Position Controller: tracks container coordinates for hovered markers */}
          {activeMode === 'action' && (
            <ActionMapPositionController
              hoveredWpId={hoveredWpId}
              waypoints={visibleWaypoints}
              onHoverPosChange={setHoveredPos}
            />
          )}

          {/* Blueprint SVG Overlays (Polylines stripped in Action Mode) */}
          {activeFloor === 'Floor 1' && (
            <Floor1BlueprintOverlay showRoute={activeMode === 'pathfinding' && showRoute} />
          )}
          {activeFloor === 'Floor 2' && (
            <Floor2BlueprintOverlay showRoute={activeMode === 'pathfinding' && showRoute} />
          )}

          {/* Waypoint Markers (Rendered with Action Mode failure heat map when active) */}
          {visibleWaypoints.map((wp) => {
            const isSelected = selectedWp?.id === wp.id;
            const heat = waypointHeatMap[wp.id];
            const icon = createBlueprintPin(wp, isSelected, activeMode, heat);
            if (!icon) return null;

            return (
              <Marker
                key={wp.id}
                position={wp.coords}
                icon={icon}
                eventHandlers={{
                  click: (e) => {
                    if (e && e.originalEvent) {
                      L.DomEvent.stopPropagation(e.originalEvent);
                    }
                    handleMarkerClick(wp);
                  },
                  mouseover: () => {
                    if (activeMode === 'action') {
                      setHoveredWpId(wp.id);
                    }
                  },
                  mouseout: () => {
                    if (activeMode === 'action') {
                      setHoveredWpId((prev) => (prev === wp.id ? null : prev));
                    }
                  },
                }}
              />
            );
          })}
        </MapContainer>
      </div>

      {/* ── Action Mode Hover Tooltip (Rendered outside MapContainer at z-[1200] above all overlays) ── */}
      {activeMode === 'action' && hoveredWpId && hoveredPos && waypointHeatMap[hoveredWpId] && (() => {
        const hoveredWp = visibleWaypoints.find((w) => w.id === hoveredWpId);
        const heat = waypointHeatMap[hoveredWpId];
        const failureDetails = waypointFailureDetailsMap[hoveredWpId];
        if (!hoveredWp || !heat) return null;

        const containerWidth = containerRef.current?.clientWidth || 1000;
        const containerHeight = containerRef.current?.clientHeight || 700;
        const keepOutZones = getKeepOutZones();

        const layout = computeTooltipLayout({
          containerWidth,
          containerHeight,
          nodeX: hoveredPos.x,
          nodeY: hoveredPos.y,
          tooltipWidth: 310,
          tooltipHeight: 145,
          keepOutZones,
          pinOffset: 20,
          margin: 14,
        });

        return (
          <div
            id="action-mode-hover-tooltip"
            role="tooltip"
            className="absolute z-[1200] pointer-events-none transition-[left,top] duration-75 ease-out"
            style={{
              left: `${layout.x}px`,
              top: `${layout.y}px`,
              width: 'max-content',
              maxWidth: '320px',
            }}
          >
            <div className="relative bg-[#071b33]/96 backdrop-blur-md border border-sky-400/80 rounded-xl p-2.5 shadow-2xl text-slate-100 font-mono text-xs w-full [overflow-wrap:anywhere] break-words whitespace-normal ring-1 ring-sky-500/20">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-sky-800/80 pb-1.5 mb-1.5 min-w-0">
                <span className="font-bold flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full inline-block shrink-0 shadow-[0_0_6px_currentColor]"
                    style={{ backgroundColor: heat.color, color: heat.color }}
                  />
                  <span className="text-white font-bold tracking-wide">{hoveredWp.id}</span>
                </span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap"
                  style={{
                    backgroundColor: `${heat.color}25`,
                    color: heat.color,
                    border: `1px solid ${heat.color}40`,
                  }}
                >
                  {heat.failedCount > 0
                    ? `${heat.failedCount} / ${heat.totalCount} Failed`
                    : '0 Failures'}
                </span>
              </div>

              {/* Action-type breakdown rendered as wrapped chips */}
              {failureDetails && failureDetails.actionTypeBreakdown.length > 0 ? (
                <div className="flex flex-wrap gap-1 mb-1.5 min-w-0">
                  {failureDetails.actionTypeBreakdown.map((t) => (
                    <span
                      key={t.actionType}
                      className="px-1.5 py-0.5 rounded bg-sky-950/90 border border-sky-700/80 text-[10px] text-sky-200 inline-flex items-center gap-1 min-w-0 font-medium"
                    >
                      <span className="text-slate-100">{t.actionType}</span>
                      <span className="text-red-400 font-bold">×{t.count}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-emerald-300 mb-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>All {heat.totalCount} actions nominal</span>
                </div>
              )}

              {/* Cause Line - Wrapped inside box */}
              {failureDetails && failureDetails.possibleCauses.length > 0 && (
                <div className="text-[10px] text-amber-300/90 font-sans leading-snug [overflow-wrap:anywhere] break-words whitespace-normal border-t border-sky-900/60 pt-1">
                  <span className="font-semibold text-amber-200">Cause: </span>
                  <span>{failureDetails.possibleCauses[0].hypothesis}</span>
                </div>
              )}

              {/* Footer hint */}
              <div className="text-[9px] text-slate-400 mt-1 font-sans border-t border-sky-900/60 pt-1">
                Click to pin failure details
              </div>

              {/* Dynamic Pointer Arrow pointing directly at nodeX */}
              <div
                className="absolute w-2.5 h-2.5 bg-[#071b33] border border-sky-400/80 pointer-events-none"
                style={{
                  left: `${layout.arrowLeft}px`,
                  ...(layout.placement === 'top'
                    ? {
                        bottom: '-5px',
                        borderTop: 'none',
                        borderLeft: 'none',
                        transform: 'translateX(-50%) rotate(45deg)',
                      }
                    : {
                        top: '-5px',
                        borderBottom: 'none',
                        borderRight: 'none',
                        transform: 'translateX(-50%) rotate(45deg)',
                      }),
                }}
              />
            </div>
          </div>
        );
      })()}

      {/* ── Action Mode Pinned Failure Detail & Causes Panel ── */}
      {activeMode === 'action' && selectedWp && (() => {
        const heat = waypointHeatMap[selectedWp.id];
        const details = waypointFailureDetailsMap[selectedWp.id];
        const hasFailures = details && details.failedCount > 0;

        const containerWidth = containerRef.current?.clientWidth || 1000;
        const containerHeight = containerRef.current?.clientHeight || 700;
        const keepOutZones = getKeepOutZones();

        const panelLayout = computePinnedPanelLayout({
          containerWidth,
          containerHeight,
          waypointId: selectedWp.id,
          panelWidth: 320,
          margin: 12,
        });

        const totalCauses = details?.possibleCauses || [];
        const visibleCauses = showAllCauses ? totalCauses : totalCauses.slice(0, 2);

        const positionStyles: React.CSSProperties = panelLayout.isBottomSheet
          ? {
              left: '12px',
              right: '12px',
              bottom: '12px',
              maxHeight: `${panelLayout.maxHeight}px`,
            }
          : panelLayout.dock === 'bottom-right'
          ? {
              right: '12px',
              bottom: '12px',
              width: `${panelLayout.width}px`,
              maxHeight: `${panelLayout.maxHeight}px`,
            }
          : {
              left: '12px',
              bottom: '12px',
              width: `${panelLayout.width}px`,
              maxHeight: `${panelLayout.maxHeight}px`,
            };

        return (
          <div
            id="action-mode-failure-detail-panel"
            className="absolute z-[1100] flex flex-col bg-[#071b33]/96 backdrop-blur-md border border-sky-600/80 p-3 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150 font-sans select-none ring-1 ring-sky-500/20"
            style={positionStyles}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-sky-800/80 pb-2 min-w-0 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
                <span
                  className="px-2 py-0.5 rounded bg-[#0c2340] border font-mono font-bold text-xs shrink-0"
                  style={{ borderColor: heat?.color || '#38bdf8', color: heat?.color || '#38bdf8' }}
                >
                  {selectedWp.id}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-bold text-white tracking-wide leading-tight line-clamp-2 min-w-0 break-words">
                      {selectedWp.name}
                    </h4>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        hasFailures
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {hasFailures
                        ? `${details.failedCount}/${details.totalCount} Failed (${(details.failureRate * 100).toFixed(1)}%)`
                        : `0 Failures`}
                    </span>
                  </div>
                </div>
              </div>
              <button
                id="close-action-detail-panel"
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white text-xs p-1 rounded hover:bg-sky-900/50 transition-colors cursor-pointer shrink-0 ml-1"
                aria-label="Close action detail panel"
              >
                ✕
              </button>
            </div>

            {/* Content Area with Internal Vertical Scroll */}
            {!hasFailures ? (
              <div className="mt-2 bg-emerald-950/30 border border-emerald-800/60 rounded-lg p-2 text-center shrink-0">
                <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-semibold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>No Failed Actions</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-300 leading-snug">
                  All {details?.totalCount || 0} actions at this waypoint completed successfully across all recorded missions.
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto custom-scrollbar min-h-0 flex-1 space-y-2 mt-2 pr-0.5">
                {/* 1. Failed Action Types Chips */}
                <div>
                  <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Failed Action Types</span>
                    <span className="text-[9px] text-sky-400 font-mono">{details.failedCount} Failures</span>
                  </div>
                  <div className="flex flex-wrap gap-1 min-w-0">
                    {details.actionTypeBreakdown.map((t) => (
                      <span
                        key={t.actionType}
                        className="px-1.5 py-0.5 rounded bg-[#0c2340] border border-sky-700/80 text-[10px] font-mono text-sky-200 flex items-center gap-1 min-w-0"
                      >
                        <span className="font-medium text-slate-100">{t.actionType}</span>
                        <span className="bg-red-500/30 text-red-300 px-1 rounded text-[9px] font-bold">
                          ×{t.count}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* 2. Possible Causes & Evidence (Progressive Disclosure) */}
                <div>
                  <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Possible Causes ({totalCauses.length})</span>
                    </span>
                    {totalCauses.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setShowAllCauses((prev) => !prev)}
                        className="text-[9px] text-sky-300 hover:text-white transition-colors cursor-pointer"
                      >
                        {showAllCauses ? 'Show top 2' : `Show all (${totalCauses.length})`}
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {visibleCauses.map((cause) => {
                      const categoryColor =
                        cause.category === 'Navigation/Obstacle'
                          ? 'border-amber-500/50 bg-amber-950/20 text-amber-300'
                          : cause.category === 'Equipment/Sensor'
                          ? 'border-indigo-500/50 bg-indigo-950/20 text-indigo-300'
                          : cause.category === 'Robot state (battery)'
                          ? 'border-rose-500/50 bg-rose-950/20 text-rose-300'
                          : cause.category === 'Environmental'
                          ? 'border-cyan-500/50 bg-cyan-950/20 text-cyan-300'
                          : 'border-slate-600 bg-slate-900/40 text-slate-300';

                      const isEvidenceExpanded = !!expandedEvidenceIds[cause.id];

                      return (
                        <div
                          key={cause.id}
                          className="p-1.5 rounded-lg bg-[#0c2340]/80 border border-sky-800/80 text-xs min-w-0"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1 min-w-0">
                            <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${categoryColor}`}>
                              {cause.category}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 truncate">
                              Explains {cause.explainedCount} of {details.failedCount}
                            </span>
                          </div>
                          <div className="font-semibold text-white text-[10.5px] leading-tight mb-1 whitespace-normal [overflow-wrap:anywhere] break-words">
                            {cause.hypothesis}
                          </div>
                          <div className="flex items-center justify-between pt-0.5 text-[9px]">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedEvidenceIds((prev) => ({
                                  ...prev,
                                  [cause.id]: !prev[cause.id],
                                }))
                              }
                              className="text-sky-400 hover:text-sky-200 flex items-center gap-0.5 cursor-pointer font-medium"
                            >
                              <span>Evidence</span>
                              {isEvidenceExpanded ? (
                                <ChevronUp className="w-2.5 h-2.5" />
                              ) : (
                                <ChevronDown className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>
                          {isEvidenceExpanded && (
                            <p className="mt-1 text-[9.5px] text-slate-300 leading-snug whitespace-normal [overflow-wrap:anywhere] break-words bg-sky-950/40 p-1.5 rounded border border-sky-900/60 animate-in fade-in duration-100">
                              <span className="text-sky-400 font-semibold font-mono">Evidence: </span>
                              {cause.evidence}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Individual Failed Actions (Collapsible Accordion Section) */}
                <div className="border-t border-sky-900/60 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setShowIndividualActions((prev) => !prev)}
                    className="w-full flex items-center justify-between text-[10px] font-bold text-slate-300 uppercase tracking-wider hover:text-white cursor-pointer py-0.5"
                  >
                    <span>Individual Failed Actions ({details.failedActions.length})</span>
                    {showIndividualActions ? (
                      <ChevronUp className="w-3 h-3 text-sky-400" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-sky-400" />
                    )}
                  </button>

                  {showIndividualActions && (
                    <div className="max-h-36 overflow-y-auto space-y-1 mt-1.5 pr-0.5 custom-scrollbar animate-in fade-in duration-150">
                      {details.failedActions.map((act) => (
                        <div
                          key={act.action_id}
                          className="p-1.5 rounded bg-[#091f38] border border-sky-900/80 text-[9.5px] font-mono flex items-center justify-between gap-1.5 hover:bg-[#0c2847] transition-colors min-w-0"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sky-200">{act.action_id}</span>
                              <span className="text-slate-400">({act.mission_id})</span>
                              <span className="text-white font-sans font-medium">{formatActionTypeName(act.action_type)}</span>
                            </div>
                            <div className="text-[8.5px] text-slate-400 mt-0.5">
                              Bat: {act.battery_pct}% • {act.timestamp ? act.timestamp.replace('2026-', '') : ''}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="px-1 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 text-[8.5px] font-bold uppercase">
                              {act.failure_type || 'FAILED'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Pathfinding Mode Selected Waypoint / Issue Drawer / Telemetry Card ── */}
      {activeMode === 'pathfinding' && selectedWp && (
        <div
          id="waypoint-telemetry-panel"
          className="absolute bottom-4 left-4 right-4 md:right-auto md:w-96 z-[1000] bg-[#0c2340]/95 backdrop-blur-md border border-sky-700 p-3.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-sky-500/25 border border-sky-400 text-sky-200 text-xs font-mono font-bold">
                {selectedIssue ? selectedIssue.id : selectedWp.id}
              </span>
              {selectedIssue && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 border border-sky-700 text-sky-300 font-mono">
                  {selectedWp.id}
                </span>
              )}
              <span
                className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                  (selectedIssue?.severity?.toUpperCase() === 'CRITICAL' || selectedWp.status === 'critical')
                    ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                    : (selectedIssue?.severity?.toUpperCase() === 'HIGH' || selectedIssue?.severity?.toUpperCase() === 'MEDIUM' || selectedWp.status === 'warning')
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                }`}
              >
                {selectedIssue ? selectedIssue.severity : selectedWp.status}
              </span>
              <div>
                <h4 className="text-xs font-bold text-white leading-tight">
                  {selectedIssue ? selectedIssue.title : selectedWp.name}
                </h4>
                <p className="text-[10px] text-sky-300 font-mono">
                  {selectedWp.zone} • {selectedIssue?.asset_id || selectedWp.assetId}
                </p>
              </div>
            </div>
            <button
              id="close-telemetry-panel"
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white text-xs p-1 rounded hover:bg-sky-900/50 transition-colors"
              aria-label="Close telemetry panel"
            >
              ✕
            </button>
          </div>

          <p className="mt-2 text-[11px] text-slate-200 leading-normal">
            {selectedIssue ? selectedIssue.description : selectedWp.description}
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2 pt-2 border-t border-sky-800/80 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 bg-[#081b33] p-1.5 rounded border border-sky-900">
              <Thermometer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div>
                <div className="text-[9px] text-slate-400 uppercase">Temp</div>
                <div className="font-semibold text-amber-300">
                  {selectedIssue
                    ? (selectedIssue as any).temperature ||
                      selectedIssue.description.match(/(\+?\d+(?:\.\d+)?\s*°C)/i)?.[1] ||
                      (selectedIssue.anomaly_type === 'ABNORMAL_TEMPERATURE' ? '88.5 °C' : selectedWp.temperature)
                    : selectedWp.temperature}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-[#081b33] p-1.5 rounded border border-sky-900">
              <Activity className="w-3.5 h-3.5 text-sky-300 shrink-0" />
              <div>
                <div className="text-[9px] text-slate-400 uppercase">Vibe</div>
                <div className="font-semibold text-sky-200">
                  {selectedIssue
                    ? (selectedIssue as any).vibration ||
                      selectedIssue.description.match(/(\d+(?:\.\d+)?\s*(?:mm\/s|Hz))/i)?.[1] ||
                      (selectedIssue.anomaly_type?.includes('VIBRATION') ? '1.82 mm/s' : selectedWp.vibration)
                    : selectedWp.vibration}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-[#081b33] p-1.5 rounded border border-sky-900">
              <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[9px] text-slate-400 uppercase">Bot Bat</div>
                <div className="font-semibold text-emerald-300">{selectedWp.batteryPct}%</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
