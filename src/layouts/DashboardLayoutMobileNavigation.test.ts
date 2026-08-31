import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./DashboardLayout.tsx', import.meta.url), 'utf8');

test('dashboard header exposes the sidebar trigger on mobile', () => {
  expect(source).toContain('SidebarTrigger');
  expect(source).toContain('md:hidden');
});

test('dashboard content uses compact horizontal gutters on mobile', () => {
  expect(source).toContain(
    "'flex-1 overflow-auto px-4 py-6 sm:px-6 md:px-12 md:py-8 lg:px-28'",
  );
});
