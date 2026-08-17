import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import { QASection } from './QASection';

vi.mock('convex/react', () => ({
  useAction: () => vi.fn(),
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
  expect(markup).toContain('Contact support');
  expect(markup.indexOf('Refund policy')).toBeLessThan(markup.indexOf('Add Q&amp;A'));
  expect(markup).not.toContain('Add more');
});
