'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart2,
  CheckCircle2,
  HelpCircle,
  Info,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchPredictionModel } from '@/lib/api';
import { PredictionModelResponse } from '@/lib/predictionsTypes';
import { predictionsModelFixture } from '@/lib/predictionsFixture';

export default function ModelAccuracyCard() {
  const [modelData, setModelData] = useState<PredictionModelResponse>(predictionsModelFixture);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let active = true;

    fetchPredictionModel()
      .then((res) => {
        if (!active) return;
        if (res.data) {
          setModelData(res.data);
        }
        setIsOffline(res.source === 'offline');
      })
      .catch((err) => {
        if (!active) return;
        console.warn('[ModelAccuracyCard] Failed to fetch model metadata:', err);
        setIsOffline(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const evalData = modelData.evaluation;
  const baselines = evalData.baselines;
  const top20 = evalData.top20Percent;

  // AUC bars setup
  const aucBars = [
    {
      label: 'Random',
      auc: baselines.randomAuc,
      formattedAuc: baselines.randomAuc.toFixed(2),
      isPrimary: false,
      color: 'bg-orbit-text-muted',
      textColor: 'text-orbit-text-muted',
    },
    {
      label: 'Inspection type average',
      auc: baselines.actionTypeAverageAuc,
      formattedAuc: baselines.actionTypeAverageAuc.toFixed(3),
      isPrimary: false,
      color: 'bg-amber-400/80',
      textColor: 'text-amber-400',
    },
    {
      label: 'Battery only',
      auc: baselines.batteryOnlyAuc,
      formattedAuc: baselines.batteryOnlyAuc.toFixed(3),
      isPrimary: false,
      color: 'bg-indigo-400/80',
      textColor: 'text-indigo-400',
    },
    {
      label: 'This model',
      auc: evalData.auc,
      formattedAuc: evalData.auc.toFixed(3),
      isPrimary: true,
      color: 'bg-orbit-blue',
      textColor: 'text-orbit-blue',
    },
  ];

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-5"
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h3 className="text-base font-semibold text-orbit-text flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-orbit-blue" />
            How accurate is the risk forecast?
          </h3>
          <p className="text-xs text-orbit-text-secondary mt-0.5">
            Honest leave-one-mission-out backtest across all 27 missions (270 actions)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isOffline ? (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
              SAMPLE DATA, BACKEND OFFLINE
            </span>
          ) : (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-panel-header border border-panel-border text-emerald-400 font-semibold">
              AUC {evalData.auc.toFixed(3)}
            </span>
          )}
        </div>
      </div>

      {/* Ranking Accuracy (AUC) Comparison Bars */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-orbit-text-secondary">
            Ranking Accuracy (AUC Comparison)
          </span>
          <span className="text-[11px] font-mono text-orbit-text-muted">
            Range: 0.50 (Random) → 1.00 (Perfect)
          </span>
        </div>

        <p className="text-xs text-orbit-text-secondary">
          Higher means the model is better at putting actions that later failed above actions that worked. 0.5 is guessing.
        </p>

        <div className="space-y-2.5 pt-1">
          {aucBars.map((b) => {
            // Normalize width scale from 0.0 to 1.0
            const widthPct = Math.round(b.auc * 100);
            return (
              <div key={b.label} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className={cn('text-xs font-medium', b.isPrimary ? 'text-white' : 'text-orbit-text-secondary')}>
                    {b.label}
                  </span>
                  <span className={cn('font-bold', b.textColor)}>
                    {b.formattedAuc}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-panel-border/60 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', b.color)}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 20% Callout Stat */}
      <div
        className="p-4 rounded-xl border flex items-center justify-between gap-4"
        style={{
          background: 'rgba(59, 130, 246, 0.05)',
          borderColor: 'rgba(59, 130, 246, 0.25)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orbit-blue/15 border border-orbit-blue/30 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-orbit-blue" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-semibold text-orbit-text">
              High-Risk Action Detection
            </h4>
            <p className="text-xs text-orbit-text-secondary">
              The riskiest 20% of actions ({top20.actionsEvaluated}) contained {top20.failuresCaught} of {top20.totalFailures} failures, about {top20.lift}x better than random.
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-xl font-mono font-bold text-orbit-blue">
            {top20.lift}x
          </span>
          <span className="block text-[10px] uppercase font-mono tracking-wider text-orbit-text-muted">
            Lift Factor
          </span>
        </div>
      </div>

      {/* Calibration Table */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-orbit-text-secondary">
            Model Calibration
          </span>
          <span className="text-[11px] text-orbit-text-muted">
            Brier Score: <strong className="font-mono text-orbit-text">{evalData.brierScore.toFixed(3)}</strong>
          </span>
        </div>

        <p className="text-xs text-orbit-text-secondary">
          When the model says a risk, this is how often failures actually happened.
        </p>

        <div className="overflow-x-auto rounded-lg border border-panel-border">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-panel-header text-orbit-text-secondary border-b border-panel-border text-[11px]">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Predicted Risk Bin</th>
                <th className="py-2.5 px-3 font-semibold text-center">Action Count</th>
                <th className="py-2.5 px-3 font-semibold text-center">Predicted Failure Rate</th>
                <th className="py-2.5 px-3 font-semibold text-center">Actual Failure Rate</th>
                <th className="py-2.5 px-3 font-semibold text-right">Alignment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-panel-border/60">
              {evalData.calibration.map((bin) => {
                const predPct = (bin.predictedFailureRate * 100).toFixed(1);
                const actPct = (bin.actualFailureRate * 100).toFixed(1);
                const diff = Math.abs(bin.predictedFailureRate - bin.actualFailureRate);
                const isWellCalibrated = diff <= 0.03;

                return (
                  <tr key={bin.bin} className="hover:bg-panel-header/30 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-orbit-text">
                      {bin.bin}
                    </td>
                    <td className="py-2.5 px-3 text-center text-orbit-text-secondary">
                      {bin.actionCount}
                    </td>
                    <td className="py-2.5 px-3 text-center text-orbit-blue font-semibold">
                      {predPct}%
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-amber-400">
                      {actPct}%
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {isWellCalibrated ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Tight fit
                        </span>
                      ) : (
                        <span className="text-[10px] text-orbit-text-muted">
                          ±{(diff * 100).toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footnote */}
      <div
        className="p-3 rounded-lg border flex items-start gap-2.5 text-[11px] text-orbit-text-muted"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          borderColor: 'var(--color-border)',
        }}
      >
        <Info className="w-3.5 h-3.5 text-orbit-blue shrink-0 mt-0.5" />
        <p>
          Tested honestly: each mission was predicted by a model trained on the other 26. Synthetic data, 270 actions; treat results as leads, not proof.
        </p>
      </div>
    </div>
  );
}
