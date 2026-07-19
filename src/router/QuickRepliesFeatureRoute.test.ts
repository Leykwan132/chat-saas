import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const routeSource = readFileSync(
  new URL('./QuickRepliesFeatureRoute.tsx', import.meta.url),
  'utf8',
);
const mainSource = readFileSync(new URL('../main.tsx', import.meta.url), 'utf8');

describe('Quick Replies direct route feature flag', () => {
  test('waits, renders, or redirects from the tri-state flag', () => {
    expect(routeSource).toContain('savedRepliesState === undefined');
    expect(routeSource).toContain('return <QuickRepliesPage />');
    expect(routeSource).toContain(
      'to={`/dashboard/${agentId}/inbox`}',
    );
    expect(routeSource).toContain('replace');
  });

  test('routes Quick Replies through the feature gate', () => {
    expect(mainSource).toContain(
      'path="quick-replies" element={<QuickRepliesFeatureRoute />}',
    );
    expect(mainSource).not.toContain(
      'path="quick-replies" element={<QuickRepliesPage />}',
    );
  });

  test('keeps the application entrypoint below the file-size limit', () => {
    expect(mainSource.split('\n').length).toBeLessThanOrEqual(300);
  });

  test('keeps React route components out of the application entrypoint', () => {
    expect(mainSource).toContain("from '@/router/AppRouteComponents'");
    expect(mainSource).not.toMatch(/^function [A-Z]/m);
  });
});
