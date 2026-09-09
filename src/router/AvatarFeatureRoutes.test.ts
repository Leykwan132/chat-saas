import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(
  new URL('./AvatarFeatureRoutes.tsx', import.meta.url),
  'utf8',
);
const mainSource = readFileSync(new URL('../main.tsx', import.meta.url), 'utf8');

describe('Avatar feature routes', () => {
  it('waits for the tri-state flag before rendering or redirecting', () => {
    expect(routeSource).toContain('avatarFeatureState === undefined');
    expect(routeSource).toContain('useEnableAvatarFeature()');
    expect(routeSource).toContain('isProductFeatureEnabled(avatarFeatureState)');
    expect(routeSource).toContain('Spinner');
  });

  it('redirects disabled dashboard routes to Inbox', () => {
    expect(routeSource).toContain('to={`/dashboard/${agentId}/inbox`}');
    expect(routeSource).toContain('replace');
    expect(routeSource).toContain('<AvatarPage />');
    expect(routeSource).toContain('<AvatarCreatePage />');
  });

  it('renders public embeds without waiting for the Avatar feature flag', () => {
    const embedRouteSource = routeSource.slice(
      routeSource.indexOf('export function AvatarEmbedFeatureRoute'),
    );

    expect(embedRouteSource).not.toContain('useEnableAvatarFeature');
    expect(embedRouteSource).not.toContain('AvatarUnavailableState');
    expect(embedRouteSource).not.toContain('useAuth');
    expect(embedRouteSource).not.toContain('Navigate');
    expect(routeSource).toContain('<AvatarEmbedPage />');
  });

  it('routes public and dashboard Avatar entry points through their dedicated components', () => {
    expect(mainSource).toContain(
      'path="/avatar/embed/:publicKey" element={<AvatarEmbedFeatureRoute />}',
    );
    expect(mainSource).toContain(
      'path="avatar" element={<AvatarOverviewFeatureRoute />}',
    );
    expect(mainSource).toContain(
      'path="avatar/create" element={<AvatarCreateFeatureRoute />}',
    );
    expect(mainSource).not.toContain('element={<AvatarPage />}');
    expect(mainSource).not.toContain('element={<AvatarCreatePage />}');
    expect(mainSource).not.toContain('element={<AvatarEmbedPage />}');
  });
});
