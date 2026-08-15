import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import { CreateServiceAssignmentCards } from './CreateServiceAssignmentCards';

test('shows a selected personal card and a locked Team upgrade overlay', () => {
  const markup = renderToStaticMarkup(
    <CreateServiceAssignmentCards
      mode="self"
      teamEnabled={false}
      onModeChange={vi.fn()}
      onUpgrade={vi.fn()}
    />,
  );
  const source = readFileSync(new URL('./CreateServiceAssignmentCards.tsx', import.meta.url), 'utf8');

  expect(markup).toContain('For myself');
  expect(markup).toContain('For team');
  expect(markup).toContain('Upgrade');
  expect(markup).toContain('aria-checked="true"');
  expect(source).toContain('group-hover');
  expect(source).toContain('group-focus-within');
  expect(source).toContain('onUpgrade');
});
