import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(
  new URL('../components/calendar/CalendarSidebar.tsx', import.meta.url),
  'utf8',
);

test('keeps the calendar month and filters aligned in the sidebar', () => {
  expect(source).toContain('<div className="px-4 py-[0.45rem]">');
  expect(source).toContain('data-calendar-sidebar-section="month"');
  expect(source).toContain('className="flex justify-center pb-[0.675rem]"');
  expect(source).toContain('<CalendarSidebarFilterSection title="View">');
});
