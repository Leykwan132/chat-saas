import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./TestChatWindow.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('embedded chat bounds the message viewport for scrolling', () => {
  expect(source).toContain('className="h-0 min-h-0 min-w-0 flex-1 overflow-hidden"');
  expect(source).toContain("'flex min-h-0 w-full min-w-0 max-w-full flex-col'");
  expect(source).toContain("? 'mt-0 min-h-0 flex-1 bg-card'");
  expect(source).toContain('statusRef.current === "CanLoadMore"');
  expect(source).toContain('loadMoreRef.current(20)');
  expect(source).toContain('event.deltaY < 0');
});
