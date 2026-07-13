import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const source = readFileSync(
  fileURLToPath(new URL('./FollowUpDetailPage.tsx', import.meta.url)),
  'utf8',
);

test('existing follow-up activation blocks incomplete messages before confirmation', () => {
  const handler = source.match(
    /const requestActiveChange = \(next: boolean\) => \{[\s\S]*?\n {2}\};/,
  );

  expect(handler?.[0]).toContain('next && !messagesReady');
  expect(handler?.[0]).toContain('setShowMessageRequiredError(true)');
  expect(source).toContain('FOLLOW_UP_MESSAGE_REQUIRED_ERROR');
  expect(source).toContain('text-destructive');
});
