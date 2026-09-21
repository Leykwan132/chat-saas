import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { PlanComparisonTable } from './PlanComparisonTable';

test('compares paid plans without offering Free', () => {
  const markup = renderToStaticMarkup(<PlanComparisonTable />);

  expect(markup).not.toContain('>Free<');
  expect(markup).toContain('>Starter<');
  expect(markup).toContain('>Growth<');
  expect(markup).toContain('>Business<');
  expect(markup).toContain('>Enterprise<');
});
