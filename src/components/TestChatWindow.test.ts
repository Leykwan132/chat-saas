import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./TestChatWindow.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('embedded chat bounds the message viewport for scrolling', () => {
  expect(source).toContain('className="h-0 min-h-0 min-w-0 flex-1 overflow-hidden"');
});
