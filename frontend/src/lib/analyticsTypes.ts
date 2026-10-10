/**
 * analyticsTypes.ts — TypeScript types for SPOTSight analytics contracts.
 * Matches GET /api/analytics contract (issue #3 / DATA-2).
 */

export interface BatteryReliabilityItem {
  band: string;
  minPct: number;
  maxPct: number;
  actions: number;
  failed: number;
  failureRatePct: number;
}

export interface MissionParadoxSummary {
  reportedCompleted: number;
  completedWithFailures: number;
  completedClean: number;
  reportedFailed: number;
}

export interface MissionParadoxMission {
  missionId: string;
  reportedStatus: string;
  config: string;
  actionsSucceeded: number;
  actionsFailed: number;
}

export interface MissionParadoxData {
  summary: MissionParadoxSummary;
  missions: MissionParadoxMission[];
}

export interface AnalyticsResponse {
  batteryReliability: BatteryReliabilityItem[];
  missionParadox: MissionParadoxData;
}
