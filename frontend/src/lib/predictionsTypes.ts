/**
 * predictionsTypes.ts — TypeScript interfaces for SPOTCheck predictive analytics (issue #16 / AI-3).
 * Covers:
 * 1. Trend Watch (active sliding-window wear alerts & backtest)
 * 2. Pre-mission Risk Forecast Model & Route Forecast
 */

export interface TrendAlert {
  assetId: string;
  assetName: string;
  locationName?: string;
  measurementType: string;
  unit?: string;
  readings: number[];
  timestamps: string[];
  missionIds?: string[];
  absChange: number;
  threshold: number;
  severity: number;
  direction: 'up' | 'down';
  message: string;
  generatedBy: 'gemini' | 'template';
}

export interface TrendAlertsResponse {
  alerts: TrendAlert[];
  totalAlerts: number;
  generatedAt: string;
}

export interface TrendFollowedByFailure {
  missionId: string;
  timestamp: string;
  failureType: string;
}

export interface TrendBacktestEvent {
  assetId: string;
  assetName: string;
  measurementType: string;
  readings: number[];
  triggeredAt: string;
  missionId: string;
  followedByFailure: TrendFollowedByFailure | null;
}

export interface TrendBacktestResponse {
  totalEvents: number;
  followedByFailureCount: number;
  events: TrendBacktestEvent[];
}

export interface CalibrationBin {
  bin: string;
  minRisk: number;
  maxRisk: number;
  actionCount: number;
  predictedFailureRate: number;
  actualFailureRate: number;
}

export interface Top20PercentEval {
  threshold: number;
  actionsEvaluated: number;
  failuresCaught: number;
  totalFailures: number;
  lift: number;
}

export interface ModelBaselines {
  actionTypeAverageAuc: number;
  batteryOnlyAuc: number;
  randomAuc: number;
}

export interface ModelEvaluation {
  method: string;
  totalActions: number;
  auc: number;
  brierScore: number;
  top20Percent: Top20PercentEval;
  baselines: ModelBaselines;
  calibration: CalibrationBin[];
}

export interface ModelFactor {
  feature: string;
  weight: number;
  impact: string;
}

export interface PredictionModelResponse {
  modelName: string;
  evaluation: ModelEvaluation;
  factors: ModelFactor[];
}

export interface ForecastAction {
  sequence: number;
  actionId: string;
  actionType: string;
  locationId: string;
  locationName: string;
  projectedBattery: number;
  risk: number;
  heldOutRisk: number | null;
  actual: 'worked' | 'failed' | null;
  reasons: string[];
}

export interface SuggestedReorderedAction {
  newSequence: number;
  originalSequence: number;
  actionId: string;
  actionType: string;
  locationName: string;
  projectedBattery: number;
  risk: number;
}

export interface SuggestedReordering {
  expectedFailures: number;
  reduction: number;
  note: string;
  actions: SuggestedReorderedAction[];
}

export interface MissionForecastResponse {
  missionId: string;
  missionName: string;
  configurationVersion: string;
  startBatteryPct: number;
  chanceAnyFailure: number;
  expectedFailures: number;
  actions: ForecastAction[];
  suggestedReordering: SuggestedReordering | null;
}
