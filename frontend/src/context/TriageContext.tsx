'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { TriageAnomaly } from '@/lib/triageTypes';
import { fetchTriageQueue } from '@/lib/api';
import { toStatus } from '@/lib/status';
import {
  normalizeWaypointId,
  computeWaypointSummaries,
  filterAnomalies,
  WaypointAnomalySummary,
} from '@/lib/triageSelectors';

export interface TriageContextValue {
  /** Complete list of anomalies as fetched from backend/fixture */
  anomalies: TriageAnomaly[];
  /** Filtered list matching active filters (preserved in backend order) */
  filteredAnomalies: TriageAnomaly[];
  /** Precomputed summary statistics per waypoint */
  waypointSummaries: Record<string, WaypointAnomalySummary>;
  /** Loading status */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Currently selected waypoint filter ID (e.g. 'WP07') or null */
  selectedWaypointId: string | null;
  /** Currently selected anomaly ID (e.g. 'AN014') or null */
  selectedAnomalyId: string | null;
  /** Currently hovered anomaly ID */
  hoveredAnomalyId: string | null;
  /** Currently hovered waypoint ID */
  hoveredWaypointId: string | null;
  /** Filter toggle: show only operator review required */
  reviewRequiredOnly: boolean;
  /** Smart Drawer target anomaly ID */
  activeAnomalyId: string | null;

  /** Setters & actions */
  selectWaypoint: (waypointId: string | null) => void;
  selectAnomaly: (anomalyId: string | null, source?: 'queue' | 'map') => void;
  setHoveredAnomalyId: (anomalyId: string | null) => void;
  setHoveredWaypointId: (waypointId: string | null) => void;
  setReviewRequiredOnly: (value: boolean | ((prev: boolean) => boolean)) => void;
  clearFilter: () => void;
  clearAllSelection: () => void;
  selectNextCritical: () => void;
  reloadQueue: () => Promise<void>;
}

const TriageContext = createContext<TriageContextValue | null>(null);

export interface TriageProviderProps {
  children: ReactNode;
  /** Optional custom initial anomalies for tests or mocks */
  initialAnomalies?: TriageAnomaly[];
  /** Optional callback fired when anomalies list updates (e.g. on reloadQueue) */
  onAnomaliesChange?: (anomalies: TriageAnomaly[]) => void;
}

export function TriageProvider({
  children,
  initialAnomalies,
  onAnomaliesChange,
}: TriageProviderProps) {
  const [anomalies, setAnomalies] = useState<TriageAnomaly[]>(initialAnomalies ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialAnomalies);
  const [error, setError] = useState<string | null>(null);

  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);
  const [hoveredAnomalyId, setHoveredAnomalyId] = useState<string | null>(null);
  const [hoveredWaypointId, setHoveredWaypointId] = useState<string | null>(null);
  const [reviewRequiredOnly, setReviewRequiredOnly] = useState<boolean>(false);

  // Synchronize anomalies state whenever initialAnomalies prop updates
  useEffect(() => {
    if (initialAnomalies) {
      setAnomalies(initialAnomalies);
      setIsLoading(false);
      setSelectedAnomalyId((prevSelected) => {
        if (!prevSelected) return null;
        const exists = initialAnomalies.some(
          (a) => (a.id || a.anomaly_id) === prevSelected
        );
        return exists ? prevSelected : null;
      });
    }
  }, [initialAnomalies]);

  // Single fetch on mount (only if initialAnomalies not supplied)
  const reloadQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchTriageQueue();
      // Strictly preserve original order returned by backend/fixture
      const list = response.queue ?? [];
      setAnomalies(list);
      onAnomaliesChange?.(list);

      // Clean up selection if previously selected anomaly no longer exists in fresh data
      setSelectedAnomalyId((prevSelected) => {
        if (!prevSelected) return null;
        const exists = list.some(
          (a) => (a.id || a.anomaly_id) === prevSelected
        );
        return exists ? prevSelected : null;
      });
    } catch (err) {
      console.error('[SPOTCheck] Error loading triage queue:', err);
      setError(err instanceof Error ? err.message : 'Failed to load triage queue');
    } finally {
      setIsLoading(false);
    }
  }, [onAnomaliesChange]);

  useEffect(() => {
    if (!initialAnomalies) {
      reloadQueue();
    }
  }, [reloadQueue, initialAnomalies]);

  // Compute summary stats for every waypoint
  const waypointSummaries = useMemo(() => {
    return computeWaypointSummaries(anomalies);
  }, [anomalies]);

  // Compute filtered queue maintaining backend order
  const filteredAnomalies = useMemo(() => {
    return filterAnomalies(anomalies, {
      waypointId: selectedWaypointId,
      reviewRequiredOnly,
    });
  }, [anomalies, selectedWaypointId, reviewRequiredOnly]);

  // Selection actions
  const selectWaypoint = useCallback((waypointId: string | null) => {
    const normalized = waypointId ? normalizeWaypointId(waypointId) : null;
    setSelectedWaypointId((prev) => {
      // Toggle off if clicking the already selected waypoint
      if (prev && normalized && prev === normalized) {
        return null;
      }
      return normalized;
    });
  }, []);

  const selectAnomaly = useCallback(
    (anomalyId: string | null) => {
      setSelectedAnomalyId(anomalyId);

      if (!anomalyId) return;

      // Pass check requirement: logging anomaly ID to console
      console.log(anomalyId);

      // Automatically sync waypoint selection to the anomaly's location
      const found = anomalies.find((a) => (a.id || a.anomaly_id) === anomalyId);
      if (found?.location_id) {
        setSelectedWaypointId(normalizeWaypointId(found.location_id));
      }
    },
    [anomalies]
  );

  const clearFilter = useCallback(() => {
    setSelectedWaypointId(null);
  }, []);

  const clearAllSelection = useCallback(() => {
    setSelectedWaypointId(null);
    setSelectedAnomalyId(null);
    setHoveredAnomalyId(null);
    setHoveredWaypointId(null);
  }, []);

  // Cycle through CRITICAL anomalies in queue order
  const selectNextCritical = useCallback(() => {
    const criticalList = anomalies.filter(
      (a) => toStatus(a.severity) === 'critical'
    );
    if (criticalList.length === 0) return;

    if (!selectedAnomalyId) {
      selectAnomaly(criticalList[0].id || criticalList[0].anomaly_id);
      return;
    }

    const currentIndex = criticalList.findIndex(
      (a) => (a.id || a.anomaly_id) === selectedAnomalyId
    );

    const nextIndex =
      currentIndex >= 0 && currentIndex < criticalList.length - 1
        ? currentIndex + 1
        : 0;

    const nextItem = criticalList[nextIndex];
    selectAnomaly(nextItem.id || nextItem.anomaly_id);
  }, [anomalies, selectedAnomalyId, selectAnomaly]);

  const value: TriageContextValue = useMemo(
    () => ({
      anomalies,
      filteredAnomalies,
      waypointSummaries,
      isLoading,
      error,
      selectedWaypointId,
      selectedAnomalyId,
      hoveredAnomalyId,
      hoveredWaypointId,
      reviewRequiredOnly,
      activeAnomalyId: selectedAnomalyId,
      selectWaypoint,
      selectAnomaly,
      setHoveredAnomalyId,
      setHoveredWaypointId,
      setReviewRequiredOnly,
      clearFilter,
      clearAllSelection,
      selectNextCritical,
      reloadQueue,
    }),
    [
      anomalies,
      filteredAnomalies,
      waypointSummaries,
      isLoading,
      error,
      selectedWaypointId,
      selectedAnomalyId,
      hoveredAnomalyId,
      hoveredWaypointId,
      reviewRequiredOnly,
      selectWaypoint,
      selectAnomaly,
      clearFilter,
      clearAllSelection,
      selectNextCritical,
      reloadQueue,
    ]
  );

  return <TriageContext.Provider value={value}>{children}</TriageContext.Provider>;
}

export function useTriage(): TriageContextValue {
  const context = useContext(TriageContext);
  if (!context) {
    throw new Error('useTriage must be used within a TriageProvider');
  }
  return context;
}
