import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./ChatsPage.tsx', import.meta.url), 'utf8');
const chatHeader = source.slice(
  source.indexOf('{/* Chat Header */}'),
  source.indexOf('<div className="relative row-start-2'),
);

test('inbox chat header does not show message templates beside AI replies', () => {
  expect(chatHeader).toContain('AI replies');
  expect(chatHeader).not.toContain('Message templates');
  expect(chatHeader).not.toContain('/templates');
});

test('AI replies control has no surrounding border', () => {
  expect(chatHeader).not.toContain(
    'rounded-md border border-border bg-background',
  );
});
