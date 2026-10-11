export interface SafetyHazardItem {
  text: string;
  source: string;
}

export interface SafetyAnomalyItem {
  anomalyId: string;
  anomalyType: string;
  severity: string;
  assetName: string;
  description: string;
}

export interface SafetyFailedActionItem {
  actionId: string;
  actionType: string;
  failureType: string;
  assetName: string | null;
}

export interface FollowUpLocationSafety {
  locationId: string;
  locationName: string;
  zoneType: string;
  environment: string;
  reasons: string[];
  hazards: SafetyHazardItem[];
  protectiveEquipment: string[];
  anomalies: SafetyAnomalyItem[];
  failedActions: SafetyFailedActionItem[];
}

export interface WorkerSafetyData {
  missionId: string;
  summary: string;
  inspectionsCompleted: number;
  totalInspections: number;
  followUpLocations: FollowUpLocationSafety[];
  disclaimer: string;
}

export interface WorkerSafetyResponse {
  data: WorkerSafetyData | null;
  source: 'live' | 'offline';
  error?: string;
}
