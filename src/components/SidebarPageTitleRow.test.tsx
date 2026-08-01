import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { SidebarPageTitleRow } from './SidebarPageTitleRow';

test('renders an unboxed normal-weight KiloBot sidebar title with an action', () => {
  const markup = renderToStaticMarkup(
    <SidebarPageTitleRow
      title="Inbox"
      action={<button type="button">Collapse</button>}
    />,
  );

  expect(markup).toContain('<h1');
  expect(markup).toContain('font-title');
  expect(markup).toContain('text-3xl');
  expect(markup).toContain('font-normal');
  expect(markup).toContain('Inbox');
  expect(markup).toContain('Collapse');
  expect(markup).toContain('pb-0');
  expect(markup).not.toContain('pb-2');
  expect(markup).not.toContain('border-b');
});
