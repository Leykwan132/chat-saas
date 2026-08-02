import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { ExpandedAppSidebarHeader } from './ExpandedAppSidebarHeader';

test('renders the larger Kilobot wordmark closer to the unchanged logo', () => {
  const markup = renderToStaticMarkup(
    <ExpandedAppSidebarHeader onCollapse={() => undefined} />,
  );

  expect(markup).toContain('gap-[0.45rem]');
  expect(markup).toContain('size-[1.35rem]');
  expect(markup).toContain('text-[16px]');
  expect(markup).toContain('Kilobot');
  expect(markup).toContain('Collapse Sidebar');
});
