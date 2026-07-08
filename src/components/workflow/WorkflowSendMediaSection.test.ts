import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./WorkflowSendMediaSection.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('workflow send media status renders below the asset preview grid', () => {
  expect(source.indexOf('{mediaCopy.status}')).toBeGreaterThan(
    source.indexOf('<WorkflowMediaGrid'),
  );
});

test('workflow send media icon renders without a background chip', () => {
  expect(source).not.toContain('bg-muted text-muted-foreground');
});
