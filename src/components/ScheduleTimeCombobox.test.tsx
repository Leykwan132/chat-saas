import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { ScheduleTimeCombobox } from './ScheduleTimeCombobox';

test('renders an editable schedule time with the selected value', () => {
  const markup = renderToStaticMarkup(
    <ScheduleTimeCombobox
      value={9 * 60 + 7}
      options={[{ value: '547', label: '9:07am' }]}
      maxValue={1439}
      ariaLabel="Monday start time"
      onChange={() => undefined}
    />,
  );

  expect(markup).toContain('aria-label="Monday start time"');
  expect(markup).toContain('value="9:07am"');
});

test('keeps a typed custom time selected when it is outside the preset options', () => {
  const markup = renderToStaticMarkup(
    <ScheduleTimeCombobox
      value={21 * 60 + 12}
      options={[{ value: '1260', label: '9:00pm' }]}
      maxValue={1439}
      ariaLabel="Wednesday start time"
      onChange={() => undefined}
    />,
  );

  expect(markup).toContain('value="9:12pm"');
  const source = readFileSync(new URL('./ScheduleTimeCombobox.tsx', import.meta.url), 'utf8');
  expect(source).toContain('const selectableOptions = selectedOption === null');
  expect(source).toContain('items={selectableOptions}');
});
