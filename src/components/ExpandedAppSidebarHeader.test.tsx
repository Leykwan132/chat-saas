import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { ExpandedAppSidebarHeader } from './ExpandedAppSidebarHeader';

test('renders the Kilobot lockup on native hosts', () => {
  const markup = renderToStaticMarkup(
    <ExpandedAppSidebarHeader onCollapse={() => undefined} brand={null} />,
  );

  expect(markup).toContain('gap-[0.45rem]');
  expect(markup).toContain('size-5');
  expect(markup).toContain('text-[18px]');
  expect(markup).toContain('src="/icon.svg"');
  expect(markup).toContain('Kilobot');
  expect(markup).toContain('Collapse Sidebar');
});

test('renders the partner logo and name on a custom hostname', () => {
  const markup = renderToStaticMarkup(
    <ExpandedAppSidebarHeader
      onCollapse={() => undefined}
      brand={{ name: 'Acme Studio', logoUrl: 'https://cdn.test/acme.png' }}
    />,
  );

  expect(markup).toContain('src="https://cdn.test/acme.png"');
  expect(markup).toContain('Acme Studio');
  expect(markup).not.toContain('/icon.svg');
  expect(markup).not.toContain('Kilobot');
});

test('falls back to a brand initial when the partner has no logo', () => {
  const markup = renderToStaticMarkup(
    <ExpandedAppSidebarHeader
      onCollapse={() => undefined}
      brand={{ name: 'Acme Studio', logoUrl: null }}
    />,
  );

  expect(markup).toContain('>A<');
  expect(markup).not.toContain('/icon.svg');
  expect(markup).not.toContain('Kilobot');
});

test('shows nothing while partner branding is still loading', () => {
  const markup = renderToStaticMarkup(
    <ExpandedAppSidebarHeader onCollapse={() => undefined} brand={undefined} />,
  );

  expect(markup).not.toContain('Kilobot');
  expect(markup).not.toContain('/icon.svg');
});
