import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getNavItems } from './app-sidebar-nav';

describe('Avatar navigation', () => {
  it('places Avatar first under Tools with channel read access', () => {
    const tools = getNavItems('agent-id', {
      showSavedReplies: true,
      enableAvatarFeature: true,
    }).tools;

    expect(tools[0]).toMatchObject({
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
});
