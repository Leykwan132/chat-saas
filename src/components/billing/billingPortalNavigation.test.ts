import { expect, test } from 'vitest';
import {
  openBillingPortalInNewWindow,
  openBillingPortalNavigation,
} from './billingPortalNavigation';

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

test('reserves a new tab before requesting the Portal session', async () => {
  const events: string[] = [];
  let assignedUrl: string | null = null;
  const portalWindow = {
    opener: {} as unknown,
    location: {
      assign: (url: string) => {
        events.push('assign');
        assignedUrl = url;
      },
    },
    close: () => {
      events.push('close');
    },
  };

  await openBillingPortalInNewWindow({
    createPortal: async () => {
      events.push('create');
      return { url: 'https://billing.stripe.test' };
    },
    returnPath: '/workspace/settings?section=plan',
    openWindow: () => {
      events.push('open');
      return portalWindow;
    },
  });

  expect(events).toEqual(['open', 'create', 'assign']);
  expect(portalWindow.opener).toBeNull();
  expect(assignedUrl).toBe('https://billing.stripe.test');
});

test('does not request a Portal session when the browser blocks the tab', async () => {
  let createCount = 0;

  await expect(
    openBillingPortalInNewWindow({
      createPortal: async () => {
        createCount += 1;
        return { url: 'https://billing.stripe.test' };
      },
      returnPath: '/workspace/settings?section=plan',
      openWindow: () => null,
    }),
  ).rejects.toThrow('Allow pop-ups to manage billing.');

  expect(createCount).toBe(0);
});

test('closes the reserved tab when Portal creation fails', async () => {
  let closed = false;

  await expect(
    openBillingPortalInNewWindow({
      createPortal: async () => null,
      returnPath: '/workspace/settings?section=plan',
      openWindow: () => ({
        opener: null,
        location: { assign: () => undefined },
        close: () => {
          closed = true;
        },
      }),
    }),
  ).rejects.toThrow('Could not load billing portal.');

  expect(closed).toBe(true);
});
