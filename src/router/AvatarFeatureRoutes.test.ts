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

  it('renders unavailable instead of redirecting a disabled public embed', () => {
    expect(routeSource).toContain('<AvatarUnavailableState />');
    expect(routeSource).toContain('<AvatarEmbedPage />');
  });

  it('routes every Avatar entry point through the feature gate', () => {
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
