import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TopBar } from '../../components/ui/TopBar';
import { fetchSummary, fetchLatestSummary } from '../api';

describe('AI Mission Summary Feature Removal & Header Invariants', () => {
  test('TopBar renders brand logo and Operator Copilot button, and does NOT render removed summary trigger', () => {
    const markup = renderToStaticMarkup(
      React.createElement(TopBar)
    );

    // Operator Copilot button must be present
    assert.ok(
      markup.includes('id="operator-copilot-btn"'),
      'TopBar must contain id="operator-copilot-btn"'
    );
    assert.ok(
      markup.includes('Operator Copilot'),
      'TopBar must contain Operator Copilot text'
    );

    // Brand SPOTCheck must be present
    assert.ok(
      markup.includes('SPOTCheck') || markup.includes('SPOT'),
      'TopBar must contain SPOTCheck brand'
    );

    // Must NOT have removed AI mission summary trigger button or label
    assert.ok(
      !markup.includes('id="ai-mission-summary-trigger"'),
      'TopBar must not contain removed id="ai-mission-summary-trigger"'
    );
    assert.ok(
      !markup.includes('aria-label="Generate AI mission summary"'),
      'TopBar must not contain removed summary aria-label'
    );
    assert.ok(
      !markup.includes('title="AI Mission Summary"'),
      'TopBar must not contain removed summary title/tooltip'
    );

    // Must NOT have old Search and Verify or Inspection & Audit Log
    assert.ok(
      !markup.includes('Search and Verify'),
      'TopBar must not contain old "Search and Verify" label'
    );
    assert.ok(
      !markup.includes('Inspection & Audit Log'),
      'TopBar must not contain old "Inspection & Audit Log" tooltip'
    );
  });

  test('TopBar renders safely with optional props', () => {
    let copilotClicked = false;
    const markup = renderToStaticMarkup(
      React.createElement(TopBar, {
        className: 'custom-topbar-class',
        onCopilotClick: () => {
          copilotClicked = true;
        },
      })
    );

    assert.ok(
      markup.includes('custom-topbar-class'),
      'TopBar must render custom className'
    );
  });

  test('fetchSummary is safely deactivated and returns offline null without network requests', async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;

    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error('Network should not be called when deactivated');
    };

    try {
      const res = await fetchSummary();
      assert.equal(fetchCalled, false, 'fetchSummary must not dispatch network requests');
      assert.equal(res.source, 'offline');
      assert.equal(res.data, null);

      // fetchLatestSummary alias works identically
      const aliasRes = await fetchLatestSummary();
      assert.equal(fetchCalled, false, 'fetchLatestSummary must not dispatch network requests');
      assert.equal(aliasRes.source, 'offline');
      assert.equal(aliasRes.data, null);

      // Even with missionId and regenerate flags, deactivated call returns offline null
      const paramRes = await fetchSummary('M005', true);
      assert.equal(fetchCalled, false, 'fetchSummary with params must not dispatch network requests');
      assert.equal(paramRes.source, 'offline');
      assert.equal(paramRes.data, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('zIndex tokens maintain strict hierarchy: map content < map overlays < navbar < drawers < modal backdrop < modal < tooltips', async () => {
    const { zIndex } = await import('../../styles/tokens');
    assert.ok(zIndex.mapContent < zIndex.mapOverlays, 'mapContent < mapOverlays');
    assert.ok(zIndex.mapOverlays < zIndex.navbar, 'mapOverlays < navbar');
    assert.ok(zIndex.navbar <= zIndex.topBar, 'navbar <= topBar');
    assert.ok(zIndex.subToolbar < zIndex.topBar, 'subToolbar < topBar');
    assert.ok(zIndex.navbar < zIndex.drawer, 'navbar < drawer');
    assert.ok(zIndex.drawer < zIndex.modalBackdrop, 'drawer < modalBackdrop');
    assert.ok(zIndex.modalBackdrop < zIndex.modal, 'modalBackdrop < modal');
    assert.ok(zIndex.modal < zIndex.tooltip, 'modal < tooltip');
  });
});
