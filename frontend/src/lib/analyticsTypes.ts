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

export interface MissionConfidenceItem {
  missionId: string;
  score: number;
  failedActions: number;
  anomalyCount: number;
  anomalyDeduction: number;
}

export interface ConfidenceData {
  formula?: {
    start: number;
    perFailedAction: number;
    anomaly: Record<string, number>;
    min: number;
    max: number;
  };
  fleetAverage: number;
  missions: MissionConfidenceItem[];
}

export interface ConfigVersionStats {
  missions: number;
  missionCompletionPct: number;
  actions: number;
  actionSuccessPct: number;
  minBatteryPct?: number;
}

export interface EqualBatteryStats {
  aboveBatteryPct: number;
  V1: { actions: number; actionSuccessPct: number };
  V2: { actions: number; actionSuccessPct: number };
}

export interface ConfigComparisonData {
  V1: ConfigVersionStats;
  V2: ConfigVersionStats;
  equalBattery: EqualBatteryStats;
  note?: string;
}

export interface AnalyticsResponse {
  batteryReliability: BatteryReliabilityItem[];
  missionParadox: MissionParadoxData;
  configComparison?: ConfigComparisonData;
  confidence?: ConfidenceData;
  source?: 'database' | 'csv' | 'fixture' | string;
}

