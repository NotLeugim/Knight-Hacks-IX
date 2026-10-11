import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatActionTypeName,
  groupFailedActionsByType,
  inferPossibleCauses,
  resolveWaypointFailureDetails,
  computeFleetFailureSummary,
  computeTooltipLayout,
  rectsIntersect,
} from '../actionFailureCauses';
import { ActionRecord } from '../actionMode';
import { actionsFixture } from '../actionsFixture';

test('Action Failure Causes & Grouping Helpers', async (t) => {
  await t.test('formats action type names properly', () => {
    assert.equal(formatActionTypeName('NAVIGATION'), 'Navigation');
    assert.equal(formatActionTypeName('THERMAL_INSPECTION'), 'Thermal inspection');
    assert.equal(formatActionTypeName('ACOUSTIC_INSPECTION'), 'Acoustic inspection');
    assert.equal(formatActionTypeName(''), 'Unspecified');
  });

  await t.test('groups failed actions by action type with accurate percentages', () => {
    const actions: ActionRecord[] = [
      {
        action_id: 'A1',
        location_id: 'WP05',
        action_type: 'NAVIGATION',
        status: 'FAILED',
        failure_type: 'OBSTACLE_DETECTION',
      },
      {
        action_id: 'A2',
        location_id: 'WP05',
        action_type: 'NAVIGATION',
        status: 'FAILED',
        failure_type: 'LOCALIZATION_FAILURE',
      },
      {
        action_id: 'A3',
        location_id: 'WP05',
        action_type: 'THERMAL_INSPECTION',
        status: 'FAILED',
        failure_type: 'TARGET_NOT_DETECTED',
      },
      {
        action_id: 'A4',
        location_id: 'WP05',
        action_type: 'ACOUSTIC_INSPECTION',
        status: 'FAILED',
        failure_type: 'SENSOR_TIMEOUT',
      },
    ];

    const breakdown = groupFailedActionsByType(actions);
    assert.equal(breakdown.length, 3);
    assert.equal(breakdown[0].actionType, 'Navigation');
    assert.equal(breakdown[0].count, 2);
    assert.equal(breakdown[0].percentage, 50);
    assert.deepEqual(breakdown[0].failureTypes.sort(), ['LOCALIZATION_FAILURE', 'OBSTACLE_DETECTION']);

    assert.equal(breakdown[1].actionType, 'Thermal inspection');
    assert.equal(breakdown[1].count, 1);
    assert.equal(breakdown[1].percentage, 25);
  });

  await t.test('infers battery depletion hypothesis when failures occur with battery < 25%', () => {
    const actions: ActionRecord[] = [
      {
        action_id: 'A1',
        location_id: 'WP08',
        action_type: 'GAUGE_READING',
        status: 'FAILED',
        battery_pct: 18,
        failure_type: 'SENSOR_TIMEOUT',
      },
      {
        action_id: 'A2',
        location_id: 'WP08',
        action_type: 'THERMAL_INSPECTION',
        status: 'FAILED',
        battery_pct: 14,
        failure_type: 'READING_UNRELIABLE',
      },
    ];

    const causes = inferPossibleCauses(actions);
    const batteryCause = causes.find((c) => c.category === 'Robot state (battery)');
    assert.ok(batteryCause, 'Should produce a Robot state (battery) hypothesis');
    assert.equal(batteryCause.explainedCount, 2);
    assert.equal(batteryCause.explainedPercentage, 100);
    assert.match(batteryCause.evidence, /All 2 failures occurred when battery was low/i);
  });

  await t.test('identifies single-asset hardware clustering', () => {
    const actions: ActionRecord[] = [
      {
        action_id: 'A1',
        location_id: 'WP01',
        asset_id: 'PANEL-215',
        action_type: 'ACOUSTIC_INSPECTION',
        status: 'FAILED',
        failure_type: 'SENSOR_TIMEOUT',
      },
      {
        action_id: 'A2',
        location_id: 'WP01',
        asset_id: 'PANEL-215',
        action_type: 'ACOUSTIC_INSPECTION',
        status: 'FAILED',
        failure_type: 'READING_UNRELIABLE',
      },
      {
        action_id: 'A3',
        location_id: 'WP01',
        asset_id: 'PANEL-215',
        action_type: 'NAVIGATION',
        status: 'FAILED',
        failure_type: 'OBSTACLE_DETECTION',
      },
    ];

    const causes = inferPossibleCauses(actions);
    const assetCause = causes.find((c) => c.category === 'Equipment/Sensor' && c.hypothesis.includes('PANEL-215'));
    assert.ok(assetCause, 'Should flag clustering on PANEL-215');
    assert.equal(assetCause.explainedCount, 3);
    assert.match(assetCause.evidence, /All 3 failures occurred on asset PANEL-215/i);
  });

  await t.test('assigns failures with NO supporting signal or reason to Unknown / needs investigation', () => {
    const unexplainableActions: ActionRecord[] = [
      {
        action_id: 'A_UNKNOWN_1',
        location_id: 'WP99',
        action_type: 'CUSTOM_INSPECTION',
        status: 'FAILED',
        battery_pct: 88, // healthy battery
        failure_type: '', // no failure reason
        asset_id: 'UNIQUE_ASSET_1', // single isolated asset
      },
      {
        action_id: 'A_UNKNOWN_2',
        location_id: 'WP99',
        action_type: 'CUSTOM_INSPECTION_2',
        status: 'FAILED',
        battery_pct: 92, // healthy battery
        failure_type: '', // no failure reason
        asset_id: 'UNIQUE_ASSET_2', // single isolated asset
      },
    ];

    const causes = inferPossibleCauses(unexplainableActions);
    const unknownCause = causes.find((c) => c.category === 'Unknown');
    assert.ok(unknownCause, 'Must produce an Unknown category hypothesis for unexplainable failures');
    assert.equal(unknownCause.explainedCount, 2);
    assert.match(unknownCause.evidence, /no supporting sensor reason/i);
  });

  await t.test('handles zero failures gracefully without crashing', () => {
    const emptyDetails = resolveWaypointFailureDetails('WP13', []);
    assert.equal(emptyDetails.failedCount, 0);
    assert.equal(emptyDetails.failureRate, 0);
    assert.deepEqual(emptyDetails.actionTypeBreakdown, []);
    assert.deepEqual(emptyDetails.possibleCauses, []);
  });

  await t.test('evaluates actual actionsFixture data accurately', () => {
    // Test WP05 (highest failure point)
    const wp05 = resolveWaypointFailureDetails('WP05', actionsFixture);
    assert.equal(wp05.waypointId, 'WP05');
    assert.equal(wp05.failedCount, 11);
    assert.ok(wp05.totalCount >= 40);
    assert.ok(wp05.actionTypeBreakdown.length > 0);
    assert.equal(wp05.actionTypeBreakdown[0].actionType, 'Navigation');
    assert.ok(wp05.possibleCauses.length > 0);

    // Test WP13 (all clear nominal node)
    const wp13 = resolveWaypointFailureDetails('WP13', actionsFixture);
    assert.equal(wp13.failedCount, 0);
    assert.equal(wp13.possibleCauses.length, 0);

    // Test fleet summary
    const fleet = computeFleetFailureSummary(actionsFixture);
    assert.equal(fleet.totalFailedActions, 49);
    assert.equal(fleet.totalActions, 270);
    assert.ok(fleet.topFailingWaypoints.length > 0);
    assert.equal(fleet.topFailingWaypoints[0].waypointId, 'WP05');
    assert.equal(fleet.topFailingWaypoints[0].failedCount, 11);
    assert.ok(fleet.topFailedActionTypes.length > 0);
  });

  await t.test('computes collision-safe layout flipping below top nodes (WP04, WP06)', () => {
    const containerWidth = 1000;
    const containerHeight = 700;
    const tooltipWidth = 300;
    const tooltipHeight = 140;

    // Node near top edge (e.g. WP04 at Y=60)
    const resultWP04 = computeTooltipLayout({
      containerWidth,
      containerHeight,
      nodeX: 250,
      nodeY: 60,
      tooltipWidth,
      tooltipHeight,
      keepOutZones: [{ left: 16, top: 16, width: 400, height: 60 }], // Top-left controls
    });

    assert.equal(resultWP04.placement, 'bottom', 'Must flip below node when near top');
    assert.ok(resultWP04.y >= 60, 'Y must be below nodeY');
    assert.ok(resultWP04.y + resultWP04.height <= containerHeight, 'Must stay inside container bottom');
    assert.equal(resultWP04.arrowPlacement, 'top', 'Arrow must be on top edge pointing up');
    assert.ok(resultWP04.arrowLeft >= 16 && resultWP04.arrowLeft <= tooltipWidth - 16);

    // Node near top-right under summary card (e.g. WP06 at X=850, Y=70)
    const resultWP06 = computeTooltipLayout({
      containerWidth,
      containerHeight,
      nodeX: 850,
      nodeY: 70,
      tooltipWidth,
      tooltipHeight,
      keepOutZones: [{ left: 600, top: 16, width: 384, height: 260 }], // Summary card
    });

    assert.equal(resultWP06.placement, 'bottom', 'Must flip below node WP06');
    // Must evade summary card horizontally
    assert.ok(
      resultWP06.x + resultWP06.width <= 600 || resultWP06.y >= 276,
      'Must not intersect top-right summary card keep-out zone'
    );
    assert.ok(resultWP06.arrowLeft >= 16 && resultWP06.arrowLeft <= tooltipWidth - 16);
  });

  await t.test('clamps tooltip strictly within left and right container edges (WP07, WP01)', () => {
    const containerWidth = 900;
    const containerHeight = 600;
    const tooltipWidth = 300;
    const tooltipHeight = 140;
    const margin = 12;

    // Node near right edge (WP07 at X=880, Y=300)
    const resultRight = computeTooltipLayout({
      containerWidth,
      containerHeight,
      nodeX: 880,
      nodeY: 300,
      tooltipWidth,
      tooltipHeight,
      margin,
    });

    assert.ok(
      resultRight.x + resultRight.width <= containerWidth - margin,
      `Right edge ${resultRight.x + resultRight.width} must be <= ${containerWidth - margin}`
    );
    assert.ok(resultRight.x >= margin);
    // Arrow should be biased towards right edge of tooltip pointing at nodeX=880
    assert.ok(resultRight.arrowLeft >= tooltipWidth - 30, 'Arrow must slide right to point at edge node');

    // Node near left edge (WP01 at X=20, Y=300)
    const resultLeft = computeTooltipLayout({
      containerWidth,
      containerHeight,
      nodeX: 20,
      nodeY: 300,
      tooltipWidth,
      tooltipHeight,
      margin,
    });

    assert.ok(resultLeft.x >= margin, `Left edge ${resultLeft.x} must be >= ${margin}`);
    assert.ok(resultLeft.arrowLeft <= 30, 'Arrow must slide left to point at edge node');
  });

  await t.test('keeps tooltip inside container for bottom edge nodes (WP09, WP10)', () => {
    const containerWidth = 1000;
    const containerHeight = 700;
    const tooltipWidth = 300;
    const tooltipHeight = 140;
    const margin = 12;

    // Node near bottom (WP09 at X=700, Y=680)
    const resultBottom = computeTooltipLayout({
      containerWidth,
      containerHeight,
      nodeX: 700,
      nodeY: 680,
      tooltipWidth,
      tooltipHeight,
      margin,
    });

    assert.equal(resultBottom.placement, 'top', 'Must remain top placement when near bottom');
    assert.ok(resultBottom.y + resultBottom.height <= containerHeight - margin);
    assert.ok(resultBottom.y >= margin);
  });
});
