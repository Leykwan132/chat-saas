import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const routeSource = readFileSync(
  new URL('./PartnerFeatureRoute.tsx', import.meta.url),
  'utf8',
);
const mainSource = readFileSync(new URL('../main.tsx', import.meta.url), 'utf8');
const sidebarSource = readFileSync(
  new URL('../components/workspace/AgentsSidebar.tsx', import.meta.url),
  'utf8',
);

describe('partner feature flag surfaces', () => {
  test('protects the direct route until the partner flag is enabled', () => {
    expect(routeSource).toContain('useEnablePartnerPortal()');
    expect(routeSource).toContain('partnerPortalState === undefined');
    expect(routeSource).toContain(
      'isProductFeatureEnabled(partnerPortalState)',
    );
    expect(routeSource).toContain('<Navigate to="/workspace" replace />');
    expect(routeSource).toContain('<PartnerPage />');
  });

  test('routes the partner page through its feature guard', () => {
    expect(mainSource).toContain(
      'path="partner" element={<PartnerFeatureRoute />}',
    );
  });

  test('only renders partner navigation when access and rollout are enabled', () => {
    expect(sidebarSource).toContain('useEnablePartnerPortal()');
    expect(sidebarSource).toContain(
      'isProductFeatureEnabled(partnerPortalState)',
    );
    expect(sidebarSource).toContain('partnerPortalEnabled && partner ? (');
  });
});
