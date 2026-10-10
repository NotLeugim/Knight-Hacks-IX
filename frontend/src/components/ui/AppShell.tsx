'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { TopBar } from './TopBar';
import { SubToolbar } from './SubToolbar';
import { SegmentedTabs, type TabItem } from './SegmentedTabs';
import { DateRangeSelect } from './DateRangeSelect';
import { SplitRefreshButton } from './SplitRefreshButton';
import { Pill } from './Pill';

const NAV_TABS: TabItem[] = [
  { id: '/', label: 'Live Mission' },
  { id: '/anomalies', label: 'Anomalies', badge: 3 },
  { id: '/missions', label: 'Missions' },
  { id: '/insights', label: 'Insights' },
];

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Unit #1 Live Mission',
  '/live': 'Unit #1 Live Mission',
  '/anomalies': 'Fleet Anomalies',
  '/missions': 'Mission Schedule',
  '/insights': 'Insights',
  '/design-system': 'Design System Specification',
};

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Determine active tab
  const activeTab = NAV_TABS.some((tab) => tab.id === pathname)
    ? pathname
    : pathname.startsWith('/anomalies')
    ? '/anomalies'
    : pathname.startsWith('/missions')
    ? '/missions'
    : pathname.startsWith('/insights')
    ? '/insights'
    : '/';

  // Contextual page title per route
  const currentTitle = ROUTE_TITLES[pathname] || 'Unit #1 Live Mission';

  const handleTabChange = (tabId: string) => {
    router.push(tabId);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-orbit-bg text-text-primary antialiased">
      {/* ── Fixed 64px TopBar ── */}
      <TopBar />

      {/* ── Fixed 48px SubToolbar with Contextual Title & Split Refresh ── */}
      <SubToolbar
        title={currentTitle}
        showFilter={true}
        centerSlot={
          <SegmentedTabs
            tabs={NAV_TABS}
            activeTab={activeTab}
            onChange={handleTabChange}
            ariaLabel="Orbit Mission Navigation"
          />
        }
        rightSlot={
          <>
            <Pill variant="confidence" size="md">
              <span className="text-white/80">Mission Confidence:</span>{' '}
              <span className="text-[#55DC99] font-bold">92%</span>
            </Pill>

            <Pill variant="live" size="md" pulse>
              LIVE
            </Pill>

            <DateRangeSelect value="6m" />

            <SplitRefreshButton />
          </>
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
