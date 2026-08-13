import { getWorkOSApiKey } from "../workosClient";
import { GOOGLE_CALENDAR_PROVIDER, WORKOS_RELAY_URL } from "./constants";

const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3/";
const GOOGLE_CALENDAR_API_ORIGIN = new URL(GOOGLE_CALENDAR_API_BASE).origin;

export type GoogleCalendarActor = {
  workosUserId: string;
};

export type GoogleCalendarRequest = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  ifMatch?: string;
  invalidSyncTokenOnGone?: boolean;
};

export type GoogleCalendarProviderErrorKind =
  | "needs_reauthorization"
  | "invalid_sync_token"
  | "conflict"
  | "retryable"
  | "not_found"
  | "forbidden"
  | "invalid_request"
  | "failed";

const providerMessages: Record<GoogleCalendarProviderErrorKind, string> = {
  needs_reauthorization: "Google Calendar needs to be reconnected.",
  invalid_sync_token: "Google Calendar synchronization must be restarted.",
  conflict: "Google Calendar changed before this update could be applied.",
  retryable: "Google Calendar is temporarily unavailable.",
  not_found: "Google Calendar could not find the requested event.",
  forbidden: "Google Calendar denied this request.",
  invalid_request: "Google Calendar could not process this request.",
  failed: "Google Calendar request failed.",
};

export class GoogleCalendarProviderError extends Error {
  readonly kind: GoogleCalendarProviderErrorKind;

  constructor(kind: GoogleCalendarProviderErrorKind, message = providerMessages[kind]) {
    super(message);
    this.name = "GoogleCalendarProviderError";
    this.kind = kind;
  }
}

function errorKindForStatus(
  status: number,
  invalidSyncTokenOnGone: boolean,
): GoogleCalendarProviderErrorKind {
  if (status === 401 || status === 402) {
    return "needs_reauthorization";
  }
  if (status === 412 || status === 409) {
    return "conflict";
  }
  if (status === 410) {
    return invalidSyncTokenOnGone ? "invalid_sync_token" : "not_found";
  }
  if (status === 429 || status >= 500) {
    return "retryable";
  }
  if (status === 404) {
    return "not_found";
  }
  if (status === 403) {
    return "forbidden";
  }
  if (status >= 400 && status < 500) {
    return "invalid_request";
  }
  return "failed";
}

function failedResponseKind(
  response: Response,
  invalidSyncTokenOnGone: boolean,
): GoogleCalendarProviderErrorKind {
  const upstream = response.headers.get("X-Relay-Upstream-Status");
  if (upstream !== null) {
    const status = Number(upstream);
    if (Number.isFinite(status)) {
      return errorKindForStatus(status, invalidSyncTokenOnGone);
    }
  }
  if (response.status === 402) return "needs_reauthorization";
  if (response.status === 404 || response.status === 401) return "failed";
  return errorKindForStatus(response.status, invalidSyncTokenOnGone);
}

function googleCalendarUrl(path: string): URL {
  const relativePath = path.trim();
  if (
    relativePath.startsWith("//") ||
    relativePath.startsWith("\\") ||
    /^[a-z][a-z\d+.-]*:/i.test(relativePath)
  ) {
    throw new GoogleCalendarProviderError("invalid_request");
  }
  const url = new URL(relativePath.replace(/^\/+/, ""), GOOGLE_CALENDAR_API_BASE);
  if (
    url.origin !== GOOGLE_CALENDAR_API_ORIGIN ||
    !url.pathname.startsWith("/calendar/v3/")
  ) {
    throw new GoogleCalendarProviderError("invalid_request");
  }
  return url;
}

function relayRequestUrl(googleUrl: URL): string {
  return `${WORKOS_RELAY_URL}/${GOOGLE_CALENDAR_PROVIDER}${googleUrl.pathname}${googleUrl.search}`;
}

function peekRelayCode(body: string): string | undefined {
  try {
    const payload = JSON.parse(body) as { code?: unknown };
    return typeof payload.code === "string" ? payload.code : undefined;
  } catch {
    return undefined;
  }
}

function requestBody(request: GoogleCalendarRequest): string | undefined {
  if (request.body === undefined) {
    return undefined;
  }
  try {
    return JSON.stringify(request.body);
  } catch {
    throw new GoogleCalendarProviderError("invalid_request");
  }
}

export async function googleCalendarRequest<T>(
  actor: GoogleCalendarActor,
  request: GoogleCalendarRequest,
  fetchImplementation: typeof fetch = fetch,
): Promise<T> {
  const workosUserId = actor.workosUserId.trim();
  if (workosUserId.length === 0) {
    throw new GoogleCalendarProviderError("invalid_request");
  }
  const googleUrl = googleCalendarUrl(request.path);
  const body = requestBody(request);
  const headers = new Headers({
    Authorization: `Bearer ${getWorkOSApiKey()}`,
    "X-Relay-User": workosUserId,
  });
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (request.ifMatch !== undefined) {
    headers.set("If-Match", request.ifMatch);
  }
  let response: Response;
  try {
    response = await fetchImplementation(relayRequestUrl(googleUrl), {
      method: request.method,
      headers,
      body,
    });
  } catch {
    throw new GoogleCalendarProviderError("retryable");
  }
  const responseBody = await response.text();
  console.log("[google-calendar] WorkOS relay", {
    status: response.status,
    upstreamStatus: response.headers.get("X-Relay-Upstream-Status"),
    code: peekRelayCode(responseBody),
  });
  if (!response.ok) {
    throw new GoogleCalendarProviderError(
      failedResponseKind(response, request.invalidSyncTokenOnGone === true),
    );
  }
  if (responseBody.length === 0) {
    return undefined as T;
  }
  try {
    return JSON.parse(responseBody) as T;
  } catch {
    throw new GoogleCalendarProviderError(
      "failed",
      "Google Calendar returned an invalid response.",
    );
  }
}
