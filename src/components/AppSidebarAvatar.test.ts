import { readFileSync } from 'node:fs';
import { PiBellRinging } from 'react-icons/pi';
import { describe, expect, it } from 'vitest';
import { getNavItems } from './app-sidebar-nav';

describe('Avatar navigation', () => {
  it('places Avatar under Agent with channel read access', () => {
    const agent = getNavItems('agent-id', {
      showSavedReplies: true,
      enableAvatarFeature: true,
    }).find((section) => section.label === 'Agent')?.items;

    expect(agent?.at(-1)).toMatchObject({
      to: '/dashboard/agent-id/avatar',
      label: 'Avatar',
      badgeLabel: 'Beta',
      requiredPermission: 'channels:read',
    });
  });

  it('resolves the Avatar flag before building navigation', () => {
    const source = readFileSync(new URL('./app-sidebar.tsx', import.meta.url), 'utf8');

    expect(source).toContain('useEnableAvatarFeature()');
    expect(source).toContain(
      'enableAvatarFeature: isProductFeatureEnabled(avatarFeatureState)',
    );
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
      enableAvatarFeature: true,
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
