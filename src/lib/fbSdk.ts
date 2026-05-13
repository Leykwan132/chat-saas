// Shared loader + session hook for the Facebook JS SDK.
//
// The SDK is used by the WhatsApp Embedded Signup flow and the Messenger
// FB Login for Business flow. Both call FB.login with their own config_id
// but otherwise need the same SDK initialised against the same app id.
//
// `useFacebookSession()` exposes the user's current FB login state so
// components can:
//   - tell when the SDK is ready (replacing brittle `!window.FB` checks)
//   - surface a "Facebook session detected" hint when the user is already
//     signed into FB in this browser (`status === 'connected'`)
//   - react to cross-tab logouts via the `auth.statusChange` event
//
// The session is held in a module-level cache so multiple consumers on
// the same page share one `getLoginStatus` round-trip.
import { useEffect, useState } from "react";

export type FBLoginResponse = {
  authResponse?: {
    code?: string;
    accessToken?: string;
    expiresIn?: number;
    signedRequest?: string;
    userID?: string;
  } | null;
  // FB returns one of three known statuses, but we widen to `string` here
  // so future values from Meta don't crash us — normalised in applyResponse.
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
        status?: boolean;
      }) => void;
      login: (
        cb: (response: FBLoginResponse) => void,
        opts: Record<string, unknown>,
      ) => void;
      getLoginStatus: (
        cb: (response: FBLoginResponse) => void,
        forceRefresh?: boolean,
      ) => void;
      Event: {
        subscribe: (
          event: string,
          cb: (response: FBLoginResponse) => void,
        ) => void;
      };
    };
    fbAsyncInit?: () => void;
  }
}

export type FBStatus = "connected" | "not_authorized" | "unknown";

export type FBSession = {
  status: FBStatus;
  userID?: string;
  accessToken?: string;
  // `ready` flips to true once getLoginStatus has returned at least once,
  // i.e. the SDK has finished its initial round-trip to Facebook. Use this
  // (not `window.FB`) to decide when to enable Connect buttons.
  ready: boolean;
};

let cachedSession: FBSession = { status: "unknown", ready: false };
const listeners = new Set<(s: FBSession) => void>();
let initialised = false;

function applyResponse(response: FBLoginResponse) {
  console.log('applyResponse', response);
  const raw = response.status;
  const status: FBStatus =
    raw === "connected" || raw === "not_authorized"
      ? raw
      : "unknown";
  cachedSession = {
    status,
    userID: response.authResponse?.userID,
    accessToken: response.authResponse?.accessToken,
    ready: true,
  };
  for (const fn of listeners) fn(cachedSession);
}

// Idempotent — safe to call from multiple React effects. The first call
// wires up fbAsyncInit + the SDK <script>; subsequent calls are no-ops.
export function ensureFacebookSdkLoaded(opts: {
  appId: string;
  version: string;
}) {
  if (typeof window === "undefined") return;
  if (initialised) return;
  initialised = true;

  window.fbAsyncInit = function () {
    window.FB!.init({
      appId: opts.appId,
      cookie: true,
      xfbml: false,
      version: opts.version,
      // `status: true` makes the SDK itself fire a getLoginStatus on init.
      // We additionally subscribe + call it explicitly so the cache is
      // populated as early as possible for both subscribers and the first
      // hook consumer that mounts.
      status: true,
    });
    window.FB!.Event.subscribe("auth.statusChange", applyResponse);
    window.FB!.getLoginStatus(applyResponse);
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

// Force a fresh getLoginStatus round-trip — useful after a successful
// FB.login so the cache reflects the new session immediately. (The
// auth.statusChange event also fires in that case, so calling this is
// belt-and-braces; safe to invoke anyway.)
export function refreshFacebookLoginStatus() {
  if (!window.FB) return;
  window.FB.getLoginStatus(applyResponse, true);
}

// React hook that ensures the SDK is loaded for the given app + version
// and returns the live FB session. All consumers share one cache.
export function useFacebookSession(opts: {
  appId?: string;
  version?: string;
}): FBSession {
  const [session, setSession] = useState<FBSession>(cachedSession);

  const { appId, version } = opts;
  useEffect(() => {
    if (appId) {
      ensureFacebookSdkLoaded({ appId, version: version ?? "v22.0" });
    }
    listeners.add(setSession);
    // Sync to the current cache in case a previous consumer already
    // populated it before this hook mounted.
    setSession(cachedSession);
    return () => {
      listeners.delete(setSession);
    };
  }, [appId, version]);

  return session;
}
