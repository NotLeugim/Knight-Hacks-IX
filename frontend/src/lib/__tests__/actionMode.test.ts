import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateSingleAction,
  resolveWaypointActionStatus,
  computeAllWaypointsActionSummaries,
  ActionRecord,
  ACTION_MODE_THEME,
} from '../actionMode';
import { actionsFixture } from '../actionsFixture';

describe('Action Mode Overlay Helper (Status & Color Resolution)', () => {
  it('correctly maps single action outcomes according to specification', () => {
    // Green: action succeeded
    assert.equal(
      evaluateSingleAction({
        action_id: 'A1',
        location_id: 'WP01',
        status: 'SUCCESS',
      }),
      'green'
    );

    // Yellow: Medium or Low anomaly
    assert.equal(
      evaluateSingleAction({
        action_id: 'A2',
        location_id: 'WP01',
        status: 'SUCCESS',
        severity: 'LOW',
      }),
      'yellow'
    );
    assert.equal(
      evaluateSingleAction({
        action_id: 'A3',
        location_id: 'WP01',
        status: 'SUCCESS',
        severity: 'MEDIUM',
      }),
      'yellow'
    );

    // Red: High or Critical anomaly, or a failed action
    assert.equal(
      evaluateSingleAction({
        action_id: 'A4',
        location_id: 'WP01',
        status: 'FAILED',
      }),
      'red'
    );
    assert.equal(
      evaluateSingleAction({
        action_id: 'A5',
        location_id: 'WP01',
        status: 'SUCCESS',
        severity: 'HIGH',
      }),
      'red'
    );
    assert.equal(
      evaluateSingleAction({
        action_id: 'A6',
        location_id: 'WP01',
        status: 'SUCCESS',
        severity: 'CRITICAL',
      }),
      'red'
    );
  });

  it('enforces worst-severity precedence (Red > Yellow > Green) when multiple actions exist', () => {
    const mixedActions: ActionRecord[] = [
      {
        action_id: 'A10',
        location_id: 'WP05',
        status: 'SUCCESS',
      },
      {
        action_id: 'A11',
        location_id: 'WP05',
        status: 'SUCCESS',
        severity: 'LOW',
      },
      {
        action_id: 'A12',
        location_id: 'WP05',
        status: 'FAILED',
        failure_type: 'OBSTACLE_DETECTION',
      },
    ];

    const summary = resolveWaypointActionStatus('WP05', mixedActions);
    assert.equal(summary.color, 'red');
    assert.equal(summary.isRed, true);
    assert.equal(summary.totalActions, 3);
    assert.equal(summary.failedCount, 1);
    assert.equal(summary.worstAction?.action_id, 'A12');
  });

  it('prioritizes Yellow over Green when actions have low/medium anomalies without failures', () => {
    const warningActions: ActionRecord[] = [
      {
        action_id: 'A20',
        location_id: 'WP13',
        status: 'SUCCESS',
      },
      {
        action_id: 'A21',
        location_id: 'WP13',
        status: 'SUCCESS',
        severity: 'MEDIUM',
        anomaly_type: 'VISUAL_DEFECT',
      },
    ];

    const summary = resolveWaypointActionStatus('WP13', warningActions);
    assert.equal(summary.color, 'yellow');
    assert.equal(summary.isRed, false);
    assert.equal(summary.worstAction?.action_id, 'A21');
  });

  it('returns Green when all actions for a waypoint succeeded cleanly', () => {
    const cleanActions: ActionRecord[] = [
      {
        action_id: 'A30',
        location_id: 'WP14',
        status: 'SUCCESS',
      },
      {
        action_id: 'A31',
        location_id: 'WP14',
        status: 'SUCCESS',
      },
    ];

    const summary = resolveWaypointActionStatus('WP14', cleanActions);
    assert.equal(summary.color, 'green');
    assert.equal(summary.isRed, false);
    assert.equal(summary.failedCount, 0);
  });

  it('handles waypoints with no matching action rows gracefully (neutral)', () => {
    const summary = resolveWaypointActionStatus('WP99', []);
    assert.equal(summary.color, 'neutral');
    assert.equal(summary.isRed, false);
    assert.equal(summary.totalActions, 0);
    assert.equal(summary.worstAction, null);
    assert.equal(summary.badgeHex, ACTION_MODE_THEME.neutral.hex);
  });

  it('accurately evaluates actual actions.csv fixture data across all waypoints', () => {
    const waypoints = Array.from({ length: 15 }, (_, i) => `WP${String(i + 1).padStart(2, '0')}`);
    const summaries = computeAllWaypointsActionSummaries(waypoints, actionsFixture);

    // Clean mission waypoint WP14 has all successful actions and 0 anomalies
    assert.equal(summaries['WP14'].color, 'green');
    assert.equal(summaries['WP14'].isRed, false);
    assert.equal(summaries['WP14'].failedCount, 0);

    // WP13 has medium anomaly but no failed actions -> yellow
    assert.equal(summaries['WP13'].color, 'yellow');
    assert.equal(summaries['WP13'].isRed, false);

    // WP01-WP12 and WP15 have failed actions or high/critical anomalies -> red
    assert.equal(summaries['WP01'].color, 'red');
    assert.equal(summaries['WP01'].isRed, true);
    assert.ok(summaries['WP01'].worstAction);

    assert.equal(summaries['WP05'].color, 'red');
    assert.equal(summaries['WP05'].isRed, true);

    assert.equal(summaries['WP07'].color, 'red');
    assert.equal(summaries['WP07'].isRed, true);

    assert.equal(summaries['WP15'].color, 'red');
    assert.equal(summaries['WP15'].isRed, true);
  });
});
