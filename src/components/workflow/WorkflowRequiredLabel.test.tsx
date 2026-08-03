import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { WorkflowRequiredLabel } from './WorkflowRequiredLabel';

test('renders a visible red asterisk and accessible required text', () => {
  const markup = renderToStaticMarkup(
    <WorkflowRequiredLabel>Services</WorkflowRequiredLabel>,
  );

  expect(markup).toContain('Services');
  expect(markup).toContain('text-destructive');
  expect(markup).toContain('aria-hidden="true"');
  expect(markup).toContain('>*</span>');
  expect(markup).toContain('sr-only"> required</span>');
});
