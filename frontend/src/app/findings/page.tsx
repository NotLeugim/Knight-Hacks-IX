import React from 'react';
import FindingsChart from '../../components/charts/FindingsChart';

export const metadata = {
  title: 'Findings & Analytics | SPOTSight',
  description:
    'Operational findings, battery reliability correlation, and mission paradox analytics for SPOT robots.',
};

export default function FindingsPage() {
  return (
    <div className="h-full overflow-auto p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1
            className="text-xl md:text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            SPOTSight Analytics Dashboard
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Autonomous inspection reliability analysis and findings metrics
          </p>
        </header>

        <main className="w-full">
          <FindingsChart />
        </main>
      </div>
    </div>
  );
}
