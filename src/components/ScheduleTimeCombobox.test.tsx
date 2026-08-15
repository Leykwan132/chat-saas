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
