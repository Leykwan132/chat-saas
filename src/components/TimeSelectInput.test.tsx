import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { TimeSelectInput } from './TimeSelectInput';

test('shows a formatted existing time as the selected option', () => {
  const markup = renderToStaticMarkup(
    <TimeSelectInput value="9:00 AM" onChange={() => undefined} />,
  );

  expect(markup).toContain('>9:00am</span>');
  expect(markup).not.toContain('>Select time</span>');
});

test('shows a valid non-standard existing time as the selected option', () => {
  const markup = renderToStaticMarkup(
    <TimeSelectInput value="9:07 AM" onChange={() => undefined} />,
  );

  expect(markup).toContain('>9:07am</span>');
});
