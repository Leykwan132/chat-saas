import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { AgentOverviewDataModeSelect } from './AgentOverviewDataModeSelect';

test('uses the same rounded size and type scale as the range controls', () => {
  const markup = renderToStaticMarkup(
    <AgentOverviewDataModeSelect value="daily" onChange={() => undefined} />,
  );

  expect(markup).toContain('aria-label="Overview data mode"');
  expect(markup).toContain('h-8 rounded-full px-3 text-sm');
  expect(markup).not.toContain('justify-center');
});
