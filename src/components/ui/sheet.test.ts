import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const sheetSource = readFileSync(new URL('./sheet.tsx', import.meta.url), 'utf8');

test('uses the shared light unblurred sheet backdrop', () => {
  expect(sheetSource).toContain('bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-none');
  expect(sheetSource).not.toContain('bg-black/30 duration-100 supports-backdrop-filter:backdrop-blur-sm');
});
