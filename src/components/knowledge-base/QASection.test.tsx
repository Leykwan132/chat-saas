import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import { QASection } from './QASection';

vi.mock('convex/react', () => ({
  useMutation: () => vi.fn(),
}));

test('shows common-question presets before the Q&A form', () => {
  const markup = renderToStaticMarkup(
    createElement(QASection, {
      entries: [],
      agentId: undefined,
      openDeleteDialog: () => undefined,
    }),
  );

  expect(markup).toContain('Refund policy');
  expect(markup).toContain('Shipping &amp; delivery');
  expect(markup).toContain('Services');
  expect(markup).toContain('Payment methods');
  expect(markup).toContain('Opening hours');
  expect(markup).not.toContain('Returns &amp; exchanges');
  expect(markup).not.toContain('Contact support');
  expect(markup).not.toContain('Pricing');
  expect(markup.indexOf('Refund policy')).toBeLessThan(markup.indexOf('Add Q&amp;A'));
  expect(markup).not.toContain('Add more');
  expect(markup).not.toContain('Pair 1');
  expect(markup).toContain('field-sizing-content');
});
