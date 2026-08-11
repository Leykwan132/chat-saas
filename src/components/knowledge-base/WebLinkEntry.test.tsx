import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WebLinkEntry } from './WebLinkEntry';

describe('WebLinkEntry', () => {
  it('uses the Add links heading without an outer card border or URL label', () => {
    const markup = renderToStaticMarkup(
      <WebLinkEntry>
        <input aria-label="Add links" />
      </WebLinkEntry>,
    );

    expect(markup).toContain('Add links');
    expect(markup).not.toContain('class="rounded-lg border border-border bg-card p-4 space-y-3"');
    expect(markup).not.toContain('>URL<');
  });
});
