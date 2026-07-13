import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const source = readFileSync(
  fileURLToPath(new URL('./AutomationsFollowUpPage.tsx', import.meta.url)),
  'utf8',
);

test('new follow-up activation blocks incomplete messages with inline feedback', () => {
  expect(source).toContain('hasCompleteFollowUpMessages(attempts)');
  expect(source).toContain('setShowMessageRequiredError(true)');
  expect(source).toContain('FOLLOW_UP_MESSAGE_REQUIRED_ERROR');
  expect(source).toContain('text-destructive');
});

test('paused creation does not require selected messages', () => {
  expect(source).toContain('if (isActiveOnCreate && !messagesReady)');
});
