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
  expect(source).toContain('rounded-full border-input bg-background');
  expect(source).toContain('const inputAnchorRef = React.useRef<HTMLDivElement>(null)');
  expect(source).toContain('<div ref={inputAnchorRef} className="w-full">');
  expect(source).toContain('anchor={inputAnchorRef}');
  expect(source).toContain('w-(--anchor-width) min-w-(--anchor-width) rounded-xl');
  expect(source).not.toContain('min-w-[8.8rem]');
  expect(source).toContain("collisionAvoidance={{ side: 'none', align: 'shift', fallbackAxisSide: 'none' }}");
  expect(source).toContain('whitespace-nowrap');
  expect(source).toContain('px-3 py-2.5');
  expect(source).toContain('onBlur={normalizeValue}');
  expect(source).toContain("event.key === 'Enter'");
  expect(source).not.toContain('PopoverAnchor');
  expect(source).not.toContain('<ScrollArea');
});

test('renders the dropdown inside an optional modal portal container', () => {
  expect(source).toContain('portalContainer?: React.RefObject<HTMLElement | null>');
  expect(source).toContain("contentAlign?: 'start' | 'end'");
  expect(source).toContain('<ComboboxContent');
  expect(source).toContain('portalContainer={portalContainer}');
  expect(source).toContain('align={contentAlign}');
});
