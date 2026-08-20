import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { Dialog } from '@/components/ui/dialog';
import {
  MessengerConnectingContent,
  MessengerConnectionErrorContent,
} from './MessengerConnectionStatusDialog';
import {
  isMessengerConnectionDialogDismissible,
  isMessengerConnectionDialogOpen,
  type MessengerConnectionDialogState,
} from './messengerConnectionDialogState';

test('opens a progress dialog while Facebook Pages are loading', () => {
  const state: MessengerConnectionDialogState = { kind: 'connecting' };

  expect(isMessengerConnectionDialogOpen(state)).toBe(true);
  expect(isMessengerConnectionDialogDismissible(state)).toBe(false);
});

test('progress content shows Facebook Page loading feedback without retry actions', () => {
  const markup = renderToStaticMarkup(
    <Dialog>
      <MessengerConnectingContent />
    </Dialog>,
  );

  expect(markup).toContain('Connecting to Facebook');
  expect(markup).toContain('Getting your Facebook Pages…');
  expect(markup).toContain('animate-spin');
  expect(markup).not.toContain('Connection failed');
  expect(markup).not.toContain('Try again');
  expect(markup).not.toContain('data-slot="dialog-close"');
});

test('connection errors show a customer-safe message instead of backend details', () => {
  const markup = renderToStaticMarkup(
    <Dialog>
      <MessengerConnectionErrorContent onRetry={() => undefined} />
    </Dialog>,
  );

  expect(markup).toContain('Couldn’t connect Messenger');
  expect(markup).toContain(
    'We couldn’t connect your Messenger account. Please try again.',
  );
  expect(markup).not.toContain('messengerConnect:completeSignup');
  expect(markup).not.toContain('Server Error Called by client');
});
