import { googleCalendarRequest } from "./googleClient";
import { getGoogleCalendarCredential } from "./workosToken";

export type GoogleCalendarWatchCredential = { token: string };

export function googleCalendarWebhookAddress() {
  const siteUrl = process.env.CONVEX_SITE_URL;
  if (siteUrl === undefined) throw new Error("CONVEX_SITE_URL is not configured");
  const base = new URL(siteUrl);
  if (base.protocol !== "https:" || base.username !== "" || base.password !== "") {
    throw new Error("CONVEX_SITE_URL must be a public HTTPS origin");
  }
  return new URL("/webhook/google-calendar", base.origin).toString();
}

export async function activeGoogleCalendarCredential(workosUserId: string) {
  const credential = await getGoogleCalendarCredential(workosUserId);
  if (credential.kind !== "active") {
    throw new Error(`Google Calendar credential unavailable: ${credential.kind}`);
  }
  return credential;
}

function isNotFound(error: unknown) {
  return typeof error === "object" && error !== null && "kind" in error && error.kind === "not_found";
}

export async function stopExternalGoogleCalendarWatch(
  credential: GoogleCalendarWatchCredential,
  channelId: string,
  resourceId: string,
) {
  try {
    await googleCalendarRequest(credential, {
      method: "POST",
      path: "channels/stop",
      body: { id: channelId, resourceId },
    });
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}

export function validatedGoogleCalendarWatchResponse(
  value: unknown,
  channelId: string,
  now: number,
) {
  if (typeof value !== "object" || value === null) {
    throw new Error("Google Calendar returned an invalid watch response");
  }
  const response = value as Record<string, unknown>;
  const expirationAt = typeof response.expiration === "string"
    ? Number(response.expiration)
    : Number.NaN;
  if (
    response.id !== channelId ||
    typeof response.resourceId !== "string" || response.resourceId.length === 0 ||
    typeof response.resourceUri !== "string" || response.resourceUri.length === 0 ||
    !Number.isSafeInteger(expirationAt) || expirationAt <= now
  ) {
    throw new Error("Google Calendar returned an invalid watch response");
  }
  return {
    resourceId: response.resourceId,
    resourceUri: response.resourceUri,
    expirationAt,
  };
}
