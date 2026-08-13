import { GOOGLE_CALENDAR_EVENTS_SCOPE, GOOGLE_CALENDAR_PROVIDER } from "./constants";
import type { GoogleCalendarActor } from "./googleClient";
import { getWorkOSApiKey } from "../workosClient";

const WORKOS_API_BASE = "https://api.workos.com";

export type GoogleCalendarCredentialResult =
  | ({ kind: "active" } & GoogleCalendarActor)
  | { kind: "not_connected" }
  | { kind: "needs_reauthorization" }
  | { kind: "retryable" };

export async function getGoogleCalendarCredential(
  workosUserId: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<GoogleCalendarCredentialResult> {
  try {
    const response = await fetchImplementation(
      `${WORKOS_API_BASE}/user_management/users/${encodeURIComponent(workosUserId)}/connected_accounts/${GOOGLE_CALENDAR_PROVIDER}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getWorkOSApiKey()}`,
        },
      },
    );
    if (response.status === 404) {
      return { kind: "not_connected" };
    }
    if (!response.ok) {
      return { kind: "retryable" };
    }
    const account = JSON.parse(await response.text()) as {
      state?: unknown;
      scopes?: unknown;
    };
    const scopes = Array.isArray(account.scopes)
      ? account.scopes.filter((scope): scope is string => typeof scope === "string")
      : [];
    if (account.state === "connected" && scopes.includes(GOOGLE_CALENDAR_EVENTS_SCOPE)) {
      return { kind: "active", workosUserId };
    }
    return { kind: "needs_reauthorization" };
  } catch {
    return { kind: "retryable" };
  }
}
