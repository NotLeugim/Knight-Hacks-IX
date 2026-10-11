# SPOTCheck: Map ↔ Triage Queue Integration (UI-3)

## Overview
The Map ↔ Triage Queue integration coordinates the **2D Facility Floor Plan** (`FacilityMap2D.tsx`) and the **Triage Queue Sidebar** (`TriageQueue.tsx`) into a unified operational dashboard for Boston Dynamics Orbit. 

Selecting a waypoint on the map filters the triage queue to anomalies at that specific waypoint; selecting an anomaly in the queue pans and zooms the map to its physical location.

---

## Architecture & Shared State
Shared state is managed by [`TriageContext`](../frontend/src/context/TriageContext.tsx) (`useTriage()` hook), wrapped at the root dashboard level in [`page.tsx`](../frontend/src/app/page.tsx).

### State Shape
```typescript
interface TriageContextValue {
  anomalies: TriageAnomaly[];             // Full queue fetched once from /api/triage
  filteredAnomalies: TriageAnomaly[];     // Filtered list (preserves backend order)
  waypointSummaries: Record<string, WaypointAnomalySummary>; // Precalculated metrics per waypoint
  isLoading: boolean;
  error: string | null;

  selectedWaypointId: string | null;      // Active waypoint filter (e.g. 'WP07')
  selectedAnomalyId: string | null;       // Active anomaly selection (e.g. 'AN014')
  hoveredAnomalyId: string | null;        // Synchronized hover state
  hoveredWaypointId: string | null;       // Synchronized hover state
  reviewRequiredOnly: boolean;            // Operator workflow toggle
  activeAnomalyId: string | null;         // AI Smart Drawer handoff hook

  selectWaypoint: (id: string | null) => void;
  selectAnomaly: (id: string | null) => void;
  clearFilter: () => void;
  clearAllSelection: () => void;
  selectNextCritical: () => void;
  reloadQueue: () => Promise<void>;
}
```

---

## Join Key & Normalization
- **Join Key**: Anomaly `location_id` joins with Waypoint Node `id`.
- **Known Waypoints**: `WP01` through `WP10` (Floor 1), `WP11` through `WP15` (Floor 2).
- **Normalization Helper**: [`normalizeWaypointId()`](../frontend/src/lib/triageSelectors.ts) standardizes varied inputs (e.g., `'wp7'`, `'WP-07'`, `'wp_7'`, `'WP07'`) into canonical uppercase `'WP##'` format.
- **Orphaned / Unmapped Data**: If an anomaly references an unmapped waypoint (e.g., `'WP99'` or empty), it displays a `Loc. Unavail` badge in the queue and degrades safely without crashing the map or breaking filters.

---

## Map Support Decision
- **2D Leaflet Map (`FacilityMap2D.tsx`)**: Primary operational map with full interactive support (dynamic marker styling, worst-severity color coding, pulsing halos, count badges, tooltips, interactive popups, auto-floor switching, and smooth fly-to animations).
- **3D Map Stub (`FacilityMap.tsx`)**: Degrades safely with no errors when toggled via the 2D/3D switcher.

---

## Severity & Styling Configuration
All visual tokens live in [`severity.ts`](../frontend/src/lib/severity.ts):
- **CRITICAL**: Red (`text-red-500`, `#ef4444`, pulsing halo)
- **HIGH**: Orange (`text-orange-500`, `#f97316`)
- **MEDIUM**: Yellow (`text-yellow-500`, `#eab308`)
- **LOW**: Blue (`text-blue-500`, `#3b82f6`)
- **NOMINAL / NEUTRAL**: Slate (`text-slate-400`, `#64748b`)

---

## Adding New Marker Styles or Filters
1. **New Severity Level**: Add entry in `SEVERITY_CONFIG` and update `SEVERITY_RANKS` in `severity.ts`.
2. **New Filter Criteria**:
   - Add filter field to `TriageFilterOptions` in `triageSelectors.ts`.
   - Update `filterAnomalies()` logic.
   - Expose state and toggle in `TriageContext.tsx`.
   - Add UI control button in `TriageQueue.tsx`.
