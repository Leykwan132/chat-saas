import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./CalendarPage.tsx', import.meta.url), 'utf8');

test('emphasizes only Today-list event titles while they are happening', () => {
  expect(source).toContain('isCalendarEventHappening(event, currentTimestamp)');
  expect(source).toContain("? 'font-semibold text-foreground'");
  expect(source).toContain(": 'font-normal text-foreground/80'");
  expect(source).toContain('selectedDayKey === todayKey');
  expect(source).toContain('window.setInterval');
  expect(source).toContain('dateKeyInTimeZone(currentTimestamp, displayTimeZone)');
});
