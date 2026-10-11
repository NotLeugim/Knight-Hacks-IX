import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE_TITLES } from '../../components/ui/AppShell';

describe('Route Titles & Sub-toolbar Naming (Issue #49)', () => {
  test('ROUTE_TITLES maps expected application routes to exact concise strings', () => {
    assert.equal(ROUTE_TITLES['/'], 'Active Patrol');
    assert.equal(ROUTE_TITLES['/live'], 'Active Patrol');
    assert.equal(ROUTE_TITLES['/anomalies'], undefined);
    assert.equal(ROUTE_TITLES['/missions'], 'Mission History');
    assert.equal(ROUTE_TITLES['/insights'], 'Fleet Analytics');
    assert.equal(ROUTE_TITLES['/weather'], 'Weather');
  });

  test('ROUTE_TITLES does not contain /design-system entry', () => {
    assert.equal(ROUTE_TITLES['/design-system'], undefined);
    assert.equal('/design-system' in ROUTE_TITLES, false);
  });

  test('every title is 16 characters or fewer to prevent toolbar crowding', () => {
    for (const [route, title] of Object.entries(ROUTE_TITLES)) {
      assert.ok(
        title.length <= 16,
        `Route ${route} title "${title}" has length ${title.length}, expected <= 16`
      );
    }
  });

  test('no title contains ampersand (&) character', () => {
    for (const [route, title] of Object.entries(ROUTE_TITLES)) {
      assert.ok(
        !title.includes('&'),
        `Route ${route} title "${title}" should not contain '&'`
      );
    }
  });
});
