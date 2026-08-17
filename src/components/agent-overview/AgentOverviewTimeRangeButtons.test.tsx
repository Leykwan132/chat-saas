import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { AgentOverviewTimeRangeButtons } from './AgentOverviewTimeRangeButtons';

test('labels each range and remains selectable while refreshing', () => {
  const markup = renderToStaticMarkup(
    <AgentOverviewTimeRangeButtons
      value="30d"
      onChange={() => undefined}
      isRefreshing
    />,
  );

  expect(markup).toContain('aria-busy="true"');
  expect(markup).toContain('aria-label="Last day"');
  expect(markup).toContain('aria-label="Last 7 days"');
  expect(markup).toContain('aria-label="Last 30 days"');
  expect(markup).toContain('aria-label="Last 90 days"');
  expect(markup).toContain('>1d</button>');
  expect(markup).toContain('>7d</button>');
  expect(markup).toContain('>30d</button>');
  expect(markup).toContain('>90d</button>');
  expect(markup).not.toContain('disabled=""');
});
