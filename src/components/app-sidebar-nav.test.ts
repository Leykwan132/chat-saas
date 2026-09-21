import { describe, expect, it } from 'vitest';
import { getNavItems } from './app-sidebar-nav';

describe('agent sidebar navigation', () => {
  it('organizes agent destinations into the approved six sections in sidebar order', () => {
    const sections = getNavItems('agent-id', {
      showSavedReplies: true,
      enableAvatarFeature: true,
      enableCommentToInbox: true,
    });

    expect(sections.map((section) => section.label)).toEqual([
      'Overview',
      'Conversations',
      'Agent',
      'Bookings',
      'Outreach',
      'Usage',
    ]);
    expect(sections.map((section) => section.items.map((item) => item.label))).toEqual([
      ['Overview'],
      ['Inbox', 'Contacts', 'Quick Replies'],
      ['Configuration', 'Knowledge Base', 'Workflow', 'Channels', 'Avatar'],
      ['Calendar', 'Availability', 'Services', 'Routing'],
      ['Broadcast', 'Message Templates', 'Notifications', 'Comment-to-Inbox'],
      ['Agent Usage'],
    ]);
  });
});
