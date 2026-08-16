import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const dialogSource = readFileSync(new URL('./dialog.tsx', import.meta.url), 'utf8');

test('dialog content can mount its portal into a scoped container', () => {
  expect(dialogSource).toContain('portalContainer');
  expect(dialogSource).toContain('<DialogPortal container={portalContainer ?? undefined}>');
  expect(dialogSource).toContain('overlayClassName?: string');
});

test('uses the shared light unblurred dialog backdrop', () => {
  expect(dialogSource).toContain('bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-none');
  expect(dialogSource).not.toContain('bg-black/30 duration-100 supports-backdrop-filter:backdrop-blur-sm');
});
