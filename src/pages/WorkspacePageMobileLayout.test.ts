import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./WorkspacePage.tsx', import.meta.url), 'utf8');

test('workspace header exposes the navigation sidebar on mobile', () => {
  expect(source).toContain('SidebarTrigger');
  expect(source).toContain('md:hidden');
});

test('workspace agent cards stay one per mobile row with compact gutters', () => {
  expect(source).toContain('grid grid-cols-1 gap-4 sm:grid-cols-3');
  expect(source).not.toContain('grid grid-cols-2 gap-4 sm:grid-cols-3');
  expect(source).toContain(
    "flex-1 overflow-auto px-4 py-6 sm:px-6 md:px-12 md:py-8 lg:px-28",
  );
});
