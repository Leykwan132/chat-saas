import { describe, expect, it } from 'vitest';
import { buildWebWidgetSnippet } from '../channels/webWidgetSnippet';

describe('Avatar embed website-widget isolation', () => {
  it('keeps generated customer widget snippets route-agnostic', () => {
    expect(buildWebWidgetSnippet('pub_test')).not.toContain(
      'data-kilobot-exclude-path-prefix',
    );
  });
});
