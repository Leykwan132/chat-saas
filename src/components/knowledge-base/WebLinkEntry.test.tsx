import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { WebLinkEntry } from './WebLinkEntry';
import { WebSection } from './WebSection';

vi.mock('convex/react', () => ({
  useAction: () => vi.fn(),
  useQuery: () => ({ plan: 'starter' }),
}));

vi.mock('@posthog/react', () => ({
  usePostHog: () => ({ capture: vi.fn() }),
}));

const webSectionSource = readFileSync(
  fileURLToPath(new URL('./WebSection.tsx', import.meta.url)),
  'utf8',
);

describe('WebLinkEntry', () => {
  it('uses the Add website heading without an outer card border or URL label', () => {
    const markup = renderToStaticMarkup(
      <WebLinkEntry>
        <input aria-label="Research website" />
      </WebLinkEntry>,
    );

    expect(markup).toContain('Add website');
    expect(markup).not.toContain('class="rounded-lg border border-border bg-card p-4 space-y-3"');
    expect(markup).not.toContain('>URL<');
  });

  it('matches text and Q&A list rows and keeps a bordered white URL field', () => {
    expect(webSectionSource).toContain('rounded-md bg-muted px-4 py-3');
    expect(webSectionSource).toContain('border-border bg-background pr-12');
    expect(webSectionSource).not.toContain('rounded-lg border border-border bg-card px-4 py-3');
    expect(webSectionSource).not.toContain('formatTimeAgo');
    expect(webSectionSource).toContain('<WebRowStatus status={parent.status} />');
  });

  it('puts failed status in front of the url and hides the timestamp', () => {
    const markup = renderToStaticMarkup(
      createElement(WebSection, {
        entries: [{
          _id: 'web_failed' as never,
          url: 'https://kilobot.app/',
          status: 'failed',
          createdAt: Date.now() - 22 * 60 * 1000,
        }],
        agentId: 'agent_1' as never,
        openDeleteDialog: () => undefined,
      }),
    );

    expect(markup).toContain('bg-red-600');
    expect(markup).toContain('aria-label="Failed"');
    expect(markup).not.toContain('>Failed<');
    expect(markup).toContain('https://kilobot.app/');
    expect(markup).not.toContain('ago');
    expect(markup.indexOf('bg-red-600')).toBeLessThan(markup.indexOf('https://kilobot.app/'));
  });
});
