import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { AgentOverviewDataModeSelect } from './AgentOverviewDataModeSelect';

test('uses the same rounded size and type scale as the range controls', () => {
  const markup = renderToStaticMarkup(
    <AgentOverviewDataModeSelect value="daily" onChange={() => undefined} />,
  );

  expect(markup).toContain('aria-label="Overview data mode"');
  expect(markup).toContain('relative h-8 justify-center rounded-full px-3 text-sm');
  expect(markup).toContain('[&amp;&gt;svg]:absolute [&amp;&gt;svg]:right-3');
});
