/**
 * predictionsFixture.ts — Offline fixtures and formatting helpers for predictive features (issue #16 / AI-3).
 * Ensures Insights cards render reliably when the backend is offline.
 */

import {
  PredictionModelResponse,
  TrendAlertsResponse,
  TrendBacktestResponse,
} from './predictionsTypes';

export const predictionsModelFixture: PredictionModelResponse = {
  modelName: 'L2 Regularized Logistic Regression (NumPy)',
  evaluation: {
    method: 'Leave-one-mission-out (27 folds)',
    totalActions: 270,
    auc: 0.69,
    brierScore: 0.137,
    top20Percent: {
      threshold: 0.2,
      actionsEvaluated: 54,
      failuresCaught: 19,
      totalFailures: 49,
      lift: 1.94,
    },
    baselines: {
      actionTypeAverageAuc: 0.547,
      batteryOnlyAuc: 0.644,
      randomAuc: 0.5,
    },
    calibration: [
      {
        bin: '0-10%',
        minRisk: 0.0,
        maxRisk: 0.1,
        actionCount: 76,
        predictedFailureRate: 0.072,
        actualFailureRate: 0.092,
      },
      {
        bin: '10-20%',
        minRisk: 0.1,
        maxRisk: 0.2,
        actionCount: 103,
        predictedFailureRate: 0.149,
        actualFailureRate: 0.126,
      },
      {
        bin: '20-35%',
        minRisk: 0.2,
        maxRisk: 0.35,
        actionCount: 66,
        predictedFailureRate: 0.26,
        actualFailureRate: 0.273,
      },
      {
        bin: '35-100%',
        minRisk: 0.35,
        maxRisk: 1.0,
        actionCount: 25,
        predictedFailureRate: 0.435,
        actualFailureRate: 0.44,
      },
    ],
  },
  factors: [
    {
      feature: 'WP05',
      weight: 0.47,
      impact: 'Specific historical risk factor at waypoint WP05 (Pipe Gallery)',
    },
    {
      feature: 'WP09',
      weight: 0.3717,
      impact: 'Specific historical risk factor at waypoint WP09',
    },
    {
      feature: 'low30',
      weight: 0.2876,
      impact: 'Battery below 30% significantly increases failure probability',
    },
    {
      feature: 'bat10',
      weight: -0.2837,
      impact: 'Higher battery levels reduce failure risk (each +10% reduces odds)',
    },
    {
      feature: 'WP15',
      weight: 0.2558,
      impact: 'Specific historical risk factor at waypoint WP15',
    },
    {
      feature: 'WP02',
      weight: 0.2061,
      impact: 'Specific historical risk factor at waypoint WP02',
    },
    {
      feature: 'VISUAL_INSPECTION',
      weight: -0.6179,
      impact: 'Baseline risk shift for Visual Inspection vs Acoustic Inspection',
    },
    {
      feature: 'WP13',
      weight: -0.403,
      impact: 'Specific historical risk factor at waypoint WP13',
    },
  ],
};

export const predictionsTrendsFixture: TrendAlertsResponse = {
  totalAlerts: 5,
  generatedAt: '2026-09-10T12:00:00Z',
  alerts: [
    {
      assetId: 'HX-202',
      assetName: 'Heat Exchanger 02',
      measurementType: 'SOUND_DB',
      unit: 'dB',
      readings: [58.5, 65.6, 81.9],
      timestamps: ['2026-09-02T10:14:12', '2026-09-04T14:20:00', '2026-09-05T18:28:48'],
      absChange: 23.4,
      threshold: 6.0,
      severity: 3.9,
      direction: 'up',
      message:
        'Heat Exchanger 02 sound level rose 23.4 dB over its last 3 readings (58.5 → 65.6 → 81.9). Schedule a vibration check before the next mission.',
      generatedBy: 'template',
    },
    {
      assetId: 'HX-210',
      assetName: 'Heat Exchanger 10',
      measurementType: 'TEMPERATURE_C',
      unit: '°C',
      readings: [43.8, 48.3, 73.9],
      timestamps: ['2026-09-05T12:00:00', '2026-09-07T16:00:00', '2026-09-09T18:10:48'],
      absChange: 30.1,
      threshold: 10.0,
      severity: 3.01,
      direction: 'up',
      message:
        'Heat Exchanger 10 temperature rose 30.1 °C over its last 3 readings (43.8 → 48.3 → 73.9). Have a technician check it for overheating before the next mission.',
      generatedBy: 'template',
    },
    {
      assetId: 'HX-216',
      assetName: 'Heat Exchanger 16',
      measurementType: 'TEMPERATURE_C',
      unit: '°C',
      readings: [39.8, 62.5, 67.1],
      timestamps: ['2026-09-06T10:00:00', '2026-09-08T14:00:00', '2026-09-10T02:06:54'],
      absChange: 27.3,
      threshold: 10.0,
      severity: 2.73,
      direction: 'up',
      message:
        'Heat Exchanger 16 temperature rose 27.3 °C over its last 3 readings (39.8 → 62.5 → 67.1). Have a technician check it for overheating before the next mission.',
      generatedBy: 'template',
    },
    {
      assetId: 'HX-210',
      assetName: 'Heat Exchanger 10',
      measurementType: 'VISUAL_SCORE',
      unit: 'points',
      readings: [96.0, 92.0, 75.0],
      timestamps: ['2026-09-02T11:00:00', '2026-09-04T15:00:00', '2026-09-06T18:05:12'],
      absChange: 21.0,
      threshold: 8.0,
      severity: 2.62,
      direction: 'down',
      message:
        'Heat Exchanger 10 visual score dropped 21 points over its last 3 readings (96.0 → 92.0 → 75.0). Inspect it in person before the next mission.',
      generatedBy: 'template',
    },
    {
      assetId: 'HX-217',
      assetName: 'Heat Exchanger 17',
      measurementType: 'TEMPERATURE_C',
      unit: '°C',
      readings: [53.6, 65.0, 77.6],
      timestamps: ['2026-09-03T10:00:00', '2026-09-05T14:00:00', '2026-09-07T18:08:48'],
      absChange: 24.0,
      threshold: 10.0,
      severity: 2.4,
      direction: 'up',
      message:
        'Heat Exchanger 17 temperature rose 24 °C over its last 3 readings (53.6 → 65.0 → 77.6). Have a technician check it for overheating before the next mission.',
      generatedBy: 'template',
    },
  ],
};

export const predictionsBacktestFixture: TrendBacktestResponse = {
  totalEvents: 6,
  followedByFailureCount: 3,
  events: [
    {
      assetId: 'HX-202',
      assetName: 'Heat Exchanger 02',
      measurementType: 'SOUND_DB',
      readings: [58.5, 65.6, 81.9],
      triggeredAt: '2026-09-05T18:28:48',
      missionId: 'M013',
      followedByFailure: {
        missionId: 'M027',
        timestamp: '2026-09-10T10:12:30',
        failureType: 'READING_UNRELIABLE',
      },
    },
    {
      assetId: 'HX-210',
      assetName: 'Heat Exchanger 10',
      measurementType: 'TEMPERATURE_C',
      readings: [43.8, 48.3, 73.9],
      triggeredAt: '2026-09-09T18:10:48',
      missionId: 'M025',
      followedByFailure: {
        missionId: 'M025',
        timestamp: '2026-09-09T18:12:36',
        failureType: 'SIGNAL_NOISE',
      },
    },
    {
      assetId: 'HX-210',
      assetName: 'Heat Exchanger 10',
      measurementType: 'VISUAL_SCORE',
      readings: [96.0, 92.0, 75.0],
      triggeredAt: '2026-09-06T18:05:12',
      missionId: 'M016',
      followedByFailure: {
        missionId: 'M016',
        timestamp: '2026-09-06T18:20:48',
        failureType: 'READING_UNRELIABLE',
      },
    },
    {
      assetId: 'HX-216',
      assetName: 'Heat Exchanger 16',
      measurementType: 'TEMPERATURE_C',
      readings: [39.8, 62.5, 67.1],
      triggeredAt: '2026-09-10T02:06:54',
      missionId: 'M026',
      followedByFailure: null,
    },
    {
      assetId: 'HX-217',
      assetName: 'Heat Exchanger 17',
      measurementType: 'TEMPERATURE_C',
      readings: [53.6, 65.0, 77.6],
      triggeredAt: '2026-09-07T18:08:48',
      missionId: 'M019',
      followedByFailure: null,
    },
    {
      assetId: 'PUMP-220',
      assetName: 'Pump 20',
      measurementType: 'LOCALIZATION_CONFIDENCE_PCT',
      readings: [98.9, 85.8, 82.5],
      triggeredAt: '2026-09-07T18:15:24',
      missionId: 'M019',
      followedByFailure: null,
    },
  ],
};

/**
 * Computes human-readable duration between alert trigger and subsequent failure.
 * e.g. for HX-202 (Sep 5 18:28 to Sep 10 10:12) ~ 4.65 days -> "nearly 5 days".
 */
export function formatWarningGap(triggeredAt: string, failureTimestamp: string): string {
  const start = new Date(triggeredAt).getTime();
  const end = new Date(failureTimestamp).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) {
    return 'shortly after';
  }
  const diffMs = end - start;
  const totalHours = diffMs / (1000 * 60 * 60);
  const totalDays = totalHours / 24;

  if (totalDays >= 4.5 && totalDays <= 5.0) {
    return 'nearly 5 days';
  }
  if (totalDays >= 1.0) {
    const days = Math.floor(totalDays);
    const hours = Math.round(totalHours % 24);
    if (hours === 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    }
    return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`;
  }
  const hours = Math.round(totalHours);
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  const minutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}

export function formatMeasurementUnit(measurementType: string): string {
  switch (measurementType) {
    case 'TEMPERATURE_C':
      return '°C';
    case 'SOUND_DB':
      return 'dB';
    case 'PRESSURE_PSI':
      return 'psi';
    case 'VISUAL_SCORE':
      return 'points';
    case 'LOCALIZATION_CONFIDENCE_PCT':
      return '%';
    default:
      return '';
  }
}

export function formatMeasurementTypeLabel(measurementType: string): string {
  switch (measurementType) {
    case 'TEMPERATURE_C':
      return 'Temperature';
    case 'SOUND_DB':
      return 'Sound Level';
    case 'PRESSURE_PSI':
      return 'Pressure';
    case 'VISUAL_SCORE':
      return 'Visual Score';
    case 'LOCALIZATION_CONFIDENCE_PCT':
      return 'Localization Confidence';
    default:
      return measurementType.replace(/_/g, ' ');
  }
}

export function formatActionTypeLabel(actionType: string): string {
  switch (actionType) {
    case 'ACOUSTIC_INSPECTION':
      return 'Acoustic Inspection';
    case 'GAUGE_READING':
      return 'Gauge Reading';
    case 'NAVIGATION':
      return 'Navigation';
    case 'THERMAL_INSPECTION':
      return 'Thermal Inspection';
    case 'VISUAL_INSPECTION':
      return 'Visual Inspection';
    default:
      return actionType
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
  }
}

export function formatFailureTypeLabel(failureType?: string | null): string {
  if (!failureType) return 'Success';
  switch (failureType) {
    case 'READING_UNRELIABLE':
      return 'Unreliable reading';
    case 'SIGNAL_NOISE':
      return 'Signal noise';
    case 'SENSOR_TIMEOUT':
      return 'Sensor timeout';
    case 'LOST_LOCALIZATION':
      return 'Lost localization';
    case 'COMMUNICATION_LOSS':
      return 'Communication loss';
    case 'TARGET_NOT_DETECTED':
      return 'Target not detected';
    case 'MECHANICAL_ERROR':
      return 'Mechanical error';
    case 'HARDWARE_FAULT':
      return 'Hardware fault';
    default:
      return failureType.replace(/_/g, ' ').toLowerCase();
  }
}
