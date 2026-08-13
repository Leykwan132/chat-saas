import { GOOGLE_CALENDAR_EVENTS_SCOPE, GOOGLE_CALENDAR_PROVIDER } from "./constants";
import type { GoogleCalendarActor } from "./googleClient";
import { getWorkOSApiKey } from "../workosClient";

const WORKOS_API_BASE = "https://api.workos.com";
const MISSING_ACCOUNT_RETRY_DELAYS_MS = [1000, 2000, 4000];

export type GoogleCalendarCredentialResult = (
  | ({ kind: "active" } & GoogleCalendarActor)
  | { kind: "not_connected" }
  | { kind: "needs_reauthorization" }
  | { kind: "retryable" }
) & {
  workosHttpStatus?: number;
  workosConnectedAccount?: unknown;
};

export type GoogleCalendarCredentialOptions = {
  retryMissing?: boolean;
  retryDelaysMs?: number[];
};

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function connectedAccountScopes(scopes: unknown): string[] {
  if (!Array.isArray(scopes)) return [];
  return scopes.flatMap((item) => {
    if (typeof item === "string") return [item];
    if (
      item !== null &&
      typeof item === "object" &&
      "scope" in item &&
      typeof item.scope === "string"
    ) {
      return [item.scope];
    }
    return [];
  });
}

function hasGoogleCalendarScope(scopes: string[]): boolean {
  return scopes.some(
    (scope) =>
      scope === GOOGLE_CALENDAR_EVENTS_SCOPE ||
      scope === "https://www.googleapis.com/auth/calendar" ||
      scope.endsWith("/auth/calendar.events") ||
      scope.endsWith("/auth/calendar"),
  );
}

export function classifyWorkosConnectedAccount(
  workosUserId: string,
  account: { state?: unknown; scopes?: unknown },
): GoogleCalendarCredentialResult {
  const scopes = connectedAccountScopes(account.scopes);
  if (account.state === "connected") {
    if (scopes.length > 0 && !hasGoogleCalendarScope(scopes)) {
      return { kind: "needs_reauthorization" };
    }
    return { kind: "active", workosUserId };
  }
  return { kind: "needs_reauthorization" };
}

async function readWorkosBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function fetchGoogleCalendarCredential(
  workosUserId: string,
  fetchImplementation: typeof fetch,
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
    const body = await readWorkosBody(response);
    console.log("[google-calendar] WorkOS connected-account GET", {
      status: response.status,
      workosUserId,
      body,
    });
    if (response.status === 404) {
      return { kind: "not_connected", workosHttpStatus: response.status, workosConnectedAccount: body };
    }
    if (!response.ok) {
      return { kind: "retryable", workosHttpStatus: response.status, workosConnectedAccount: body };
    }
    const account = body as { state?: unknown; scopes?: unknown };
    return {
      ...classifyWorkosConnectedAccount(workosUserId, account),
      workosHttpStatus: response.status,
      workosConnectedAccount: body,
    };
  } catch (error) {
    console.log("[google-calendar] WorkOS connected-account GET failed", error);
    return { kind: "retryable" };
  }
}

export async function getGoogleCalendarCredential(
  workosUserId: string,
  fetchImplementation: typeof fetch = fetch,
  options: GoogleCalendarCredentialOptions = {},
): Promise<GoogleCalendarCredentialResult> {
  let result = await fetchGoogleCalendarCredential(workosUserId, fetchImplementation);
  if (!options.retryMissing) return result;
  for (const waitMs of options.retryDelaysMs ?? MISSING_ACCOUNT_RETRY_DELAYS_MS) {
    if (result.kind !== "not_connected" && result.kind !== "retryable") return result;
    await delay(waitMs);
    result = await fetchGoogleCalendarCredential(workosUserId, fetchImplementation);
  }
  return result;
}
