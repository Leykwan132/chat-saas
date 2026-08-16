import { GOOGLE_CALENDAR_PROVIDER } from "./constants";
import { getWorkOSApiKey } from "../workosClient";

const WORKOS_API_BASE = "https://api.workos.com";
const WORKOS_AUTHORIZE_URL_PREFIX = `${WORKOS_API_BASE}/data-integrations/`;

export async function createUserScopedGoogleCalendarAuthorizeUrl(
  workosUserId: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchImplementation(
    `${WORKOS_AUTHORIZE_URL_PREFIX}${GOOGLE_CALENDAR_PROVIDER}/authorize`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getWorkOSApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: workosUserId }),
    },
  );
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text.slice(0, 200) || `WorkOS authorize URL failed (${response.status})`);
  }
  const payload = JSON.parse(text) as { url?: unknown };
  if (typeof payload.url !== "string" || payload.url.length === 0) {
    throw new Error("WorkOS authorize URL response was empty.");
  }
  if (!payload.url.startsWith(WORKOS_AUTHORIZE_URL_PREFIX)) {
    throw new Error("WorkOS authorize URL was invalid.");
  }
  return payload.url;
}

export type GoogleCalendarAccessTokenResult =
  | { kind: "active"; accessToken: string }
  | { kind: "not_connected" }
  | { kind: "needs_reauthorization" }
  | { kind: "retryable" }
  | { kind: "failed" };

export async function vendGoogleCalendarAccessToken(
  workosUserId: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<GoogleCalendarAccessTokenResult> {
  try {
    const response = await fetchImplementation(
      `${WORKOS_AUTHORIZE_URL_PREFIX}${GOOGLE_CALENDAR_PROVIDER}/token`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getWorkOSApiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: workosUserId }),
      },
    );
    const text = await response.text();
    if (!response.ok) {
      return { kind: response.status >= 500 ? "retryable" : "failed" };
    }
    const payload = JSON.parse(text) as {
      active?: unknown;
      error?: unknown;
      access_token?: { access_token?: unknown };
    };
    if (payload.active === false) {
      return payload.error === "not_installed" ? { kind: "not_connected" } : { kind: "needs_reauthorization" };
    }
    const accessToken = payload.access_token?.access_token;
    if (typeof accessToken !== "string" || accessToken.length === 0) {
      return { kind: "failed" };
    }
    return { kind: "active", accessToken };
  } catch {
    return { kind: "retryable" };
  }
}

export async function deleteWorkosGoogleCalendarAccount(
  workosUserId: string,
  fetchImplementation: typeof fetch = fetch,
) {
  const response = await fetchImplementation(
    `${WORKOS_API_BASE}/user_management/users/${encodeURIComponent(workosUserId)}/connected_accounts/${GOOGLE_CALENDAR_PROVIDER}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getWorkOSApiKey()}`,
      },
    },
  );
  if (response.ok || response.status === 404) return;
  const text = await response.text();
  throw new Error(text.slice(0, 200) || `WorkOS disconnect failed (${response.status})`);
}
