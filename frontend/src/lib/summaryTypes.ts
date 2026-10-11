/**
 * summaryTypes.ts — TypeScript interfaces for SPOTSight shift summaries and replay triggers.
 * Matches backend contracts in backend/app/services/summary.py and backend/app/api/summary.py (issue #15).
 */

export interface FailedActionFact {
  actionId: string;
  sequence: number;
  timestamp: string;
  locationId: string;
  locationName: string;
  actionType: string;
  failureType: string | null;
  batteryPct: number;
}

export interface AnomalyFact {
  anomalyId: string;
  actionId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  anomalyType: string;
  operatorReviewRequired: boolean;
  assetId: string;
  assetName: string;
  locationName: string;
  description: string;
}

export interface ConfidenceBreakdownItem {
  reason: string;
  points: number;
}

export interface MissionConfidenceFact {
  missionId: string;
  score: number;
  failedActions: number;
  anomalyCount: number;
  anomalyDeduction: number;
  breakdown: ConfidenceBreakdownItem[];
}

export interface MissionFacts {
  missionId: string;
  reportedStatus: string;
  config: string;
  startTime: string;
  endTime: string;
  totalActions: number;
  failedActions: FailedActionFact[];
  anomalies: AnomalyFact[];
  confidence: MissionConfidenceFact | null;
}

export interface MissionSummary {
  missionId: string;
  reportedStatus: string;
  status: 'all_clear' | 'issues';
  bullets: string[];
  summaryMarkdown: string;
  generatedBy: 'rule' | 'gemini' | 'template';
  confidence: number;
  facts: MissionFacts;
  reportedStatusAtEnd?: string;
}

export interface ShiftHandoffResponse {
  missions: MissionSummary[];
}

export interface ReplayEventResponse {
  triggered: boolean;
  summary?: MissionSummary;
}
