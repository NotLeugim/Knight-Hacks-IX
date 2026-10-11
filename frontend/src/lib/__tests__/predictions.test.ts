import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  predictionsModelFixture,
  predictionsTrendsFixture,
  predictionsBacktestFixture,
  formatWarningGap,
  formatActionTypeLabel,
  formatFailureTypeLabel,
  formatMeasurementTypeLabel,
} from '../predictionsFixture';
import {
  fetchTrendAlerts,
  fetchTrendBacktest,
  fetchPredictionModel,
  fetchMissionForecast,
} from '../api';

describe('Predictive Maintenance & Risk Forecast Tests (issue #16 / AI-3)', () => {
  test('predictionsModelFixture matches target backtest numbers exactly', () => {
    const ev = predictionsModelFixture.evaluation;
    assert.equal(ev.auc, 0.69);
    assert.equal(ev.brierScore, 0.137);

    // Top 20%
    assert.equal(ev.top20Percent.actionsEvaluated, 54);
    assert.equal(ev.top20Percent.failuresCaught, 19);
    assert.equal(ev.top20Percent.totalFailures, 49);
    assert.equal(ev.top20Percent.lift, 1.94);

    // Baselines
    assert.equal(ev.baselines.actionTypeAverageAuc, 0.547);
    assert.equal(ev.baselines.batteryOnlyAuc, 0.644);
    assert.equal(ev.baselines.randomAuc, 0.5);

    // Calibration table
    assert.equal(ev.calibration.length, 4);
    assert.deepEqual(
      ev.calibration.map((c) => ({
        bin: c.bin,
        cnt: c.actionCount,
        pred: c.predictedFailureRate,
        act: c.actualFailureRate,
      })),
      [
        { bin: '0-10%', cnt: 76, pred: 0.072, act: 0.092 },
        { bin: '10-20%', cnt: 103, pred: 0.149, act: 0.126 },
        { bin: '20-35%', cnt: 66, pred: 0.26, act: 0.273 },
        { bin: '35-100%', cnt: 25, pred: 0.435, act: 0.44 },
      ]
    );
  });

  test('predictionsTrendsFixture has the 5 exact target alert messages', () => {
    assert.equal(predictionsTrendsFixture.totalAlerts, 5);
    const alerts = predictionsTrendsFixture.alerts;

    // HX-202
    const hx202 = alerts.find((a) => a.assetId === 'HX-202');
    assert.ok(hx202);
    assert.equal(hx202.severity, 3.9);
    assert.deepEqual(hx202.readings, [58.5, 65.6, 81.9]);
    assert.equal(
      hx202.message,
      'Heat Exchanger 02 sound level rose 23.4 dB over its last 3 readings (58.5 → 65.6 → 81.9). Schedule a vibration check before the next mission.'
    );

    // HX-210 Temperature
    const hx210Temp = alerts.find(
      (a) => a.assetId === 'HX-210' && a.measurementType === 'TEMPERATURE_C'
    );
    assert.ok(hx210Temp);
    assert.equal(hx210Temp.severity, 3.01);
    assert.deepEqual(hx210Temp.readings, [43.8, 48.3, 73.9]);
    assert.equal(
      hx210Temp.message,
      'Heat Exchanger 10 temperature rose 30.1 °C over its last 3 readings (43.8 → 48.3 → 73.9). Have a technician check it for overheating before the next mission.'
    );

    // HX-216
    const hx216 = alerts.find((a) => a.assetId === 'HX-216');
    assert.ok(hx216);
    assert.equal(hx216.severity, 2.73);
    assert.deepEqual(hx216.readings, [39.8, 62.5, 67.1]);
    assert.equal(
      hx216.message,
      'Heat Exchanger 16 temperature rose 27.3 °C over its last 3 readings (39.8 → 62.5 → 67.1). Have a technician check it for overheating before the next mission.'
    );

    // HX-210 Visual Score
    const hx210Vis = alerts.find(
      (a) => a.assetId === 'HX-210' && a.measurementType === 'VISUAL_SCORE'
    );
    assert.ok(hx210Vis);
    assert.equal(hx210Vis.severity, 2.62);
    assert.deepEqual(hx210Vis.readings, [96.0, 92.0, 75.0]);
    assert.equal(
      hx210Vis.message,
      'Heat Exchanger 10 visual score dropped 21 points over its last 3 readings (96.0 → 92.0 → 75.0). Inspect it in person before the next mission.'
    );

    // HX-217
    const hx217 = alerts.find((a) => a.assetId === 'HX-217');
    assert.ok(hx217);
    assert.equal(hx217.severity, 2.4);
    assert.deepEqual(hx217.readings, [53.6, 65.0, 77.6]);
    assert.equal(
      hx217.message,
      'Heat Exchanger 17 temperature rose 24 °C over its last 3 readings (53.6 → 65.0 → 77.6). Have a technician check it for overheating before the next mission.'
    );
  });

  test('predictionsBacktestFixture records 6 events with 3 followed by failure', () => {
    assert.equal(predictionsBacktestFixture.totalEvents, 6);
    assert.equal(predictionsBacktestFixture.followedByFailureCount, 3);

    const hx202 = predictionsBacktestFixture.events.find((e) => e.assetId === 'HX-202');
    assert.ok(hx202);
    assert.equal(hx202.missionId, 'M013');
    assert.equal(hx202.followedByFailure?.missionId, 'M027');
    assert.equal(hx202.followedByFailure?.failureType, 'READING_UNRELIABLE');
  });

  test('formatWarningGap computes ~4.7 days as nearly 5 days or 4 days, 16 hours', () => {
    const triggered = '2026-09-05T18:28:48';
    const failed = '2026-09-10T10:12:30';
    const gap = formatWarningGap(triggered, failed);
    assert.ok(
      gap === 'nearly 5 days' || gap.startsWith('4 days, 15') || gap.startsWith('4 days, 16'),
      `Expected nearly 5 days or 4 days, 16 hours, got: ${gap}`
    );
  });

  test('label formatters convert raw codes to clean human-readable words', () => {
    // Action types
    assert.equal(formatActionTypeLabel('ACOUSTIC_INSPECTION'), 'Acoustic Inspection');
    assert.equal(formatActionTypeLabel('GAUGE_READING'), 'Gauge Reading');
    assert.equal(formatActionTypeLabel('NAVIGATION'), 'Navigation');
    assert.equal(formatActionTypeLabel('THERMAL_INSPECTION'), 'Thermal Inspection');
    assert.equal(formatActionTypeLabel('VISUAL_INSPECTION'), 'Visual Inspection');

    // Failure types
    assert.equal(formatFailureTypeLabel('READING_UNRELIABLE'), 'Unreliable reading');
    assert.equal(formatFailureTypeLabel('SIGNAL_NOISE'), 'Signal noise');
    assert.equal(formatFailureTypeLabel('SENSOR_TIMEOUT'), 'Sensor timeout');
    assert.equal(formatFailureTypeLabel('LOST_LOCALIZATION'), 'Lost localization');

    // Measurement types
    assert.equal(formatMeasurementTypeLabel('TEMPERATURE_C'), 'Temperature');
    assert.equal(formatMeasurementTypeLabel('SOUND_DB'), 'Sound Level');
    assert.equal(formatMeasurementTypeLabel('PRESSURE_PSI'), 'Pressure');
    assert.equal(formatMeasurementTypeLabel('VISUAL_SCORE'), 'Visual Score');
    assert.equal(
      formatMeasurementTypeLabel('LOCALIZATION_CONFIDENCE_PCT'),
      'Localization Confidence'
    );
  });

  test('fetch helpers return offline fallback without throwing on network failure', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('Connection refused');
    };

    try {
      const trendsRes = await fetchTrendAlerts();
      assert.equal(trendsRes.source, 'offline');
      assert.equal(trendsRes.data.alerts.length, 5);

      const backtestRes = await fetchTrendBacktest();
      assert.equal(backtestRes.source, 'offline');
      assert.equal(backtestRes.data.totalEvents, 6);

      const modelRes = await fetchPredictionModel();
      assert.equal(modelRes.source, 'offline');
      assert.equal(modelRes.data.evaluation.auc, 0.69);

      const forecastRes = await fetchMissionForecast('M015');
      assert.equal(forecastRes.source, 'offline');
      assert.equal(forecastRes.data, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('render-level values come directly from fixture metrics', () => {
    const ev = predictionsModelFixture.evaluation;

    // Four AUC values and labels
    const aucList = [
      { label: 'Random', val: ev.baselines.randomAuc.toFixed(2) },
      { label: 'Inspection type average', val: ev.baselines.actionTypeAverageAuc.toFixed(3) },
      { label: 'Battery only', val: ev.baselines.batteryOnlyAuc.toFixed(3) },
      { label: 'This model', val: ev.auc.toFixed(3) },
    ];
    assert.deepEqual(aucList, [
      { label: 'Random', val: '0.50' },
      { label: 'Inspection type average', val: '0.547' },
      { label: 'Battery only', val: '0.644' },
      { label: 'This model', val: '0.690' },
    ]);

    // Top 20% numbers and rates
    const top20 = ev.top20Percent;
    assert.equal(top20.actionsEvaluated, 54);
    assert.equal(top20.failuresCaught, 19);
    assert.equal(top20.totalFailures, 49);
    assert.equal(top20.lift, 1.94);

    const riskiestRate = ((top20.failuresCaught / top20.actionsEvaluated) * 100).toFixed(1);
    const overallRate = ((top20.totalFailures / ev.totalActions) * 100).toFixed(1);
    assert.equal(riskiestRate, '35.2');
    assert.equal(overallRate, '18.1');

    // Calibration bins and rendered rates
    const formattedCalibration = ev.calibration.map((c) => ({
      bin: c.bin,
      count: c.actionCount,
      predictedPct: `${(c.predictedFailureRate * 100).toFixed(1)}%`,
      actualPct: `${(c.actualFailureRate * 100).toFixed(1)}%`,
    }));
    assert.deepEqual(formattedCalibration, [
      { bin: '0-10%', count: 76, predictedPct: '7.2%', actualPct: '9.2%' },
      { bin: '10-20%', count: 103, predictedPct: '14.9%', actualPct: '12.6%' },
      { bin: '20-35%', count: 66, predictedPct: '26.0%', actualPct: '27.3%' },
      { bin: '35-100%', count: 25, predictedPct: '43.5%', actualPct: '44.0%' },
    ]);
  });

  test('no prediction component contains forbidden or wrongly computed strings', () => {
    const fs = require('fs');
    const path = require('path');

    const componentFiles = [
      path.join(__dirname, '../../components/missions/MissionForecast.tsx'),
      path.join(__dirname, '../../components/insights/TrendWatchCard.tsx'),
      path.join(__dirname, '../../components/insights/ModelAccuracyCard.tsx'),
    ];

    const forbiddenStrings = ['46%', '40.0%', '20.6%', 'M021', '0–15%', '0-15%'];

    for (const filePath of componentFiles) {
      assert.ok(fs.existsSync(filePath), `File does not exist: ${filePath}`);
      const content = fs.readFileSync(filePath, 'utf8');
      for (const forbidden of forbiddenStrings) {
        assert.ok(
          !content.includes(forbidden),
          `Component file ${path.basename(filePath)} must not contain "${forbidden}"`
        );
      }
    }
  });
});

