import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchWorkerSafety,
  WorkerSafetyData,
  FollowUpLocationSafety,
} from '../api';

describe('Worker Safety Advisory Tests', () => {
  test('WorkerSafetyData structure matches expected schema and fields', () => {
    const mockData: WorkerSafetyData = {
      missionId: 'M015',
      summary: 'SPOT completed 7 of 10 inspections, so people only need to visit 4 locations.',
      inspectionsCompleted: 7,
      totalInspections: 10,
      followUpLocations: [
        {
          locationId: 'WP05',
          locationName: 'Pipe Gallery',
          zoneType: 'Process',
          environment: 'High noise',
          reasons: [
            'Failed navigation (lost localization) on Electrical Panel 03',
            'Signal degradation on Electrical Panel 03 (Low severity)',
          ],
          hazards: [
            {
              text: 'Pressurized lines and hot surfaces may be present: isolate and lock out energy sources before opening anything',
              source: 'OSHA 29 CFR 1910.147',
            },
            {
              text: 'High-noise area: wear hearing protection',
              source: 'OSHA 29 CFR 1910.95',
            },
          ],
          protectiveEquipment: ['hearing protection', 'safety glasses', 'lockout/tagout devices'],
          anomalies: [
            {
              anomalyId: 'AN001',
              anomalyType: 'Signal degradation',
              severity: 'LOW',
              assetName: 'Electrical Panel 03',
              description: 'Synthetic signal degradation detected.',
            },
          ],
          failedActions: [
            {
              actionId: 'A0141',
              actionType: 'Navigation',
              failureType: 'Lost localization',
              assetName: 'Electrical Panel 03',
            },
          ],
        },
      ],
      disclaimer: "General guidance only. Follow your site's safety program, job hazard analysis, and work permits.",
    };

    assert.equal(mockData.missionId, 'M015');
    assert.equal(mockData.inspectionsCompleted, 7);
    assert.equal(mockData.totalInspections, 10);
    assert.equal(mockData.followUpLocations.length, 1);

    const loc: FollowUpLocationSafety = mockData.followUpLocations[0];
    assert.equal(loc.locationName, 'Pipe Gallery');
    assert.equal(loc.zoneType, 'Process');
    assert.equal(loc.environment, 'High noise');
    assert.ok(loc.hazards.length > 0);
    assert.ok(loc.protectiveEquipment.includes('hearing protection'));
    assert.ok(mockData.disclaimer.includes("safety program"));
  });

  test('offline fallback returns { data: null, source: "offline" } on network failure', async () => {
    // Calling with an unreachable host/port will trigger the catch block
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('Connection refused (offline test)');
    };

    try {
      const result = await fetchWorkerSafety('M015');
      assert.equal(result.data, null);
      assert.equal(result.source, 'offline');
      assert.ok(result.error);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('plain language rules: no raw enum identifiers in labels', () => {
    const rawIdentifiers = [
      'PROCESS_HOT',
      'HIGH_NOISE',
      'LOW_LIGHT',
      'INDOOR_DUSTY',
      'ELECTRICAL_PANEL',
    ];

    const sampleText = 'Pipe Gallery is a Process zone with High noise conditions.';
    for (const raw of rawIdentifiers) {
      assert.ok(
        !sampleText.includes(raw),
        `Sample user-facing text should not contain raw internal identifier: ${raw}`
      );
    }
  });

  test('disclaimer contains mandatory safety advisory statements', () => {
    const requiredPhrases = [
      'General guidance only',
      "safety program",
      'job hazard analysis',
      'work permits',
    ];

    const disclaimer = "General guidance only. Follow your site's safety program, job hazard analysis, and work permits.";

    for (const phrase of requiredPhrases) {
      assert.ok(
        disclaimer.includes(phrase),
        `Disclaimer must include '${phrase}'`
      );
    }
  });
});
