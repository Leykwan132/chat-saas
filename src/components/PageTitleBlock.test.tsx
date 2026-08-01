import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { PageTitleBlock } from './PageTitleBlock';

test('renders dashboard titles with the KiloBot title font at normal weight', () => {
  const markup = renderToStaticMarkup(
    <PageTitleBlock title="Services" description="Bookable services." />,
  );

  expect(markup).toContain('font-title');
  expect(markup).toContain('font-normal');
  expect(markup).not.toContain('font-semibold');
  expect(markup).not.toContain('font-bold');
  expect(markup).toContain('Services');
  expect(markup).toContain('Bookable services.');
});
