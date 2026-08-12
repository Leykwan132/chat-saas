import { GOOGLE_CALENDAR_EVENTS_SCOPE, GOOGLE_CALENDAR_PROVIDER } from "./constants";
import { createWorkOSClient } from "../workosClient";

export type GoogleCalendarCredential = {
  token: string;
  expiresAt: string | null;
};

export type GoogleCalendarCredentialResult =
  | ({ kind: "active" } & GoogleCalendarCredential)
  | { kind: "not_connected" }
  | { kind: "needs_reauthorization" }
  | { kind: "retryable" };

type NormalizedGoogleCalendarCredential = GoogleCalendarCredential & {
  scopes: string[];
};

function normalizeCredential(accessToken: {
  accessToken: string;
  expiresAt: Date | null;
  scopes: string[];
}): NormalizedGoogleCalendarCredential {
  return {
    token: accessToken.accessToken,
    expiresAt: accessToken.expiresAt?.toISOString() ?? null,
    scopes: accessToken.scopes,
  };
}

export async function getGoogleCalendarCredential(
  workosUserId: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<GoogleCalendarCredentialResult> {
  const workos = createWorkOSClient(fetchImplementation);
  try {
    const result = await workos.pipes.getAccessToken({
      provider: GOOGLE_CALENDAR_PROVIDER,
      userId: workosUserId,
    });
    if (!result.active) {
      return {
        kind:
          result.error === "not_installed"
            ? "not_connected"
            : "needs_reauthorization",
      };
    }
    const credential = normalizeCredential(result.accessToken);
    if (!credential.scopes.includes(GOOGLE_CALENDAR_EVENTS_SCOPE)) {
      return { kind: "needs_reauthorization" };
    }
    return {
      kind: "active",
      token: credential.token,
      expiresAt: credential.expiresAt,
    };
  } catch {
    return { kind: "retryable" };
  }
}
