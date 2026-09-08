import { renderToStaticMarkup } from 'react-dom/server';
import type { ComponentProps } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, expect, test, vi } from 'vitest';
import { ConnectInstagramButton } from './ConnectInstagramButton';

const mocks = vi.hoisted(() => ({
  completeSignup: vi.fn(async () => ({})),
  buttonProps: {} as ComponentProps<'button'>,
}));
vi.mock('@/components/ui/button', () => ({
  Button: (props: ComponentProps<'button'>) => {
    mocks.buttonProps = props;
    return <button disabled={props.disabled}>{props.children}</button>;
  },
}));
vi.mock('convex/react', () => ({
  useQuery: () => [],
  useAction: () => mocks.completeSignup,
}));
vi.mock('@/partnerAuth/AppAuthProvider', () => ({
  useAuth: () => ({ user: { email: 'owner@example.com' } }),
}));
vi.mock('@/lib/posthogFeatureFlags', () => ({
  useEnableCommentToInboxFeature: () => false,
  isProductFeatureEnabled: () => false,
  isCommentToInboxUserAllowed: () => false,
}));
vi.mock('@/lib/fbSdk', () => ({
  waitForFacebookSdk: async () => ({
    login: (callback: (response: { authResponse: { code: string } }) => void) => {
      callback({ authResponse: { code: 'signup-code' } });
    },
  }),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

test('submits the viewed agent with Instagram authorization', async () => {
  vi.stubEnv('VITE_IG_CONFIG_ID', 'ig-config');
  renderToStaticMarkup(
    <MemoryRouter initialEntries={['/agents/selected-agent/channels']}>
      <Routes>
        <Route path="/agents/:agentId/channels" element={<ConnectInstagramButton forceAllowConnect />} />
      </Routes>
    </MemoryRouter>,
  );
  (mocks.buttonProps.onClick as () => void)();
  await vi.waitFor(() => expect(mocks.completeSignup).toHaveBeenCalledWith(
    expect.objectContaining({ agentId: 'selected-agent', code: 'signup-code' }),
  ));
});

test('does not offer signup without an agent context', () => {
  const markup = renderToStaticMarkup(<MemoryRouter><ConnectInstagramButton forceAllowConnect /></MemoryRouter>);
  expect(markup).toContain('disabled=""');
});
