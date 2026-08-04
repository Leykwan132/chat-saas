import { expect, test, vi } from 'vitest';
import { useWhatsAppConnectionFlow } from './useWhatsAppConnectionFlow';

const mocks = vi.hoisted(() => ({
  beginConnectionAttempt: vi.fn(async () => 'attempt-1'),
  cancelConnectionAttempt: vi.fn(async () => undefined),
  waitForFacebookSdk: vi.fn(),
}));

let loginCallback: ((response: { status?: string }) => void) | undefined;

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useCallback: <T,>(callback: T) => callback,
    useEffect: () => undefined,
    useMemo: <T,>(factory: () => T) => factory(),
    useRef: <T,>(value: T) => ({ current: value }),
    useState: <T,>(value: T) => [value, vi.fn()] as const,
  };
});

vi.mock('convex/react', () => ({
  useAction: () => vi.fn(),
  useMutation: vi
    .fn()
    .mockReturnValueOnce(mocks.beginConnectionAttempt)
    .mockReturnValueOnce(mocks.cancelConnectionAttempt),
  useQuery: vi.fn().mockReturnValueOnce(null).mockReturnValueOnce([]),
}));

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}));

vi.mock('@posthog/react', () => ({ usePostHog: () => undefined }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), message: vi.fn() } }));
vi.mock('@/lib/fbSdk', () => ({ waitForFacebookSdk: mocks.waitForFacebookSdk }));
vi.mock('@/lib/whatsappSignupCompletion', () => ({
  completeWhatsAppSignupFromCode: vi.fn(),
}));
vi.mock('./useWhatsAppEmbeddedSignupEvents', () => ({
  useWhatsAppEmbeddedSignupEvents: () => undefined,
}));

test('cancels the started attempt when Meta returns an unknown response without a code', async () => {
  mocks.waitForFacebookSdk.mockResolvedValue({
    login: (callback: typeof loginCallback) => {
      loginCallback = callback;
    },
  });

  const { launchSignup } = useWhatsAppConnectionFlow({});

  await launchSignup();
  await vi.waitFor(() => expect(loginCallback).toBeTypeOf('function'));
  loginCallback?.({ status: 'unknown' });
  await Promise.resolve();
  await Promise.resolve();

  expect(mocks.cancelConnectionAttempt).toHaveBeenCalledWith({ attemptId: 'attempt-1' });
});
