import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeWaypointId,
  getAnomalyWaypointId,
  anomaliesByWaypoint,
  worstSeverityByWaypoint,
  countByWaypoint,
  computeWaypointSummaries,
  filterAnomalies,
} from '../triageSelectors';

import {
  getSeverityTheme,
  getSeverityRank,
  SEVERITY_RANKS,
} from '../severity';
import { TriageAnomaly } from '../triageTypes';

const SAMPLE_ANOMALIES: TriageAnomaly[] = [
  {
    id: 'AN014',
    title: 'Critical Overheating',
    description: 'Temp high',
    severity: 'CRITICAL',
    location_id: 'WP07',
    operator_review_required: true,
    timestamp: '2026-09-08T02:08:00',
  },
  {
    id: 'AN002',
    title: 'Gauge Out of Range',
    description: 'Pressure high',
    severity: 'HIGH',
    location_id: 'wp06', // lowercase
    operator_review_required: true,
    timestamp: '2026-09-06T02:07:48',
  },
  {
    id: 'AN006',
    title: 'Coating Discoloration',
    description: 'Visual issue',
    severity: 'MEDIUM',
    location_id: 'WP-07', // hyphenated
    operator_review_required: false,
    timestamp: '2026-09-03T10:21:42',
  },
  {
    id: 'AN001',
    title: 'Telemetry RSSI Drop',
    description: 'Signal low',
    severity: 'LOW',
    location_id: 'WP05',
    operator_review_required: false,
    timestamp: '2026-09-06T10:03:24',
  },
  {
    id: 'AN099',
    title: 'Unknown Location Anomaly',
    description: 'Mystery sensor',
    severity: 'UNKNOWN_SEV',
    location_id: 'WP99',
    operator_review_required: false,
    timestamp: '2026-09-06T10:03:24',
  },
];

describe('normalizeWaypointId', () => {
  it('standardizes various waypoint ID formats to WP##', () => {
    assert.equal(normalizeWaypointId('wp7'), 'WP07');
    assert.equal(normalizeWaypointId('WP-07'), 'WP07');
    assert.equal(normalizeWaypointId('wp_7'), 'WP07');
    assert.equal(normalizeWaypointId('WP07'), 'WP07');
    assert.equal(normalizeWaypointId('  wp09  '), 'WP09');
    assert.equal(normalizeWaypointId('WP15'), 'WP15');
    assert.equal(normalizeWaypointId('wp-12'), 'WP12');
  });

  it('handles empty, null, or undefined values gracefully', () => {
    assert.equal(normalizeWaypointId(''), '');
    assert.equal(normalizeWaypointId(null), '');
    assert.equal(normalizeWaypointId(undefined), '');
  });

  it('preserves non-standard IDs as uppercase trimmed', () => {
    assert.equal(normalizeWaypointId('zone-alpha'), 'ZONE-ALPHA');
  });
});

describe('severity helpers and ranking', () => {
  it('correctly maps severity ranks', () => {
    assert.equal(getSeverityRank('CRITICAL'), SEVERITY_RANKS.CRITICAL);
    assert.equal(getSeverityRank('critical'), SEVERITY_RANKS.CRITICAL);
    assert.equal(getSeverityRank('HIGH'), SEVERITY_RANKS.HIGH);
    assert.equal(getSeverityRank('MEDIUM'), SEVERITY_RANKS.MEDIUM);
    assert.equal(getSeverityRank('LOW'), SEVERITY_RANKS.LOW);
    assert.equal(getSeverityRank('unknown'), SEVERITY_RANKS.UNKNOWN);
    assert.equal(getSeverityRank(null), SEVERITY_RANKS.UNKNOWN);
  });

  it('applies case-insensitive theme lookups with exact Tailwind colors', () => {
    assert.equal(getSeverityTheme('CRITICAL').textColor, 'text-red-500');
    assert.equal(getSeverityTheme('high').textColor, 'text-orange-500');
    assert.equal(getSeverityTheme('Medium').textColor, 'text-yellow-500');
    assert.equal(getSeverityTheme('low').textColor, 'text-blue-500');
    assert.equal(getSeverityTheme('nonexistent').textColor, 'text-slate-400');
  });
});

describe('triage selectors', () => {
  it('finds anomalies by waypoint handling formatting variations', () => {
    const atWp7 = anomaliesByWaypoint(SAMPLE_ANOMALIES, 'wp7');
    assert.equal(atWp7.length, 2);
    assert.equal(atWp7[0].id, 'AN014');
    assert.equal(atWp7[1].id, 'AN006');
  });

  it('identifies worst severity at a waypoint', () => {
    assert.equal(worstSeverityByWaypoint(SAMPLE_ANOMALIES, 'WP07'), 'CRITICAL');
    assert.equal(worstSeverityByWaypoint(SAMPLE_ANOMALIES, 'WP06'), 'HIGH');
    assert.equal(worstSeverityByWaypoint(SAMPLE_ANOMALIES, 'WP05'), 'LOW');
    assert.equal(worstSeverityByWaypoint(SAMPLE_ANOMALIES, 'WP01'), null);
  });

  it('counts anomalies by waypoint', () => {
    assert.equal(countByWaypoint(SAMPLE_ANOMALIES, 'WP07'), 2);
    assert.equal(countByWaypoint(SAMPLE_ANOMALIES, 'WP06'), 1);
    assert.equal(countByWaypoint(SAMPLE_ANOMALIES, 'WP01'), 0);
  });

  it('computes summaries across all waypoints', () => {
    const summaries = computeWaypointSummaries(SAMPLE_ANOMALIES);
    assert.equal(summaries['WP07'].count, 2);
    assert.equal(summaries['WP07'].worstSeverity, 'CRITICAL');
    assert.equal(summaries['WP07'].hasCritical, true);
    assert.equal(summaries['WP07'].reviewRequiredCount, 1);

    assert.equal(summaries['WP05'].count, 1);
    assert.equal(summaries['WP05'].worstSeverity, 'LOW');
    assert.equal(summaries['WP05'].hasCritical, false);
  });

  it('filters anomalies preserving backend ordering', () => {
    // Filter by waypoint
    const filteredWp = filterAnomalies(SAMPLE_ANOMALIES, { waypointId: 'WP07' });
    assert.equal(filteredWp.length, 2);
    assert.equal(filteredWp[0].id, 'AN014');
    assert.equal(filteredWp[1].id, 'AN006');

    // Filter by review required
    const filteredReview = filterAnomalies(SAMPLE_ANOMALIES, { reviewRequiredOnly: true });
    assert.equal(filteredReview.length, 2);
    assert.equal(filteredReview[0].id, 'AN014');
    assert.equal(filteredReview[1].id, 'AN002');

    // Combined filter
    const combined = filterAnomalies(SAMPLE_ANOMALIES, {
      waypointId: 'WP07',
      reviewRequiredOnly: true,
    });
    assert.equal(combined.length, 1);
    assert.equal(combined[0].id, 'AN014');
  });

  it('handles empty anomaly list', () => {
    assert.deepEqual(anomaliesByWaypoint([], 'WP07'), []);
    assert.equal(worstSeverityByWaypoint([], 'WP07'), null);
    assert.equal(countByWaypoint([], 'WP07'), 0);
    assert.deepEqual(computeWaypointSummaries([]), {});
    assert.deepEqual(filterAnomalies([], {}), []);
  });
});
