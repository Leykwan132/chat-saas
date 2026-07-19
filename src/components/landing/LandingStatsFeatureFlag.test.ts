import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const source = readFileSync(
  new URL('./LandingStatsSection.tsx', import.meta.url),
  'utf8',
);

describe('landing token usage feature flag', () => {
  test('mounts the complete stats section only when enabled', () => {
    expect(source).toContain('useShowTokenUsage()');
    expect(source).toContain(
      'if (!isProductFeatureEnabled(tokenUsageState)) return null',
    );
    expect(source).toContain('return <EnabledStatsSection />');
  });

  test('keeps both queries and all three statistics inside the enabled component', () => {
    const enabledSectionStart = source.indexOf('function EnabledStatsSection()');
    const wrapperStart = source.indexOf('export function StatsSection()');
    const enabledSection = source.slice(enabledSectionStart, wrapperStart);

    expect(enabledSectionStart).toBeGreaterThan(-1);
    expect(enabledSection).toContain('api.agentUsage.getLifetimeModelUsage');
    expect(enabledSection).toContain('api.llm.modelPricing.listEnabled');
    expect(enabledSection).toContain("label: 'Models Supported'");
    expect(enabledSection).toContain("label: 'Total Token Used'");
    expect(enabledSection).toContain("label: 'Businesses Onboarded'");
    expect(enabledSection).toContain('md:grid-cols-3');
  });
});
