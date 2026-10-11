'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { TopBar } from './TopBar';
import { SubToolbar } from './SubToolbar';
import { SegmentedTabs, type TabItem } from './SegmentedTabs';
import { Pill } from './Pill';
import { fetchAnalytics } from '@/lib/api';

const NAV_TABS: TabItem[] = [
  { id: '/', label: 'Live Mission' },
  { id: '/anomalies', label: 'Anomalies', badge: 3 },
  { id: '/missions', label: 'Missions' },
  { id: '/insights', label: 'Insights' },
  { id: '/weather', label: 'Weather' },
];

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Unit #1 Live Mission',
  '/live': 'Unit #1 Live Mission',
  '/anomalies': 'Fleet Anomalies',
  '/missions': 'Mission History & Summaries',
  '/insights': 'Fleet Insights & Analytics',
  '/weather': 'Plant Weather & Operations Impact',
  '/design-system': 'Design System Specification',
};

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [fleetConfidence, setFleetConfidence] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchAnalytics()
      .then((res) => {
        if (!isMounted) return;
        if (res.source === 'api' && typeof res.data?.confidence?.fleetAverage === 'number') {
          setFleetConfidence(res.data.confidence.fleetAverage);
        } else {
          setFleetConfidence(null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setFleetConfidence(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Determine active tab
  const activeTab = NAV_TABS.some((tab) => tab.id === pathname)
    ? pathname
    : pathname.startsWith('/anomalies')
    ? '/anomalies'
    : pathname.startsWith('/missions')
    ? '/missions'
    : pathname.startsWith('/insights')
    ? '/insights'
    : pathname.startsWith('/weather')
    ? '/weather'
    : '/';

  // Contextual page title per route
  const currentTitle = ROUTE_TITLES[pathname] || 'Unit #1 Live Mission';

  const handleTabChange = (tabId: string) => {
    router.push(tabId);
  };

  const pillVariant =
    fleetConfidence === null
      ? 'neutral'
      : fleetConfidence >= 80
      ? 'nominal'
      : fleetConfidence >= 60
      ? 'warn'
      : 'critical';

  const pillText =
    fleetConfidence !== null
      ? `${Math.round(fleetConfidence)}%`
      : '—';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-orbit-bg text-text-primary antialiased">
      {/* ── Fixed 64px TopBar ── */}
      <TopBar />

      {/* ── Fixed 48px SubToolbar with Contextual Title ── */}
      <SubToolbar
        title={currentTitle}
        centerSlot={
          <SegmentedTabs
            tabs={NAV_TABS}
            activeTab={activeTab}
            onChange={handleTabChange}
            ariaLabel="Orbit Mission Navigation"
          />
        }
        rightSlot={
          <Link
            href="/missions"
            id="fleet-confidence-pill-link"
            className="hover:opacity-85 transition-opacity inline-flex items-center"
          >
            <Pill variant={pillVariant} size="md">
              <span className="text-white/80">Fleet Confidence:</span>{' '}
              <span className="font-bold">{pillText}</span>
            </Pill>
          </Link>
        }
      />

      {/* ── App Body Stage (Overflow Hidden Container, Scroll Managed Within Pages) ── */}
      <main className="flex-1 min-h-0 overflow-hidden bg-orbit-bg">
        {children}
      </main>
    </div>
  );
}

export default AppShell;

