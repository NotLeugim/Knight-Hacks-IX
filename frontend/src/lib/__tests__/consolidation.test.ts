import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { analyticsFixture } from '../analyticsFixture';
import { fetchShiftHandoff, fetchMissionSummary } from '../api';

describe('Consolidated Navigation & Telemetry Tests', () => {
  test('analyticsFixture contains 27 missions and 72.1 fleet average', () => {
    assert.equal(analyticsFixture.confidence?.fleetAverage, 72.1);
    assert.equal(analyticsFixture.confidence?.missions.length, 27);
  });

  test('analyticsFixture contains configComparison for V1 and V2 without hardware/software wording', () => {
    const cc = analyticsFixture.configComparison;
    assert.ok(cc, 'configComparison should be defined');
    assert.equal(cc.V1.missions, 18);
    assert.equal(cc.V1.missionCompletionPct, 94.4);
    assert.equal(cc.V1.actionSuccessPct, 77.2);
    assert.equal(cc.V2.missions, 9);
    assert.equal(cc.V2.missionCompletionPct, 100.0);
    assert.equal(cc.V2.actionSuccessPct, 91.1);
    assert.equal(cc.equalBattery.V1.actionSuccessPct, 87.7);
    assert.equal(cc.equalBattery.V2.actionSuccessPct, 91.1);
  });

  test('fetchMissionSummary returns offline fallback when target server is unreachable', async () => {
    // Port 59999 should not have any listener
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('Connection refused');
    };

    try {
      const res = await fetchMissionSummary('M015');
      assert.equal(res.source, 'offline');
      assert.equal(res.data, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('fetchShiftHandoff returns offline fallback when target server is unreachable', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('Connection refused');
    };

    try {
      const res = await fetchShiftHandoff(3);
      assert.equal(res.source, 'offline');
      assert.deepEqual(res.missions, []);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
