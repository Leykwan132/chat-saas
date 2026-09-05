import { describe, expect, it } from 'vitest';
import { getNavItems } from './app-sidebar-nav';

describe('Comment-to-Inbox navigation', () => {
  it('places Comment-to-Inbox directly below Avatar within Tools', () => {
    const tools = getNavItems('agent-id', {
      showSavedReplies: false,
      enableAvatarFeature: true,
      enableCommentToInbox: true,
    }).tools;

    expect(tools.slice(0, 2).map((item) => item.label)).toEqual([
      'Avatar',
      'Comment-to-Inbox',
    ]);
  });
});
