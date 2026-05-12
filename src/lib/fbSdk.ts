// Shared loader for the Facebook JS SDK. Used by the WhatsApp Embedded
// Signup flow and the Messenger FB Login for Business flow — both call
// FB.login with different config_ids but otherwise need the same SDK and
// app id to be initialised.

export type FBLoginResponse = {
  authResponse?: {
    code?: string;
    accessToken?: string;
  } | null;
  status?: string;
};

declare global {
  interface Window {
    FB?: {
      init: (opts: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        cb: (response: FBLoginResponse) => void,
        opts: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

// Idempotent — safe to call from multiple React effects. The SDK script
// loads itself once via the `facebook-jssdk` id guard; subsequent calls
// just update the queued init in case `appId`/`version` changed.
export function ensureFacebookSdkLoaded(opts: {
  appId: string;
  version: string;
}) {
  if (typeof window === "undefined") return;
  if (window.FB) return;

  window.fbAsyncInit = function () {
    window.FB!.init({
      appId: opts.appId,
      cookie: true,
      xfbml: false,
      version: opts.version,
    });
  };

  if (document.getElementById("facebook-jssdk")) return;

  const script = document.createElement("script");
  script.id = "facebook-jssdk";
  script.src = "https://connect.facebook.net/en_US/sdk.js";
  script.async = true;
  script.defer = true;
  script.crossOrigin = "anonymous";
  document.body.appendChild(script);
}
