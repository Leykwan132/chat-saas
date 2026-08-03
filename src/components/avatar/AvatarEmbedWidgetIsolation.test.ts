import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import widgetScript from '../../../public/widget/v1.js?raw';
import { buildWebWidgetSnippet } from '../channels/webWidgetSnippet';

const appShell = readFileSync(
  new URL('../../../index.html', import.meta.url),
  'utf8',
);

describe('Avatar embed website-widget isolation', () => {
  it('opts the application widget out before Avatar embed initialization', () => {
    expect(appShell).toContain(
      'data-kilobot-exclude-path-prefix="/avatar/embed/"',
    );
    expect(widgetScript).toContain(
      'script.getAttribute("data-kilobot-exclude-path-prefix") || ""',
    );
    expect(widgetScript).toContain(
      'window.location.pathname.startsWith(excludedPathPrefix)',
    );

    const guardIndex = widgetScript.indexOf(
      'window.location.pathname.startsWith(excludedPathPrefix)',
    );
    expect(guardIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeLessThan(widgetScript.indexOf('fetch(configUrl())'));
  });

  it('keeps generated customer widget snippets route-agnostic', () => {
    expect(buildWebWidgetSnippet('pub_test')).not.toContain(
      'data-kilobot-exclude-path-prefix',
    );
  });
});
