/**
 * Map zoom-restore controller logic.
 * Manages view preservation across selection transitions:
 * - Stores map overview view (center + zoom) when transitioning from unselected to selected.
 * - Preserves the initial stored view when switching between selected items (A -> B).
 * - Restores the saved view (or triggers fitBounds fallback) on deselection / clear.
 */

export interface MapView {
  center: [number, number];
  zoom: number;
}

export interface MapZoomState {
  savedOverview: MapView | null;
  activeWaypointId: string | null;
}

export type FocusTransitionAction =
  | { type: 'ZOOM_IN'; targetWaypointId: string }
  | { type: 'RESTORE_OVERVIEW'; view: MapView }
  | { type: 'FALLBACK_BOUNDS' }
  | { type: 'NONE' };

export function initialMapZoomState(initialWaypointId: string | null = null): MapZoomState {
  return {
    savedOverview: null,
    activeWaypointId: initialWaypointId,
  };
}

export function handleWaypointFocusTransition(
  currentState: MapZoomState,
  nextWaypointId: string | null,
  currentMapView: MapView
): {
  nextState: MapZoomState;
  action: FocusTransitionAction;
} {
  const prevId = currentState.activeWaypointId;

  // Clear / Deselect transition
  if (prevId && !nextWaypointId) {
    if (currentState.savedOverview) {
      const restoredView = currentState.savedOverview;
      return {
        nextState: {
          savedOverview: null,
          activeWaypointId: null,
        },
        action: { type: 'RESTORE_OVERVIEW', view: restoredView },
      };
    } else {
      return {
        nextState: {
          savedOverview: null,
          activeWaypointId: null,
        },
        action: { type: 'FALLBACK_BOUNDS' },
      };
    }
  }

  // Initial selection from unselected state
  if (!prevId && nextWaypointId) {
    return {
      nextState: {
        savedOverview: currentMapView,
        activeWaypointId: nextWaypointId,
      },
      action: { type: 'ZOOM_IN', targetWaypointId: nextWaypointId },
    };
  }

  // Switching selection from A to B (saved overview MUST NOT be overwritten)
  if (prevId && nextWaypointId && prevId !== nextWaypointId) {
    return {
      nextState: {
        savedOverview: currentState.savedOverview,
        activeWaypointId: nextWaypointId,
      },
      action: { type: 'ZOOM_IN', targetWaypointId: nextWaypointId },
    };
  }

  return {
    nextState: currentState,
    action: { type: 'NONE' },
  };
}
