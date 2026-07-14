import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./serviceForm.ts', import.meta.url), 'utf8');

test('uses compact shared labels for service preferred times', () => {
  expect(source).toContain("export const DEFAULT_PREFERRED_TIME = '10:00am'");
  expect(source).toContain('minutesToCalendarTimeLabel(value)');
  expect(source).toContain('calendarTimeLabelToMinutes(time)');
});
