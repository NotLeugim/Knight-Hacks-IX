/**
 * triageTypes.ts — TypeScript types for SPOTSight Anomaly Triage contracts.
 * Matches GET /api/triage response schema (Issue #11 / UI-2).
 */

export type AnomalySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;

export interface TriageAnomaly {
  /** Unique anomaly identifier (e.g. 'AN014') */
  id: string;
  /** Optional alias matching backend models */
  anomaly_id?: string;
  /** Action sequence identifier during which the anomaly occurred */
  action_id?: string;
  /** Mission identifier */
  mission_id?: string;
  /** Short headline or human-readable title */
  title: string;
  /** Detailed description or sensor observation */
  description: string;
  /** Severity level (case-insensitive in UI) */
  severity: AnomalySeverity;
  /** Waypoint or location identifier (e.g. 'WP07') */
  location_id?: string;
  /** Asset identifier (e.g. 'HX-204') */
  asset_id?: string;
  /** ISO timestamp string */
  timestamp: string;
  /** Categorical anomaly classification */
  anomaly_type?: string;
  /** Flag indicating whether human review is mandatory */
  operator_review_required?: boolean;
  /** Composite risk ranking score computed by backend */
  risk_score?: number;
}

export interface TriageQueueResponse {
  queue: TriageAnomaly[];
}
