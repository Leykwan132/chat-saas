import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { ExpandedAppSidebarHeader } from './ExpandedAppSidebarHeader';

test('renders a more prominent Kilobot wordmark beside a slightly smaller logo', () => {
  const markup = renderToStaticMarkup(
    <ExpandedAppSidebarHeader onCollapse={() => undefined} />,
  );

  expect(markup).toContain('gap-[0.45rem]');
  expect(markup).toContain('size-5');
  expect(markup).toContain('text-[18px]');
  expect(markup).toContain('Kilobot');
  expect(markup).toContain('Collapse Sidebar');
});
