import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const routeSource = readFileSync(
  new URL('./ReferralFeatureRoute.tsx', import.meta.url),
  'utf8',
);
const mainSource = readFileSync(new URL('../main.tsx', import.meta.url), 'utf8');
const sidebarSource = readFileSync(
  new URL('../components/workspace/AgentsSidebar.tsx', import.meta.url),
  'utf8',
);
const onboardingSource = readFileSync(
  new URL('../components/OnboardingFlow.tsx', import.meta.url),
  'utf8',
);

describe('referral feature flag surfaces', () => {
  test('protects the direct route while the flag resolves and when disabled', () => {
    expect(routeSource).toContain('useEnableReferralProgram()');
    expect(routeSource).toContain('referralProgramState === undefined');
    expect(routeSource).toContain(
      'isProductFeatureEnabled(referralProgramState)',
    );
    expect(routeSource).toContain('<Navigate to="/workspace" replace />');
    expect(routeSource).toContain('<ReferralsPage />');
    expect(routeSource).toContain('<Spinner');
  });

  test('routes the referrals page through its feature guard', () => {
    expect(mainSource).toContain(
      'path="referrals" element={<ReferralFeatureRoute />}',
    );
    expect(mainSource).not.toContain('import ReferralsPage');
  });

  test('hides the workspace navigation item unless explicitly enabled', () => {
    expect(sidebarSource).toContain('useEnableReferralProgram()');
    expect(sidebarSource).toContain(
      'isProductFeatureEnabled(referralProgramState)',
    );
    expect(sidebarSource).toContain('referralProgramEnabled ? (');
  });

  test('skips referral onboarding and never submits a code when disabled', () => {
    expect(onboardingSource).toContain('useEnableReferralProgram()');
    expect(onboardingSource).toContain(
      'currentUser === undefined || referralProgramState === undefined',
    );
    expect(onboardingSource).toContain(
      'setStep(referralProgramEnabled ? 4 : 5)',
    );
    expect(onboardingSource).toMatch(
      /referralCode:\s+referralProgramEnabled && referralCode \? referralCode : undefined/,
    );
    expect(onboardingSource).toContain(
      'current === 5 && !referralProgramEnabled',
    );
  });
});
