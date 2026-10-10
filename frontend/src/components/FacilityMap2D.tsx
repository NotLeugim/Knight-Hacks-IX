'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { useTriage } from '@/context/TriageContext';
import { getSeverityTheme, NOMINAL_THEME } from '@/lib/severity';
import { normalizeWaypointId, WaypointAnomalySummary } from '@/lib/triageSelectors';
import { TriageAnomaly } from '@/lib/triageTypes';

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
  selectedWaypointId?: string | null;
  selectedAnomalyId?: string | null;
  hoveredWaypointId?: string | null;
  hoveredAnomalyId?: string | null;
  reviewRequiredOnly?: boolean;
  onSelectWaypoint?: (waypointId: string | null) => void;
  onSelectAnomaly?: (anomalyId: string | null) => void;
  onHoverWaypoint?: (waypointId: string | null) => void;
  onClearSelection?: () => void;
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
export const FLOOR1_WAYPOINTS: WaypointNode[] = [
  { id: 'WP01', name: 'Main Entrance', floor: 1, coords: [217, 148] },
  { id: 'WP02', name: 'Electrical Room', floor: 1, coords: [463, 165] },
  { id: 'WP03', name: 'Cooling Loop', floor: 1, coords: [604, 412] },
  { id: 'WP04', name: 'Pump Bay', floor: 1, coords: [868, 359] },
  { id: 'WP05', name: 'Pipe Gallery', floor: 1, coords: [639, 746] },
  { id: 'WP06', name: 'Compressor Area', floor: 1, coords: [859, 940] },
  { id: 'WP07', name: 'Control Room Corridor', floor: 1, coords: [516, 1134] },
  { id: 'WP08', name: 'Turbine Hall North', floor: 1, coords: [305, 641] },
  { id: 'WP09', name: 'Turbine Hall South', floor: 1, coords: [305, 940] },
  { id: 'WP10', name: 'Valve Station', floor: 1, coords: [252, 1151] },
];

// Floor 2 specific waypoint coordinates calibrated to cropped floor2.png
export const FLOOR2_WAYPOINTS: WaypointNode[] = [
  { id: 'WP11', name: 'Battery Room', floor: 2, coords: [771, 113] },
  { id: 'WP12', name: 'Heat Exchanger Area', floor: 2, coords: [771, 412] },
  { id: 'WP13', name: 'Warehouse Corridor', floor: 2, coords: [437, 130] },
  { id: 'WP14', name: 'Auxiliary Bay', floor: 2, coords: [366, 412] },
  { id: 'WP15', name: 'Inspection Dock', floor: 2, coords: [155, 271] },
];

// All Floors overview coordinates calibrated to cropped fictional_floor_plan.png
export const ALL_WAYPOINTS: WaypointNode[] = [
  { id: 'WP01', name: 'Main Entrance', floor: 1, coords: [217, 148] },
  { id: 'WP02', name: 'Electrical Room', floor: 1, coords: [463, 166] },
  { id: 'WP03', name: 'Cooling Loop', floor: 1, coords: [604, 412] },
  { id: 'WP04', name: 'Pump Bay', floor: 1, coords: [868, 359] },
  { id: 'WP05', name: 'Pipe Gallery', floor: 1, coords: [639, 747] },
  { id: 'WP06', name: 'Compressor Area', floor: 1, coords: [859, 940] },
  { id: 'WP07', name: 'Corridor', floor: 1, coords: [516, 1134] },
  { id: 'WP08', name: 'Turbine Hall North', floor: 1, coords: [305, 641] },
  { id: 'WP09', name: 'Turbine Hall South', floor: 1, coords: [305, 940] },
  { id: 'WP10', name: 'Valve Station', floor: 1, coords: [252, 1152] },
  { id: 'WP11', name: 'Battery Room', floor: 2, coords: [771, 1417] },
  { id: 'WP12', name: 'Heat Exchanger', floor: 2, coords: [771, 1717] },
  { id: 'WP13', name: 'Warehouse Corridor', floor: 2, coords: [437, 1435] },
  { id: 'WP14', name: 'Auxiliary Bay', floor: 2, coords: [366, 1717] },
  { id: 'WP15', name: 'Inspection Dock', floor: 2, coords: [155, 1576] },
];

export function getFloorForWaypoint(waypointId: string): 1 | 2 {
  const norm = normalizeWaypointId(waypointId);
  const match = norm.match(/^WP(\d+)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    return num >= 11 ? 2 : 1;
  }
  return 1;
}

const MapContent = dynamic(
  async () => {
    const L = await import('leaflet');
    const {
      MapContainer,
      ImageOverlay,
      Polyline,
      Marker,
      Popup,
      Tooltip,
      useMap,
      useMapEvents,
    } = await import('react-leaflet');

    function FitBoundsOnMount({ bounds }: { bounds: [[number, number], [number, number]] }) {
      const map = useMap();
      useEffect(() => {
        map.fitBounds(bounds, {
          paddingTopLeft: [40, 95],
          paddingBottomRight: [40, 75],
          animate: false,
        });
        map.invalidateSize();
      }, [map, bounds]);
      return null;
    }

    function MapBackgroundEvents({ onClear }: { onClear: () => void }) {
      useMapEvents({
        click: (e) => {
          const target = e.originalEvent.target as HTMLElement;
          if (
            target?.classList.contains('leaflet-container') ||
            target?.classList.contains('dark-mode-overlay') ||
            target?.tagName === 'IMG' ||
            target?.tagName === 'svg' ||
            target?.classList.contains('leaflet-image-layer')
          ) {
            onClear();
          }
        },
      });
      return null;
    }

    function FocusController({
      targetWaypointId,
      activeFloor,
      onFloorChange,
      waypoints,
    }: {
      targetWaypointId: string | null;
      activeFloor: FloorSelection;
      onFloorChange: (floor: FloorSelection) => void;
      waypoints: WaypointNode[];
    }) {
      const map = useMap();

      useEffect(() => {
        if (!targetWaypointId) return;

        const normalized = normalizeWaypointId(targetWaypointId);
        const targetFloor = getFloorForWaypoint(normalized);

        // Switch floor if necessary and not already in 'all' view
        if (activeFloor !== 'all') {
          const expectedFloor: FloorSelection = targetFloor === 1 ? 'floor1' : 'floor2';
          if (activeFloor !== expectedFloor) {
            onFloorChange(expectedFloor);
            return;
          }
        }

        // Find coords in the current active waypoint set
        const targetWp = waypoints.find(
          (wp) => normalizeWaypointId(wp.id) === normalized
        );

        if (targetWp) {
          map.flyTo(targetWp.coords, Math.max(map.getZoom(), 0.6), {
            duration: 0.7,
            easeLinearity: 0.25,
          });
        }
      }, [targetWaypointId, activeFloor, onFloorChange, waypoints, map]);

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
          {/* Floor Selection Buttons */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-slate-800 shadow-xl">
            <button
              id="floor-btn-1"
              type="button"
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
              type="button"
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
              type="button"
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
              type="button"
              onClick={() => map.zoomIn()}
              title="Zoom In"
              aria-label="Zoom in"
              className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded text-sm font-bold transition-colors"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => map.zoomOut()}
              title="Zoom Out"
              aria-label="Zoom out"
              className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded text-sm font-bold transition-colors"
            >
              −
            </button>
            <button
              type="button"
              onClick={() =>
                map.fitBounds(bounds, {
                  paddingTopLeft: [40, 95],
                  paddingBottomRight: [40, 75],
                })
              }
              title="Fit Entire Floor"
              aria-label="Fit entire floor"
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded text-xs transition-colors"
            >
              ⛶
            </button>
          </div>
        </div>
      );
    }

    interface InnerMapProps extends FacilityMap2DProps {
      waypointSummaries?: Record<string, WaypointAnomalySummary>;
    }

    return function InnerMap({
      className,
      style,
      floor: controlledFloor,
      onFloorChange,
      waypoints: customWaypoints,
      path: customPath,
      selectedWaypointId,
      selectedAnomalyId,
      hoveredWaypointId,
      hoveredAnomalyId,
      reviewRequiredOnly = false,
      onSelectWaypoint,
      onSelectAnomaly,
      onHoverWaypoint,
      onClearSelection,
      waypointSummaries = {},
    }: InnerMapProps) {
      const [internalFloor, setInternalFloor] = useState<FloorSelection>('floor1');
      const activeFloor = controlledFloor ?? internalFloor;

      const handleFloorSelect = useCallback(
        (floor: FloorSelection) => {
          setInternalFloor(floor);
          onFloorChange?.(floor);
        },
        [onFloorChange]
      );

      const floorConfig = FLOOR_CONFIGS[activeFloor];

      // Select waypoints corresponding to active floor
      const activeWaypoints = useMemo(() => {
        if (customWaypoints) {
          return customWaypoints.filter(
            (wp) =>
              activeFloor === 'all' ||
              (activeFloor === 'floor1' ? wp.floor === 1 : wp.floor === 2)
          );
        }
        return activeFloor === 'floor1'
          ? FLOOR1_WAYPOINTS
          : activeFloor === 'floor2'
          ? FLOOR2_WAYPOINTS
          : ALL_WAYPOINTS;
      }, [customWaypoints, activeFloor]);

      const polylinePositions = customPath ?? activeWaypoints.map((wp) => wp.coords);

      // Escape key to clear selection
      useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            onClearSelection?.();
          }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
      }, [onClearSelection]);

      // Memoized marker creation
      const renderedMarkers = useMemo(() => {
        return activeWaypoints.map((wp) => {
          const normId = normalizeWaypointId(wp.id);
          const summary = waypointSummaries[normId];
          const hasAnomalies = Boolean(summary && summary.count > 0);
          const worstSeverity = summary?.worstSeverity ?? null;
          const theme = hasAnomalies ? getSeverityTheme(worstSeverity) : NOMINAL_THEME;
          const hasCritical = Boolean(summary?.hasCritical);

          const isSelected = selectedWaypointId === normId;
          const isHovered =
            hoveredWaypointId === normId ||
            (Boolean(hoveredAnomalyId) &&
              Boolean(
                summary?.anomalies.some(
                  (a) => (a.id || a.anomaly_id) === hoveredAnomalyId
                )
              ));

          // Dim if review-required filter is active and this waypoint has no review-required anomalies
          const isDimmed =
            reviewRequiredOnly &&
            (!summary || summary.reviewRequiredCount === 0);

          const count = summary?.count ?? 0;
          const markerSize = isSelected ? 18 : count > 0 ? 14 : 10;

          // HTML for divIcon
          const html = `
            <div
              tabindex="0"
              role="button"
              aria-label="Waypoint ${wp.id}${wp.name ? ': ' + wp.name : ''}. ${hasAnomalies ? count + ' anomaly(s), severity ' + theme.label : 'Nominal'}"
              aria-pressed="${isSelected}"
              class="relative flex items-center justify-center cursor-pointer transition-transform duration-150 ${
                isHovered ? 'scale-125' : ''
              }"
              style="width: 32px; height: 32px; outline: none;"
            >
              ${
                hasCritical && !isDimmed
                  ? '<div class="absolute inset-0 rounded-full marker-pulse-critical" style="background: rgba(239, 68, 68, 0.45);"></div>'
                  : ''
              }
              <div
                class="marker-circle rounded-full transition-all duration-150 shadow-md ${
                  isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                }"
                style="
                  width: ${markerSize}px;
                  height: ${markerSize}px;
                  background-color: ${theme.markerFill};
                  border: 2px solid ${isSelected ? '#ffffff' : theme.markerColor};
                  opacity: ${isDimmed ? 0.25 : 1.0};
                "
              ></div>
              ${
                count > 1
                  ? `<span
                      class="absolute -top-1 -right-1 text-[9px] font-bold font-mono px-1 rounded-full bg-slate-950 text-white border border-slate-700 shadow-sm"
                      style="line-height: 13px; height: 13px; min-width: 13px; text-align: center; opacity: ${
                        isDimmed ? 0.3 : 1.0
                      };"
                    >${count}</span>`
                  : ''
              }
            </div>
          `;

          const icon = L.divIcon({
            className: 'waypoint-div-marker',
            html,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16],
          });

          return (
            <Marker
              key={wp.id}
              position={wp.coords}
              icon={icon}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  onSelectWaypoint?.(wp.id);
                },
                mouseover: () => onHoverWaypoint?.(wp.id),
                mouseout: () => onHoverWaypoint?.(null),
                keydown: (e: any) => {
                  if (e.originalEvent.key === 'Enter' || e.originalEvent.key === ' ') {
                    e.originalEvent.preventDefault();
                    onSelectWaypoint?.(wp.id);
                  } else if (e.originalEvent.key === 'Escape') {
                    onClearSelection?.();
                  }
                },
              }}
            >
              {/* Hover Tooltip */}
              <Tooltip
                direction="top"
                offset={[0, -14]}
                opacity={0.96}
                className="orbit-tooltip"
              >
                <div className="font-mono text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                  <span>{wp.id}</span>
                  {hasAnomalies ? (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${theme.textColor} ${theme.badgeBg}`}
                    >
                      {theme.label} {count > 1 ? `(${count})` : ''}
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${NOMINAL_THEME.textColor} ${NOMINAL_THEME.badgeBg}`}
                    >
                      NOMINAL
                    </span>
                  )}
                </div>
                {wp.name && (
                  <div className="text-[10px] text-slate-400 mt-0.5">{wp.name}</div>
                )}
              </Tooltip>

              {/* Click Popup with Anomalies */}
              <Popup className="orbit-popup" closeButton={true} minWidth={220} maxWidth={280}>
                <div className="p-3 text-left font-sans select-none">
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2">
                    <div>
                      <div className="font-mono text-xs font-bold text-white flex items-center gap-1">
                        <span>{wp.id}</span>
                        {wp.name && <span className="text-slate-400 font-normal">· {wp.name}</span>}
                      </div>
                    </div>
                    {hasAnomalies ? (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide border uppercase ${theme.textColor} ${theme.badgeBg} ${theme.badgeBorder}`}
                      >
                        {theme.label}
                      </span>
                    ) : (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide border uppercase ${NOMINAL_THEME.textColor} ${NOMINAL_THEME.badgeBg} ${NOMINAL_THEME.badgeBorder}`}
                      >
                        NOMINAL
                      </span>
                    )}
                  </div>

                  {hasAnomalies && summary ? (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Flagged Issues ({summary.anomalies.length}):
                      </div>
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {summary.anomalies.map((a: TriageAnomaly) => {
                          const aId = a.id || a.anomaly_id || 'issue';
                          const isASelected = selectedAnomalyId === aId;
                          const aTheme = getSeverityTheme(a.severity);

                          return (
                            <button
                              key={aId}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectAnomaly?.(aId);
                              }}
                              className={`w-full text-left p-1.5 rounded transition-all flex items-start gap-1.5 border ${
                                isASelected
                                  ? 'bg-blue-900/40 border-blue-500 text-white'
                                  : 'bg-slate-900/70 border-white/5 hover:bg-slate-800 text-slate-200'
                              }`}
                            >
                              <span
                                className={`text-[9px] font-bold px-1 py-0.2 rounded shrink-0 uppercase ${aTheme.textColor} ${aTheme.badgeBg}`}
                              >
                                {aTheme.label.slice(0, 4)}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-medium leading-snug truncate">
                                  {a.title}
                                </p>
                                <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                  {a.asset_id || aId}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-1">
                      No open anomalies at this waypoint.
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        });
      }, [
        activeWaypoints,
        waypointSummaries,
        selectedWaypointId,
        hoveredWaypointId,
        hoveredAnomalyId,
        selectedAnomalyId,
        reviewRequiredOnly,
        onSelectWaypoint,
        onHoverWaypoint,
        onSelectAnomaly,
        onClearSelection,
      ]);

      return (
        <div
          className={`relative w-full h-full bg-slate-950 overflow-hidden select-none ${
            className ?? ''
          }`}
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
            <MapBackgroundEvents onClear={() => onClearSelection?.()} />
            <FocusController
              targetWaypointId={selectedWaypointId}
              activeFloor={activeFloor}
              onFloorChange={handleFloorSelect}
              waypoints={activeWaypoints}
            />

            <TopRightControls
              activeFloor={activeFloor}
              onSelectFloor={handleFloorSelect}
              bounds={floorConfig.bounds}
            />

            {/* Dark Mode Floor Plan Overlay */}
            <ImageOverlay
              url={floorConfig.imageUrl}
              bounds={floorConfig.bounds}
              className="dark-mode-overlay"
            />

            {/* Glowing Blue Tracking Path */}
            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: '#3b82f6',
                weight: 3,
                dashArray: '8, 8',
                opacity: 1.0,
              }}
            />

            {/* Dynamic Waypoint Markers */}
            {renderedMarkers}
          </MapContainer>

          {/* Top-Left: Static Orbit Telemetry Badge */}
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

/**
 * Wrapper component that connects to TriageContext if available, or uses direct props.
 */
export default function FacilityMap2D(props: FacilityMap2DProps) {
  // Gracefully consume TriageContext if mounted inside TriageProvider
  let contextValue: ReturnType<typeof useTriage> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    contextValue = useTriage();
  } catch {
    contextValue = null;
  }

  const mergedProps: FacilityMap2DProps & {
    waypointSummaries?: Record<string, WaypointAnomalySummary>;
  } = {
    ...props,
    selectedWaypointId:
      props.selectedWaypointId !== undefined
        ? props.selectedWaypointId
        : contextValue?.selectedWaypointId ?? null,
    selectedAnomalyId:
      props.selectedAnomalyId !== undefined
        ? props.selectedAnomalyId
        : contextValue?.selectedAnomalyId ?? null,
    hoveredWaypointId:
      props.hoveredWaypointId !== undefined
        ? props.hoveredWaypointId
        : contextValue?.hoveredWaypointId ?? null,
    hoveredAnomalyId:
      props.hoveredAnomalyId !== undefined
        ? props.hoveredAnomalyId
        : contextValue?.hoveredAnomalyId ?? null,
    reviewRequiredOnly:
      props.reviewRequiredOnly !== undefined
        ? props.reviewRequiredOnly
        : contextValue?.reviewRequiredOnly ?? false,
    onSelectWaypoint: props.onSelectWaypoint ?? contextValue?.selectWaypoint,
    onSelectAnomaly: props.onSelectAnomaly ?? contextValue?.selectAnomaly,
    onHoverWaypoint: props.onHoverWaypoint ?? contextValue?.setHoveredWaypointId,
    onClearSelection: props.onClearSelection ?? contextValue?.clearAllSelection,
    waypointSummaries: contextValue?.waypointSummaries ?? {},
  };

  return <MapContent {...mergedProps} />;
}
