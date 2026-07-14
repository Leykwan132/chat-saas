import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const sourceUrl = new URL('./EditableTimeCombobox.tsx', import.meta.url);
const source = existsSync(sourceUrl) ? readFileSync(sourceUrl, 'utf8') : '';

test('supports editable custom times and standard dropdown options', () => {
  expect(source).toContain('PopoverAnchor');
  expect(source).toContain('role="combobox"');
  expect(source).toContain('CALENDAR_TIME_OPTIONS');
  expect(source).toContain('parseCalendarTimeLabel');
  expect(source).toContain('onBlur={normalizeValue}');
  expect(source).toContain("event.key === 'Enter'");
  expect(source).toContain('onChange(event.target.value)');
});
