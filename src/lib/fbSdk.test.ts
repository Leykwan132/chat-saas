import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Facebook SDK loader', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('waits for the SDK without reading the browser login session', async () => {
    let sessionReadCount = 0;
    const facebookSdk = {
      init: () => undefined,
      login: () => undefined,
      getLoginStatus: () => {
        sessionReadCount += 1;
      },
      Event: {
        subscribe: () => {
          sessionReadCount += 1;
        },
      },
    };
    vi.stubGlobal('window', { FB: facebookSdk });

    const { waitForFacebookSdk } = await import('./fbSdk');
    const resolvedSdk = await waitForFacebookSdk(50);

    expect(resolvedSdk).toBe(facebookSdk);
    expect(sessionReadCount).toBe(0);
  });
});
