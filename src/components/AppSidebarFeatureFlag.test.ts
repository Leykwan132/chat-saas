import { describe, expect, test } from 'vitest';
import { getNavItems } from './app-sidebar-nav';

describe('Quick Replies sidebar feature flag', () => {
  test('includes Quick Replies when enabled', () => {
    const items = getNavItems('agent-id', { showSavedReplies: true });

    expect(items.tools.map((item) => item.label)).toContain('Quick Replies');
  });

  test('omits Quick Replies when disabled', () => {
    const items = getNavItems('agent-id', { showSavedReplies: false });

    expect(items.tools.map((item) => item.label)).not.toContain('Quick Replies');
  });
});
