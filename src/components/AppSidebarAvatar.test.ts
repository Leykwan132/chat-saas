import { readFileSync } from 'node:fs';
import { PiBellRinging } from 'react-icons/pi';
import { describe, expect, it } from 'vitest';
import { getNavItems } from './app-sidebar-nav';

describe('Avatar navigation', () => {
  it('keeps Avatar out of the sidebar', () => {
    const labels = getNavItems('agent-id', {
      showSavedReplies: true,
    }).find((section) => section.label === 'Agent')?.items.map((item) => item.label);

    expect(labels).not.toContain('Avatar');
  });

  it('does not resolve the Avatar flag in the sidebar', () => {
    const source = readFileSync(new URL('./app-sidebar.tsx', import.meta.url), 'utf8');

    expect(source).not.toContain('useEnableAvatarFeature()');
    expect(source).not.toContain('enableAvatarFeature');
  });

  it('renders the beta badge beside the label with neutral styling', () => {
    const source = readFileSync(
      new URL('./app-sidebar-nav-item.tsx', import.meta.url),
      'utf8',
    );

    expect(source).toContain('bg-muted');
    expect(source).toContain('text-muted-foreground');
  });

  it('places Notifications after Message Templates under Outreach', () => {
    const outreach = getNavItems('agent-id', {
      showSavedReplies: true,
    }).find((section) => section.label === 'Outreach')?.items;

    const notificationIndex = outreach?.findIndex((item) => item.label === 'Notifications');
    const templatesIndex = outreach?.findIndex((item) => item.label === 'Message Templates');

    expect(outreach?.[notificationIndex ?? -1]).toMatchObject({
      to: '/dashboard/agent-id/notifications',
      icon: PiBellRinging,
      requiredPermission: 'agents:manage',
    });
    expect(notificationIndex).toBe((templatesIndex ?? 0) + 1);
  });
});
