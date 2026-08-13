import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { Calendar } from './calendar';

test('keeps a selected current day free of the square today background', () => {
  const selectedDate = new Date(2026, 7, 13);
  const markup = renderToStaticMarkup(
    <Calendar
      mode="single"
      month={selectedDate}
      selected={selectedDate}
      today={selectedDate}
    />,
  );

  expect(markup).toMatch(
    /<td[^>]*data-\[selected=true\]:bg-transparent[^>]*data-selected="true"[^>]*data-today="true"/,
  );
});
