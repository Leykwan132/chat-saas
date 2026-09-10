import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./AgentPlaygroundPanel.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('inline test chat uses a bounded flex container so messages can scroll', () => {
  expect(source).toContain(
    "flex h-[min(744px,calc(100svh-10rem))] min-h-[541px] flex-col overflow-hidden",
  );
});
