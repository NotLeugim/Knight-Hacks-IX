'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

export type FloorSelection = 'floor1' | 'floor2' | 'all';

export interface WaypointNode {
  id: string;
  name?: string;
  floor: 1 | 2;
  coords: [number, number]; // [y, x] in L.CRS.Simple coordinate space
  isAnomaly?: boolean;
}

export interface FacilityMap2DProps {
  className?: string;
  style?: React.CSSProperties;
  floor?: FloorSelection;
  onFloorChange?: (floor: FloorSelection) => void;
  waypoints?: WaypointNode[];
  path?: [number, number][];
}

// Floor configs calibrated to the clean borderless crops
export const FLOOR_CONFIGS: Record<
  FloorSelection,
  {
    name: string;
    description: string;
    imageUrl: string;
    bounds: [[number, number], [number, number]];
    cameraMaxBounds: [[number, number], [number, number]];
  }
> = {
  floor1: {
    name: 'Floor 1',
    description: 'Mezzanine Deck & Turbine Hall',
    imageUrl: '/floor1.png',
    bounds: [
      [0, 0],
      [1000, 1285],
    ],
    cameraMaxBounds: [
      [-350, -250],
      [1350, 1535],
    ],
  },
  floor2: {
    name: 'Floor 2',
    description: 'Battery Room & Auxiliary Systems',
    imageUrl: '/floor2.png',
    bounds: [
      [0, 0],
      [1000, 572],
    ],
    cameraMaxBounds: [
      [-350, -200],
      [1350, 772],
    ],
  },
  all: {
    name: 'All Floors',
    description: 'Facility Full Overview',
    imageUrl: '/fictional_floor_plan.png',
    bounds: [
      [0, 0],
      [1000, 1877],
    ],
    cameraMaxBounds: [
      [-350, -300],
      [1350, 2177],
    ],
  },
};

// Floor 1 specific waypoint coordinates calibrated to cropped floor1.png
const FLOOR1_WAYPOINTS: WaypointNode[] = [
  { id: 'WP01', name: 'Main Entrance', floor: 1, coords: [217, 148] },
  { id: 'WP02', name: 'Electrical Room', floor: 1, coords: [463, 165] },
  { id: 'WP03', name: 'Cooling Loop', floor: 1, coords: [604, 412] },
  { id: 'WP04', name: 'Pump Bay', floor: 1, coords: [868, 359] },
  { id: 'WP05', name: 'Pipe Gallery', floor: 1, coords: [639, 746] },
  { id: 'WP06', name: 'Compressor Area', floor: 1, coords: [859, 940] },
  { id: 'WP07', name: 'Control Room Corridor', floor: 1, coords: [516, 1134] },
  { id: 'WP08', name: 'Turbine Hall North', floor: 1, coords: [305, 641] },
  { id: 'WP09', name: 'Turbine Hall South', floor: 1, coords: [305, 940], isAnomaly: true },
  { id: 'WP10', name: 'Valve Station', floor: 1, coords: [252, 1151] },
];

// Floor 2 specific waypoint coordinates calibrated to cropped floor2.png
const FLOOR2_WAYPOINTS: WaypointNode[] = [
  { id: 'WP11', name: 'Battery Room', floor: 2, coords: [771, 113] },
  { id: 'WP12', name: 'Heat Exchanger Area', floor: 2, coords: [771, 412] },
  { id: 'WP13', name: 'Warehouse Corridor', floor: 2, coords: [437, 130] },
  { id: 'WP14', name: 'Auxiliary Bay', floor: 2, coords: [366, 412] },
  { id: 'WP15', name: 'Inspection Dock', floor: 2, coords: [155, 271] },
];

// All Floors overview coordinates calibrated to cropped fictional_floor_plan.png
const ALL_WAYPOINTS: WaypointNode[] = [
  { id: 'WP01', name: 'Main Entrance', floor: 1, coords: [217, 148] },
  { id: 'WP02', name: 'Electrical Room', floor: 1, coords: [463, 166] },
  { id: 'WP03', name: 'Cooling Loop', floor: 1, coords: [604, 412] },
  { id: 'WP04', name: 'Pump Bay', floor: 1, coords: [868, 359] },
  { id: 'WP05', name: 'Pipe Gallery', floor: 1, coords: [639, 747] },
  { id: 'WP06', name: 'Compressor Area', floor: 1, coords: [859, 940] },
  { id: 'WP07', name: 'Corridor', floor: 1, coords: [516, 1134] },
  { id: 'WP08', name: 'Turbine Hall North', floor: 1, coords: [305, 641] },
  { id: 'WP09', name: 'Turbine Hall South', floor: 1, coords: [305, 940], isAnomaly: true },
  { id: 'WP10', name: 'Valve Station', floor: 1, coords: [252, 1152] },
  { id: 'WP11', name: 'Battery Room', floor: 2, coords: [771, 1417] },
  { id: 'WP12', name: 'Heat Exchanger', floor: 2, coords: [771, 1717] },
  { id: 'WP13', name: 'Warehouse Corridor', floor: 2, coords: [437, 1435] },
  { id: 'WP14', name: 'Auxiliary Bay', floor: 2, coords: [366, 1717] },
  { id: 'WP15', name: 'Inspection Dock', floor: 2, coords: [155, 1576] },
];

const MapContent = dynamic(
  async () => {
    const L = await import('leaflet');
    const {
      MapContainer,
      ImageOverlay,
      Polyline,
      CircleMarker,
      Tooltip,
      useMap,
    } = await import('react-leaflet');

    function FitBoundsOnMount({ bounds }: { bounds: [[number, number], [number, number]] }) {
      const map = useMap();
      useEffect(() => {
        // Generous top padding (95px) and bottom padding (75px) clears HUD buttons and 2D/3D switcher
        map.fitBounds(bounds, {
          paddingTopLeft: [40, 95],
          paddingBottomRight: [40, 75],
          animate: false,
        });
        map.invalidateSize();
      }, [map, bounds]);
      return null;
    }

    function TopRightControls({
      activeFloor,
      onSelectFloor,
      bounds,
    }: {
      activeFloor: FloorSelection;
      onSelectFloor: (floor: FloorSelection) => void;
      bounds: [[number, number], [number, number]];
    }) {
      const map = useMap();
      return (
        <div className="absolute top-4 right-4 z-[900] flex items-center gap-2">
          {/* Floor Selection Buttons (Anchored in top-right: never shifts or jumps) */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-slate-800 shadow-xl">
            <button
              id="floor-btn-1"
              onClick={() => onSelectFloor('floor1')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                activeFloor === 'floor1'
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Floor 1
            </button>
            <button
              id="floor-btn-2"
              onClick={() => onSelectFloor('floor2')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                activeFloor === 'floor2'
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Floor 2
            </button>
            <button
              id="floor-btn-all"
              onClick={() => onSelectFloor('all')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                activeFloor === 'all'
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              All
            </button>
          </div>

          {/* Zoom and Fit Map Controls */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-slate-800 shadow-xl gap-0.5">
            <button
              onClick={() => map.zoomIn()}
              title="Zoom In"
              className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded text-sm font-bold transition-colors"
            >
              +
            </button>
            <button
              onClick={() => map.zoomOut()}
              title="Zoom Out"
              className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded text-sm font-bold transition-colors"
            >
              −
            </button>
            <button
              onClick={() =>
                map.fitBounds(bounds, {
                  paddingTopLeft: [40, 95],
                  paddingBottomRight: [40, 75],
                })
              }
              title="Fit Entire Floor"
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded text-xs transition-colors"
            >
              ⛶
            </button>
          </div>
        </div>
      );
    }

    return function InnerMap({
      className,
      style,
      floor: controlledFloor,
      onFloorChange,
      waypoints: customWaypoints,
      path: customPath,
    }: FacilityMap2DProps) {
      const [internalFloor, setInternalFloor] = useState<FloorSelection>('floor1');
      const activeFloor = controlledFloor ?? internalFloor;

      const handleFloorSelect = (floor: FloorSelection) => {
        setInternalFloor(floor);
        onFloorChange?.(floor);
      };

      const floorConfig = FLOOR_CONFIGS[activeFloor];

      // Select waypoints corresponding to active floor
      const activeWaypoints = customWaypoints
        ? customWaypoints.filter((wp) => activeFloor === 'all' || (activeFloor === 'floor1' ? wp.floor === 1 : wp.floor === 2))
        : activeFloor === 'floor1'
        ? FLOOR1_WAYPOINTS
        : activeFloor === 'floor2'
        ? FLOOR2_WAYPOINTS
        : ALL_WAYPOINTS;

      const polylinePositions = customPath ?? activeWaypoints.map((wp) => wp.coords);

      return (
        <div
          className={`relative w-full h-full bg-slate-950 overflow-hidden select-none ${className ?? ''}`}
          style={{ backgroundColor: '#020617', ...style }}
        >
          {/* Keyed MapContainer cleanly updates viewport per floor */}
          <MapContainer
            key={activeFloor}
            crs={L.CRS.Simple}
            bounds={floorConfig.bounds}
            maxBounds={floorConfig.cameraMaxBounds}
            maxBoundsViscosity={0.9}
            zoomSnap={0.1}
            zoomDelta={0.25}
            minZoom={-2.5}
            maxZoom={2.5}
            zoomControl={false}
            attributionControl={false}
            scrollWheelZoom={true}
            className="w-full h-full bg-slate-950"
            style={{ width: '100%', height: '100%', backgroundColor: '#020617' }}
          >
            <FitBoundsOnMount bounds={floorConfig.bounds} />
            <TopRightControls
              activeFloor={activeFloor}
              onSelectFloor={handleFloorSelect}
              bounds={floorConfig.bounds}
            />

            {/* Dark Mode Realistic Floor Plan Overlay */}
            <ImageOverlay
              url={floorConfig.imageUrl}
              bounds={floorConfig.bounds}
              className="dark-mode-overlay"
            />

            {/* Bright, Opaque Glowing Blue Tracking Path */}
            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: '#3b82f6',
                weight: 3,
                dashArray: '8, 8',
                opacity: 1.0,
              }}
            />

            {/* Bright, Opaque Waypoint Nodes */}
            {activeWaypoints.map((wp) => (
              <CircleMarker
                key={wp.id}
                center={wp.coords}
                radius={wp.isAnomaly ? 6 : 5}
                pathOptions={{
                  color: wp.isAnomaly ? '#ef4444' : '#ffffff',
                  fillColor: wp.isAnomaly ? '#ef4444' : '#3b82f6',
                  fillOpacity: 1.0,
                  opacity: 1.0,
                  weight: 2,
                }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -6]}
                  opacity={0.95}
                  className="orbit-tooltip"
                >
                  <div className="font-mono text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                    <span>{wp.id}</span>
                    {wp.isAnomaly && (
                      <span className="text-[10px] px-1 py-0.2 bg-red-500/20 text-red-400 rounded">
                        ANOMALY
                      </span>
                    )}
                  </div>
                  {wp.name && (
                    <div className="text-[10px] text-slate-400 mt-0.5">{wp.name}</div>
                  )}
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* Top-Left: Static Orbit Telemetry Badge (stays anchored on left) */}
          <div className="absolute top-4 left-4 z-[900] pointer-events-none flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 shadow-xl">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[11px] font-mono font-semibold tracking-wider text-slate-200 uppercase">
              {floorConfig.name.toUpperCase()} · {floorConfig.description.toUpperCase()}
            </span>
          </div>
        </div>
      );
    };
  },
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Loading Dark Mode Floor Map...
          </span>
        </div>
      </div>
    ),
  }
);

export default function FacilityMap2D(props: FacilityMap2DProps) {
  return <MapContent {...props} />;
}
