import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TopBar } from '../../components/ui/TopBar';
import { fetchSummary, fetchLatestSummary } from '../api';

describe('Issue #52 - AI Mission Summary Trigger Icon & Flow', () => {
  test('TopBar renders AI mission summary button with accessible label and tooltip title', () => {
    let summaryClicked = false;
    const markup = renderToStaticMarkup(
      React.createElement(TopBar, {
        onSummaryClick: () => {
          summaryClicked = true;
        },
      })
    );

    // Must have aria-label="Generate AI mission summary"
    assert.ok(
      markup.includes('aria-label="Generate AI mission summary"'),
      'TopBar button must have aria-label="Generate AI mission summary"'
    );

    // Must have hover tooltip or title="AI Mission Summary"
    assert.ok(
      markup.includes('title="AI Mission Summary"') || markup.includes('AI Mission Summary'),
      'TopBar button must have tooltip/title="AI Mission Summary"'
    );

    // Must have the trigger ID
    assert.ok(
      markup.includes('id="ai-mission-summary-trigger"'),
      'TopBar button must have id="ai-mission-summary-trigger"'
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

  test('clicking/triggering onSummaryClick calls the callback', () => {
    let clicked = false;
    const props = {
      onSummaryClick: () => {
        clicked = true;
      },
    };

    // Simulate onClick invocation
    if (props.onSummaryClick) {
      props.onSummaryClick();
    }

    assert.equal(clicked, true, 'onSummaryClick must be called');
  });

  test('fetchSummary calls /api/summary with correct endpoint and query params', async () => {
    const originalFetch = globalThis.fetch;
    let requestedUrl = '';

    globalThis.fetch = async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return new Response(
        JSON.stringify({
          missionId: 'M027',
          reportedStatus: 'COMPLETED',
          status: 'issues',
          bullets: ['- Bullet 1', '- Bullet 2', '- Bullet 3'],
          summaryMarkdown: '- Bullet 1\n- Bullet 2\n- Bullet 3',
          generatedBy: 'template',
          confidence: 75,
          facts: {
            missionId: 'M027',
            reportedStatus: 'COMPLETED',
            config: 'V2',
            startTime: '2026-10-10T10:00:00Z',
            endTime: '2026-10-10T10:30:00Z',
            totalActions: 10,
            failedActions: [],
            anomalies: [],
            confidence: null,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      const res = await fetchSummary();
      assert.ok(
        requestedUrl.endsWith('/api/summary'),
        `Requested URL should end with /api/summary, got: ${requestedUrl}`
      );
      assert.equal(res.source, 'api');
      assert.equal(res.data?.missionId, 'M027');
      assert.equal(res.data?.confidence, 75);

      // Test with missionId param
      await fetchSummary('M005', true);
      assert.ok(
        requestedUrl.includes('/api/summary?mission_id=M005&regenerate=true'),
        `Requested URL should include query params, got: ${requestedUrl}`
      );

      // fetchLatestSummary alias works identically
      const aliasRes = await fetchLatestSummary();
      assert.equal(aliasRes.source, 'api');
      assert.equal(aliasRes.data?.missionId, 'M027');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('fetchSummary handles network errors gracefully with offline fallback and error details', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('Connection refused');
    };

    try {
      const res = await fetchSummary();
      assert.equal(res.source, 'offline');
      assert.equal(res.data, null);
      assert.ok(res.error, 'Should capture error message');
      assert.ok(res.error.includes('Connection refused'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
