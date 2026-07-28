import { expect, test } from 'vitest';
import { openBillingPortalNavigation } from './billingPortalNavigation';

test('opens the returned Stripe billing portal URL', async () => {
  let assignedUrl: string | null = null;

  await openBillingPortalNavigation({
    createPortal: async ({ returnPath }) => ({
      url: `https://billing.stripe.test?return=${encodeURIComponent(returnPath)}`,
    }),
    returnPath: '/workspace/settings?section=plan',
    assign: (url) => {
      assignedUrl = url;
    },
  });

  expect(assignedUrl).toBe(
    'https://billing.stripe.test?return=%2Fworkspace%2Fsettings%3Fsection%3Dplan',
  );
});
