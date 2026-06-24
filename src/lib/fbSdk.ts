// Shared loader + session hook for the Facebook JS SDK.
//
// The SDK script is loaded from index.html. This module attaches session
// listeners and exposes helpers for WhatsApp / Messenger connect flows.
import { useEffect, useState } from "react";

export const DEFAULT_FB_SDK_VERSION = "v25.0";

export type FBLoginResponse = {
  authResponse?: {
    code?: string;
    accessToken?: string;
    expiresIn?: number;
    signedRequest?: string;
    userID?: string;
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
        status?: boolean;
        autoLogAppEvents?: boolean;
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
  ready: boolean;
};

let cachedSession: FBSession = { status: "unknown", ready: false };
const listeners = new Set<(s: FBSession) => void>();
let initialised = false;
let sessionListenersAttached = false;
const sdkWaiters = new Set<(fb: NonNullable<Window["FB"]>) => void>();

function notifyListeners() {
  for (const fn of listeners) fn(cachedSession);
}

function notifySdkWaiters() {
  if (!window.FB) return;
  for (const fn of sdkWaiters) fn(window.FB);
  sdkWaiters.clear();
}

function markSdkReadyForLogin() {
  if (cachedSession.ready) return;
  cachedSession = { ...cachedSession, ready: true };
  notifyListeners();
  notifySdkWaiters();
}

function applyResponse(response: FBLoginResponse) {
  const raw = response.status;
  const status: FBStatus =
    raw === "connected" || raw === "not_authorized" ? raw : "unknown";
  cachedSession = {
    status,
    userID: response.authResponse?.userID,
    accessToken: response.authResponse?.accessToken,
    ready: true,
  };
  notifyListeners();
}

function attachSessionListeners() {
  if (!window.FB || sessionListenersAttached) return;
  sessionListenersAttached = true;
  window.FB.Event.subscribe("auth.statusChange", applyResponse);
  markSdkReadyForLogin();
  window.FB.getLoginStatus(applyResponse);
}

function waitForFbObject(onReady: () => void) {
  if (window.FB) {
    onReady();
    return;
  }

  const previousInit = window.fbAsyncInit;
  window.fbAsyncInit = function () {
    previousInit?.();
    onReady();
  };

  const poll = setInterval(() => {
    if (window.FB) {
      clearInterval(poll);
      onReady();
    }
  }, 50);
}

// Idempotent — index.html loads sdk.js; this wires up session listeners.
export function ensureFacebookSdkLoaded(_opts?: {
  appId?: string;
  version?: string;
}) {
  if (typeof window === "undefined") return;
  if (initialised) {
    attachSessionListeners();
    return;
  }
  initialised = true;

  waitForFbObject(attachSessionListeners);
}

/** Resolves once window.FB is available (loaded from index.html). */
export function waitForFacebookSdk(
  timeoutMs = 15_000,
): Promise<NonNullable<Window["FB"]>> {
  ensureFacebookSdkLoaded();
  if (window.FB && sessionListenersAttached) {
    return Promise.resolve(window.FB);
  }

  return new Promise((resolve, reject) => {
    const onReady = (fb: NonNullable<Window["FB"]>) => {
      clearTimeout(timer);
      clearInterval(poll);
      resolve(fb);
    };

    sdkWaiters.add(onReady);

    const poll = setInterval(() => {
      attachSessionListeners();
      if (window.FB && sessionListenersAttached) {
        sdkWaiters.delete(onReady);
        clearTimeout(timer);
        clearInterval(poll);
        resolve(window.FB);
      }
    }, 100);

    const timer = setTimeout(() => {
      sdkWaiters.delete(onReady);
      clearInterval(poll);
      reject(new Error("Facebook SDK failed to load"));
    }, timeoutMs);
  });
}

export function refreshFacebookLoginStatus() {
  console.log('refreshFacebookLoginStatus', window.FB);
  if (!window.FB) return;
  console.log('refreshFacebookLoginStatus', window.FB);
  window.FB.getLoginStatus(applyResponse, true);
}

export function useFacebookSession(_opts?: {
  appId?: string;
  version?: string;
}): FBSession {
  const [session, setSession] = useState<FBSession>(cachedSession);

  useEffect(() => {
    ensureFacebookSdkLoaded();
    listeners.add(setSession);
    setSession(cachedSession);
    return () => {
      listeners.delete(setSession);
    };
  }, []);

  return session;
}
