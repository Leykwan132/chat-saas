import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { AgentOverviewDataModeSelect } from './AgentOverviewDataModeSelect';

test('uses a distinct outline without a filled or elevated surface', () => {
  const markup = renderToStaticMarkup(
    <AgentOverviewDataModeSelect value="daily" onChange={() => undefined} />,
  );

  expect(markup).toContain('aria-label="Overview data mode"');
  expect(markup).toContain('h-8 rounded-full border-border bg-transparent px-3 text-sm');
  expect(markup).not.toContain('shadow-sm');
  expect(markup).not.toContain('justify-center');
});
