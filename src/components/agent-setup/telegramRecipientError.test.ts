import { expect, test } from 'vitest';
import { recipientAddErrorMessage } from './telegramRecipientError';

test('shows a clear duplicate-recipient message', () => {
  const error = new Error('This Telegram recipient is already added to the agent');

  expect(recipientAddErrorMessage(error)).toBe('This number is already in your recipient list.');
});

test('shows a safe generic recipient-add message for other errors', () => {
  expect(recipientAddErrorMessage(new Error('Unexpected failure'))).toBe('Could not add recipient. Please try again.');
});
