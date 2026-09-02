import { expect, test } from 'vitest';
import { getCustomerSafeMessengerConnectionFailureMessage } from './messengerConnectionFeedback';

test('masks a raw Messenger connection error before it reaches a customer', () => {
  const rawError =
    '[CONVEX A(messengerConnect:completeSignup)] Server Error Called by client';
  const message = getCustomerSafeMessengerConnectionFailureMessage(rawError);

  expect(message).toBe(
    'We couldn’t connect your Messenger account. Please try again.',
  );
  expect(message).not.toContain('messengerConnect:completeSignup');
  expect(message).not.toContain('Server Error Called by client');
});
