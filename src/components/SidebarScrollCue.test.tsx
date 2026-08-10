import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { SidebarScrollCue } from './SidebarScrollCue';

describe('SidebarScrollCue', () => {
  test('renders a non-interactive fade above the fixed sidebar footer', () => {
    const markup = renderToStaticMarkup(<SidebarScrollCue />);

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('bg-gradient-to-b');
    expect(markup).toContain('from-transparent');
    expect(markup).toContain('to-sidebar');
  });
});
