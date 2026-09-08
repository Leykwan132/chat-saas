import { renderToStaticMarkup } from 'react-dom/server';
import type { ComponentProps } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, expect, test, vi } from 'vitest';
import { ConnectInstagramButton } from './ConnectInstagramButton';

const mocks = vi.hoisted(() => ({
  startInstagramLogin: vi.fn(async () => ({ authorizeUrl: 'https://www.instagram.com/oauth/authorize' })),
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
  useAction: () => mocks.startInstagramLogin,
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

test('starts Instagram Login for the viewed agent', async () => {
  const assign = vi.fn();
  vi.stubGlobal('window', { location: { assign, pathname: '/agents/selected-agent/channels', search: '' } });
  renderToStaticMarkup(
    <MemoryRouter initialEntries={['/agents/selected-agent/channels']}>
      <Routes>
        <Route path="/agents/:agentId/channels" element={<ConnectInstagramButton forceAllowConnect />} />
      </Routes>
    </MemoryRouter>,
  );
  (mocks.buttonProps.onClick as () => void)();
  await vi.waitFor(() => expect(mocks.startInstagramLogin).toHaveBeenCalledWith({
    agentId: 'selected-agent',
    returnPath: '/agents/selected-agent/channels',
  }));
  await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('https://www.instagram.com/oauth/authorize'));
});

test('does not offer signup without an agent context', () => {
  const markup = renderToStaticMarkup(<MemoryRouter><ConnectInstagramButton forceAllowConnect /></MemoryRouter>);
  expect(markup).toContain('disabled=""');
});
