import { describe, expect, test } from 'vitest';
import {
  PiBroadcast,
  PiChatCircleText,
  PiGearSix,
  PiShoppingCart,
} from 'react-icons/pi';
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

    expect(enabled.find((section) => section.label === 'Conversations')?.items.map((item) => item.label)).toContain('Quick Replies');
    expect(disabled.find((section) => section.label === 'Conversations')?.items.map((item) => item.label)).not.toContain('Quick Replies');
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

    expect(enabled.find((section) => section.label === 'Agent')?.items.map((item) => item.label)).toContain('Avatar');
    expect(disabled.find((section) => section.label === 'Agent')?.items.map((item) => item.label)).not.toContain('Avatar');
  });

  test('places Knowledge Base directly below Configuration', () => {
    const labels = getNavItems('agent-id', {
      showSavedReplies: false,
      enableAvatarFeature: false,
    }).find((section) => section.label === 'Agent')?.items.map((item) => item.label);

    expect(labels).toEqual([
      'Configuration',
      'Knowledge Base',
      'Workflow',
      'Channels',
    ]);
  });

  test('uses the approved Inbox and Services navigation icons', () => {
    const navigation = getNavItems('agent-id', {
      showSavedReplies: false,
      enableAvatarFeature: false,
    });

    expect(
      navigation.find((section) => section.label === 'Conversations')?.items.find((item) => item.label === 'Inbox')?.icon,
    ).toBe(PiChatCircleText);
    expect(
      navigation.find((section) => section.label === 'Bookings')?.items.find((item) => item.label === 'Services')?.icon,
    ).toBe(PiShoppingCart);
  });

  test('uses distinct icons for Agent Configuration and Outreach Broadcast', () => {
    const navigation = getNavItems('agent-id', {
      showSavedReplies: false,
      enableAvatarFeature: false,
    });

    expect(
      navigation.find((section) => section.label === 'Agent')?.items.find((item) => item.label === 'Configuration')?.icon,
    ).toBe(PiGearSix);
    expect(
      navigation.find((section) => section.label === 'Outreach')?.items.find((item) => item.label === 'Broadcast')?.icon,
    ).toBe(PiBroadcast);
  });
});
