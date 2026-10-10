/**
 * analyticsFixture.ts — Local fallback fixture for SPOTSight analytics.
 * Source CSVs:
 *   - data/SPOT_KnightHacks_Challenge_Kit Part One/02_DATA/actions.csv
 *   - data/SPOT_KnightHacks_Challenge_Kit Part One/02_DATA/missions.csv
 *
 * Used when GET /api/analytics is offline or returns an unexpected shape.
 */

import { AnalyticsResponse } from './analyticsTypes';

export const analyticsFixture: AnalyticsResponse = {
  batteryReliability: [
    { band: '<20%', minPct: 0, maxPct: 20, actions: 11, failed: 8, failureRatePct: 72.7 },
    { band: '20-30%', minPct: 20, maxPct: 30, actions: 26, failed: 11, failureRatePct: 42.3 },
    { band: '30-40%', minPct: 30, maxPct: 40, actions: 34, failed: 6, failureRatePct: 17.6 },
    { band: '40-50%', minPct: 40, maxPct: 50, actions: 32, failed: 6, failureRatePct: 18.8 },
    { band: '50-60%', minPct: 50, maxPct: 60, actions: 41, failed: 4, failureRatePct: 9.8 },
    { band: '60-70%', minPct: 60, maxPct: 70, actions: 47, failed: 1, failureRatePct: 2.1 },
    { band: '70%+', minPct: 70, maxPct: 101, actions: 79, failed: 13, failureRatePct: 16.5 },
  ],
  missionParadox: {
    summary: {
      reportedCompleted: 26,
      completedWithFailures: 21,
      completedClean: 5,
      reportedFailed: 1,
    },
    missions: [
      { missionId: 'M001', reportedStatus: 'COMPLETED', config: 'V1', actionsSucceeded: 8, actionsFailed: 2 },
      { missionId: 'M002', reportedStatus: 'COMPLETED', config: 'V1', actionsSucceeded: 9, actionsFailed: 1 },
      { missionId: 'M003', reportedStatus: 'COMPLETED', config: 'V1', actionsSucceeded: 7, actionsFailed: 3 },
      { missionId: 'M004', reportedStatus: 'COMPLETED', config: 'V1', actionsSucceeded: 8, actionsFailed: 2 },
      { missionId: 'M005', reportedStatus: 'COMPLETED', config: 'V1', actionsSucceeded: 10, actionsFailed: 0 },
      { missionId: 'M006', reportedStatus: 'COMPLETED', config: 'V1', actionsSucceeded: 7, actionsFailed: 3 },
      { missionId: 'M007', reportedStatus: 'COMPLETED', config: 'V1', actionsSucceeded: 8, actionsFailed: 2 },
      { missionId: 'M008', reportedStatus: 'COMPLETED', config: 'V1', actionsSucceeded: 7, actionsFailed: 3 },
      { missionId: 'M009', reportedStatus: 'COMPLETED', config: 'V1', actionsSucceeded: 7, actionsFailed: 3 },
      { missionId: 'M010', reportedStatus: 'COMPLETED', config: 'V1', actionsSucceeded: 7, actionsFailed: 3 },
      { missionId: 'M011', reportedStatus: 'COMPLETED', config: 'V1', actionsSucceeded: 8, actionsFailed: 2 },
      { missionId: 'M012', reportedStatus: 'COMPLETED', config: 'V1', actionsSucceeded: 7, actionsFailed: 3 },
      { missionId: 'M013', reportedStatus: 'COMPLETED', config: 'V1', actionsSucceeded: 8, actionsFailed: 2 },
      { missionId: 'M014', reportedStatus: 'COMPLETED', config: 'V1', actionsSucceeded: 7, actionsFailed: 3 },
      { missionId: 'M015', reportedStatus: 'COMPLETED', config: 'V1', actionsSucceeded: 7, actionsFailed: 3 },
      { missionId: 'M016', reportedStatus: 'COMPLETED', config: 'V1', actionsSucceeded: 7, actionsFailed: 3 },
      { missionId: 'M017', reportedStatus: 'FAILED', config: 'V1', actionsSucceeded: 7, actionsFailed: 3 },
      { missionId: 'M018', reportedStatus: 'COMPLETED', config: 'V1', actionsSucceeded: 10, actionsFailed: 0 },
      { missionId: 'M019', reportedStatus: 'COMPLETED', config: 'V2', actionsSucceeded: 10, actionsFailed: 0 },
      { missionId: 'M020', reportedStatus: 'COMPLETED', config: 'V2', actionsSucceeded: 9, actionsFailed: 1 },
      { missionId: 'M021', reportedStatus: 'COMPLETED', config: 'V2', actionsSucceeded: 9, actionsFailed: 1 },
      { missionId: 'M022', reportedStatus: 'COMPLETED', config: 'V2', actionsSucceeded: 9, actionsFailed: 1 },
      { missionId: 'M023', reportedStatus: 'COMPLETED', config: 'V2', actionsSucceeded: 10, actionsFailed: 0 },
      { missionId: 'M024', reportedStatus: 'COMPLETED', config: 'V2', actionsSucceeded: 8, actionsFailed: 2 },
      { missionId: 'M025', reportedStatus: 'COMPLETED', config: 'V2', actionsSucceeded: 8, actionsFailed: 2 },
      { missionId: 'M026', reportedStatus: 'COMPLETED', config: 'V2', actionsSucceeded: 10, actionsFailed: 0 },
      { missionId: 'M027', reportedStatus: 'COMPLETED', config: 'V2', actionsSucceeded: 9, actionsFailed: 1 },
    ],
  },
};
