import { describe, expect, it } from 'vitest';
import { getNavItems } from './app-sidebar-nav';

describe('Comment-to-Inbox navigation', () => {
  it('places Comment-to-Inbox under Outreach', () => {
    const outreach = getNavItems('agent-id', {
      showSavedReplies: false,
      enableAvatarFeature: true,
      enableCommentToInbox: true,
    }).find((section) => section.label === 'Outreach')?.items;

    expect(outreach?.map((item) => item.label)).toEqual([
      'Broadcast',
      'Message Templates',
      'Notifications',
      'Comment-to-Inbox',
    ]);
  });
});
