import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateWaypointActions,
  computeHeatRamp,
  resolveWaypointHeat,
  computeAllWaypointsHeat,
  getHeatColor,
  ActionRecord,
} from '../actionMode';
import { actionsFixture } from '../actionsFixture';

describe('Action Mode Failure Heat Map Logic', () => {
  it('keeps waypoint calm green when it has HIGH/CRITICAL anomalies but ZERO failed actions', () => {
    // This directly tests the bug fix: anomaly severity MUST NOT decide color!
    const anomalyOnlyActions: ActionRecord[] = [
      {
        action_id: 'A100',
        location_id: 'WP07',
        status: 'SUCCESS',
        severity: 'CRITICAL',
        anomaly_type: 'ABNORMAL_TEMPERATURE',
      },
      {
        action_id: 'A101',
        location_id: 'WP07',
        status: 'SUCCESS',
        severity: 'HIGH',
        anomaly_type: 'GAUGE_OUT_OF_RANGE',
      },
    ];

    const heat = resolveWaypointHeat('WP07', anomalyOnlyActions);
    assert.equal(heat.failedCount, 0);
    assert.equal(heat.failureRate, 0);
    assert.equal(heat.heatScore, 0);
    assert.equal(heat.color, '#10b981'); // Calm Green!
    assert.equal(heat.isFailing, false);
    assert.equal(heat.failedActions.length, 0);
  });

  it('evaluates all-success actions as cool calm green with zero heat', () => {
    const cleanActions: ActionRecord[] = [
      {
        action_id: 'A1',
        location_id: 'WP14',
        status: 'SUCCESS',
      },
      {
        action_id: 'A2',
        location_id: 'WP14',
        status: 'SUCCESS',
      },
      {
        action_id: 'A3',
        location_id: 'WP14',
        status: 'SUCCESS',
      },
    ];

    const heat = resolveWaypointHeat('WP14', cleanActions);
    assert.equal(heat.failedCount, 0);
    assert.equal(heat.totalCount, 3);
    assert.equal(heat.failureRate, 0);
    assert.equal(heat.color, '#10b981');
    assert.equal(heat.heatScore, 0);
    assert.equal(heat.glowRadius, 24);
    assert.equal(heat.isFailing, false);
  });

  it('evaluates all-failed actions as hottest crimson/red with max heat score', () => {
    const failedActions: ActionRecord[] = [
      {
        action_id: 'F1',
        location_id: 'WP05',
        status: 'FAILED',
        failure_type: 'SENSOR_TIMEOUT',
      },
      {
        action_id: 'F2',
        location_id: 'WP05',
        status: 'FAILED',
        failure_type: 'OBSTACLE_DETECTION',
      },
    ];

    const heat = resolveWaypointHeat('WP05', failedActions);
    assert.equal(heat.failedCount, 2);
    assert.equal(heat.totalCount, 2);
    assert.equal(heat.failureRate, 1.0);
    assert.ok(heat.heatScore > 0.7);
    // Should be in red spectrum (#ef4444 or deeper)
    assert.match(heat.color, /^#(ef|dc|e|d)/i);
    assert.equal(heat.isFailing, true);
    assert.equal(heat.failedActions.length, 2);
    assert.equal(heat.failedActions[0].action_id, 'F1');
  });

  it('evaluates mixed action outcomes with continuous yellow/orange heat ramp', () => {
    const mixedActions: ActionRecord[] = [
      { action_id: 'M1', location_id: 'WP02', status: 'FAILED' },
      { action_id: 'M2', location_id: 'WP02', status: 'SUCCESS' },
      { action_id: 'M3', location_id: 'WP02', status: 'SUCCESS' },
      { action_id: 'M4', location_id: 'WP02', status: 'SUCCESS' },
    ];

    const heat = resolveWaypointHeat('WP02', mixedActions);
    assert.equal(heat.failedCount, 1);
    assert.equal(heat.totalCount, 4);
    assert.equal(heat.failureRate, 0.25);
    assert.ok(heat.heatScore > 0.15 && heat.heatScore < 0.6);
    assert.equal(heat.isFailing, true);
    assert.equal(heat.failedActions.length, 1);
  });

  it('scales heat intensity and glow radius with failedCount so high failure volume reads hotter', () => {
    // Two waypoints with identical failureRate (50%), but WP_A has 1 failure while WP_B has 10 failures
    const lowCountRamp = computeHeatRamp(1, 2, 0.5);
    const highCountRamp = computeHeatRamp(10, 20, 0.5);

    assert.ok(
      highCountRamp.heatScore > lowCountRamp.heatScore,
      'Higher failure count should produce a higher heat score'
    );
    assert.ok(
      highCountRamp.glowRadius > lowCountRamp.glowRadius,
      'Higher failure count should produce a larger glow radius for visual blending'
    );
    assert.ok(
      highCountRamp.glowOpacity >= lowCountRamp.glowOpacity,
      'Higher failure count should produce higher or equal opacity'
    );
  });

  it('handles waypoints with zero actions gracefully (cool calm green, 0 heat)', () => {
    const heat = resolveWaypointHeat('WP99', []);
    assert.equal(heat.failedCount, 0);
    assert.equal(heat.totalCount, 0);
    assert.equal(heat.failureRate, 0);
    assert.equal(heat.heatScore, 0);
    assert.equal(heat.color, '#10b981');
    assert.equal(heat.isFailing, false);
    assert.equal(heat.failedActions.length, 0);
  });

  it('accurately computes failure heat across actual actionsFixture data', () => {
    const waypointIds = Array.from({ length: 15 }, (_, i) => `WP${String(i + 1).padStart(2, '0')}`);
    const heatMap = computeAllWaypointsHeat(waypointIds, actionsFixture);

    // WP14 has 10 actions, 0 failed -> must be calm green
    assert.equal(heatMap['WP14'].failedCount, 0);
    assert.equal(heatMap['WP14'].color, '#10b981');
    assert.equal(heatMap['WP14'].isFailing, false);

    // WP13 had a medium anomaly in anomalies.csv, but 0 failed actions in actions.csv -> must be calm green!
    assert.equal(heatMap['WP13'].failedCount, 0);
    assert.equal(heatMap['WP13'].color, '#10b981');
    assert.equal(heatMap['WP13'].isFailing, false);

    // WP05 has 11 failed actions -> hottest waypoint
    assert.equal(heatMap['WP05'].failedCount, 11);
    assert.ok(heatMap['WP05'].glowRadius >= 70);
    assert.equal(heatMap['WP05'].isFailing, true);

    // WP09 has 8 failed actions -> very hot waypoint
    assert.equal(heatMap['WP09'].failedCount, 8);
    assert.equal(heatMap['WP09'].isFailing, true);
  });
});
