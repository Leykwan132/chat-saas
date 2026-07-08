import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const dialogSource = readFileSync(new URL('./dialog.tsx', import.meta.url), 'utf8');

test('dialog content can mount its portal into a scoped container', () => {
  expect(dialogSource).toContain('portalContainer');
  expect(dialogSource).toContain('<DialogPortal container={portalContainer ?? undefined}>');
  expect(dialogSource).toContain('overlayClassName?: string');
});
