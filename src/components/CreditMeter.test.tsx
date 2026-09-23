import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import { CreditMeter } from './CreditMeter';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
}));

vi.mock('convex/react', () => ({
  useQuery: mocks.useQuery,
}));

vi.mock('@/partnerAuth/AppAuthProvider', () => ({
  useAuth: () => ({ isLoading: false }),
}));

vi.mock('@/components/billing/adjustPlanContext', () => ({
  useAdjustPlan: () => ({ openAdjustPlan: vi.fn() }),
}));

beforeEach(() => {
  mocks.useQuery.mockReset();
  mocks.useQuery.mockReturnValue({
    plan: 'Starter',
    monthlyCredits: 420,
    additionalCredits: 0,
    additionalCreditsGranted: 0,
    referralCredits: 0,
    referralCreditsGranted: 0,
    planConfig: { monthlyCredits: 500 },
    canManageBilling: false,
  });
});

test('shows the plan name without a generic plan label', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <CreditMeter />
    </MemoryRouter>,
  );

  expect(markup).toContain('>Starter</span>');
  expect(markup).not.toContain('>Plan<');
});
