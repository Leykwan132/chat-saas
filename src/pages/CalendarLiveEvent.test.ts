import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./CalendarPage.tsx', import.meta.url), 'utf8');

test('uses darker titles for Today-list events until their end time has passed', () => {
  expect(source).toContain('isCalendarEventNotPast(event, currentTimestamp)');
  expect(source).toContain("? 'font-medium text-foreground'");
  expect(source).toContain(": 'font-normal text-foreground/80'");
  expect(source).toContain('selectedDayKey === todayKey');
  expect(source).toContain('window.setInterval');
  expect(source).toContain('dateKeyInTimeZone(currentTimestamp, displayTimeZone)');
});
