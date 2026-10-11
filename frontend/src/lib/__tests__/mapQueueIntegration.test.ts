import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeWaypointId,
  computeWaypointSummaries,
  filterAnomalies,
} from '../triageSelectors';
import { getSeverityTheme } from '../severity';
import { TriageAnomaly } from '../triageTypes';

const TEST_ANOMALIES: TriageAnomaly[] = [
  {
    id: 'AN014',
    title: 'Critical Temp',
    description: 'Overheating HX-204',
    severity: 'CRITICAL',
    location_id: 'WP07',
    asset_id: 'HX-204',
    operator_review_required: true,
    timestamp: '2026-09-08T02:08:00',
  },
  {
    id: 'AN002',
    title: 'Gauge Out of Range',
    description: 'Pressure high',
    severity: 'HIGH',
    location_id: 'WP06',
    asset_id: 'HX-217',
    operator_review_required: true,
    timestamp: '2026-09-06T02:07:48',
  },
  {
    id: 'AN006',
    title: 'Visual Defect',
    description: 'Coating issue',
    severity: 'MEDIUM',
    location_id: 'WP07', // Second anomaly at WP07
    asset_id: 'HX-208',
    operator_review_required: false,
    timestamp: '2026-09-03T10:21:42',
  },
  {
    id: 'AN099',
    title: 'Unmapped Sensor Anomaly',
    description: 'Sensor without map node',
    severity: 'LOW',
    location_id: 'WP99', // Orphaned location
    asset_id: 'ORPHAN-01',
    operator_review_required: false,
    timestamp: '2026-09-01T00:00:00',
  },
];

describe('Map <-> Queue Integration Logic', () => {
  it('Map marker click filters queue to that waypoint with accurate count', () => {
    // When WP07 is selected on map
    const filtered = filterAnomalies(TEST_ANOMALIES, { waypointId: 'WP07' });
    assert.equal(filtered.length, 2);
    assert.equal(filtered[0].id, 'AN014');
    assert.equal(filtered[1].id, 'AN006');

    // Summaries show worst severity wins (CRITICAL beats MEDIUM)
    const summaries = computeWaypointSummaries(TEST_ANOMALIES);
    assert.equal(summaries['WP07'].worstSeverity, 'CRITICAL');
    assert.equal(summaries['WP07'].count, 2);
    assert.equal(getSeverityTheme(summaries['WP07'].worstSeverity).textColor, 'text-red-400');
  });

  it('Queue card click locates the matching waypoint even with unnormalized IDs', () => {
    const selectedAnomaly = TEST_ANOMALIES.find(a => a.id === 'AN002');
    assert.ok(selectedAnomaly);
    const targetWp = normalizeWaypointId(selectedAnomaly.location_id);
    assert.equal(targetWp, 'WP06');

    const summaries = computeWaypointSummaries(TEST_ANOMALIES);
    assert.equal(summaries[targetWp].worstSeverity, 'HIGH');
    assert.equal(getSeverityTheme(summaries[targetWp].worstSeverity).textColor, 'text-red-400');
  });

  it('Clearing filter restores complete queue in original backend order', () => {
    const unfiltered = filterAnomalies(TEST_ANOMALIES, { waypointId: null });
    assert.equal(unfiltered.length, 4);
    assert.equal(unfiltered[0].id, 'AN014');
    assert.equal(unfiltered[1].id, 'AN002');
    assert.equal(unfiltered[2].id, 'AN006');
    assert.equal(unfiltered[3].id, 'AN099');
  });

  it('Orphaned anomalies without map nodes are preserved in queue and do not break summarizer', () => {
    const summaries = computeWaypointSummaries(TEST_ANOMALIES);
    // WP99 is computed safely
    assert.ok(summaries['WP99']);
    assert.equal(summaries['WP99'].count, 1);
    assert.equal(summaries['WP99'].worstSeverity, 'LOW');

    // Filtering to WP99 works
    const filteredOrphan = filterAnomalies(TEST_ANOMALIES, { waypointId: 'WP99' });
    assert.equal(filteredOrphan.length, 1);
    assert.equal(filteredOrphan[0].id, 'AN099');
  });

  it('Operator review filter isolates review_required items while retaining order', () => {
    const reviewRequired = filterAnomalies(TEST_ANOMALIES, { reviewRequiredOnly: true });
    assert.equal(reviewRequired.length, 2);
    assert.equal(reviewRequired[0].id, 'AN014');
    assert.equal(reviewRequired[1].id, 'AN002');
    assert.equal(reviewRequired.every(a => a.operator_review_required), true);
  });
});

import {
  handleWaypointFocusTransition,
  initialMapZoomState,
  MapView,
} from '../mapZoomRestore';

describe('Map Zoom-Restore Overview Controller', () => {
  const initialOverview: MapView = { center: [500, 642], zoom: 0.1 };

  it('captures map overview view on first selection transition from no selection', () => {
    const state0 = initialMapZoomState(null);
    const result1 = handleWaypointFocusTransition(state0, 'WP04', initialOverview);

    assert.equal(result1.action.type, 'ZOOM_IN');
    if (result1.action.type === 'ZOOM_IN') {
      assert.equal(result1.action.targetWaypointId, 'WP04');
    }
    assert.deepEqual(result1.nextState.savedOverview, initialOverview);
    assert.equal(result1.nextState.activeWaypointId, 'WP04');
  });

  it('does NOT overwrite stored overview when selecting item B after item A', () => {
    const state0 = initialMapZoomState(null);
    // User selects WP04 from overview
    const res1 = handleWaypointFocusTransition(state0, 'WP04', initialOverview);
    assert.deepEqual(res1.nextState.savedOverview, initialOverview);

    // Later, while focused on WP04, camera moved to zoomed in view:
    const zoomedInView: MapView = { center: [868, 359], zoom: 0.8 };

    // User switches to WP07 directly (item B)
    const res2 = handleWaypointFocusTransition(res1.nextState, 'WP07', zoomedInView);
    assert.equal(res2.action.type, 'ZOOM_IN');
    if (res2.action.type === 'ZOOM_IN') {
      assert.equal(res2.action.targetWaypointId, 'WP07');
    }
    // Stored overview MUST STILL BE initialOverview, NOT zoomedInView!
    assert.deepEqual(res2.nextState.savedOverview, initialOverview);
    assert.equal(res2.nextState.activeWaypointId, 'WP07');
  });

  it('restores the original overview on clear after switching between multiple items', () => {
    const state0 = initialMapZoomState(null);
    const res1 = handleWaypointFocusTransition(state0, 'WP04', initialOverview);
    const intermediateView: MapView = { center: [868, 359], zoom: 0.8 };
    const res2 = handleWaypointFocusTransition(res1.nextState, 'WP07', intermediateView);

    // Now clear selection (Escape, map background click, chip ✕)
    const clearResult = handleWaypointFocusTransition(res2.nextState, null, intermediateView);
    assert.equal(clearResult.action.type, 'RESTORE_OVERVIEW');
    if (clearResult.action.type === 'RESTORE_OVERVIEW') {
      assert.deepEqual(clearResult.action.view, initialOverview);
    }
    assert.equal(clearResult.nextState.savedOverview, null);
    assert.equal(clearResult.nextState.activeWaypointId, null);
  });

  it('falls back to bounds fitting when clearing if component loaded with selection', () => {
    // Loaded with WP02 already selected, so no stored overview exists
    const loadedState = initialMapZoomState('WP02');
    assert.equal(loadedState.savedOverview, null);

    const clearResult = handleWaypointFocusTransition(loadedState, null, {
      center: [463, 165],
      zoom: 0.6,
    });
    assert.equal(clearResult.action.type, 'FALLBACK_BOUNDS');
    assert.equal(clearResult.nextState.activeWaypointId, null);
    assert.equal(clearResult.nextState.savedOverview, null);
  });
});
