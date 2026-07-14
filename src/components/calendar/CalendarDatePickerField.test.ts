import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./CalendarDatePickerField.tsx', import.meta.url), 'utf8');

test('supports a local display format without changing stored dates', () => {
  expect(source).toContain("displayFormat = 'MMM d, yyyy'");
  expect(source).toContain('displayFormat?: string');
  expect(source).toContain('format(selected, displayFormat)');
  expect(source).toContain("onChange(format(date, 'yyyy-MM-dd'))");
});
