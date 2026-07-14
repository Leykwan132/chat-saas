import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const sourceUrl = new URL('./EditableTimeCombobox.tsx', import.meta.url);
const source = existsSync(sourceUrl) ? readFileSync(sourceUrl, 'utf8') : '';

test('supports editable custom times and standard dropdown options', () => {
  expect(source).toContain("from '@/components/ui/combobox'");
  expect(source).toContain('<Combobox');
  expect(source).toContain('<ComboboxInput');
  expect(source).toContain('<ComboboxContent');
  expect(source).toContain('<ComboboxList');
  expect(source).toContain('<ComboboxItem');
  expect(source).toContain('CALENDAR_TIME_OPTIONS');
  expect(source).toContain('parseCalendarTimeLabel');
  expect(source).toContain('inputValue={value}');
  expect(source).toContain('onInputValueChange={onChange}');
  expect(source).toContain('min-w-32');
  expect(source).toContain('min-w-44');
  expect(source).toContain('whitespace-nowrap');
  expect(source).toContain('px-3 py-2.5');
  expect(source).toContain('onBlur={normalizeValue}');
  expect(source).toContain("event.key === 'Enter'");
  expect(source).not.toContain('PopoverAnchor');
  expect(source).not.toContain('<ScrollArea');
});
