export type FBLoginResponse = {
  authResponse?: {
    code?: string;
    expiresIn?: number;
    userID?: string;
  } | null;
  status?: string;
};

declare global {
  interface Window {
    FB?: {
      init: (options: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
        status?: boolean;
        autoLogAppEvents?: boolean;
      }) => void;
      login: (
        callback: (response: FBLoginResponse) => void,
        options: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export function waitForFacebookSdk(
  timeoutMs = 15_000,
): Promise<NonNullable<Window['FB']>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Facebook SDK requires a browser'));
  }
  if (window.FB) return Promise.resolve(window.FB);

  return new Promise((resolve, reject) => {
    const previousInitializer = window.fbAsyncInit;
    const initializer = () => {
      previousInitializer?.();
      clearTimeout(timeout);
      if (!window.FB) {
        reject(new Error('Facebook SDK initialized without an API object'));
        return;
      }
      resolve(window.FB);
    };

    window.fbAsyncInit = initializer;
    const timeout = setTimeout(() => {
      if (window.fbAsyncInit === initializer) {
        window.fbAsyncInit = previousInitializer;
      }
      reject(new Error('Facebook SDK failed to load'));
    }, timeoutMs);
  });
}
