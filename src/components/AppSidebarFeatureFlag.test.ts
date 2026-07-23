import { describe, expect, test } from 'vitest';
import { getNavItems } from './app-sidebar-nav';

describe('sidebar feature flags', () => {
  test('includes Quick Replies only when enabled', () => {
    const enabled = getNavItems('agent-id', {
      showSavedReplies: true,
      enableAvatarFeature: false,
    });
    const disabled = getNavItems('agent-id', {
      showSavedReplies: false,
      enableAvatarFeature: false,
    });

    expect(enabled.tools.map((item) => item.label)).toContain('Quick Replies');
    expect(disabled.tools.map((item) => item.label)).not.toContain('Quick Replies');
  });

  test('includes Avatar only when enabled', () => {
    const enabled = getNavItems('agent-id', {
      showSavedReplies: false,
      enableAvatarFeature: true,
    });
    const disabled = getNavItems('agent-id', {
      showSavedReplies: false,
      enableAvatarFeature: false,
    });

    expect(enabled.tools.map((item) => item.label)).toContain('Avatar');
    expect(disabled.tools.map((item) => item.label)).not.toContain('Avatar');
  });
});
