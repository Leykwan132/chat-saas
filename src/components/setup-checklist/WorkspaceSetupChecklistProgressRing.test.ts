import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('progress ring scales to the surrounding 5/5 text size', () => {
  const source = readFileSync(
    new URL('./WorkspaceSetupChecklistProgressRing.tsx', import.meta.url),
    'utf8',
  );
  expect(source).toContain('size-[1em]');
  expect(source).toContain('strokeDashoffset');
  expect(source).toContain('text-teal-600');
});
