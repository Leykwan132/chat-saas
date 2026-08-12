const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3/";
const GOOGLE_CALENDAR_API_ORIGIN = new URL(GOOGLE_CALENDAR_API_BASE).origin;

export type GoogleCalendarRequest = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  ifMatch?: string;
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

function errorKindForStatus(status: number): GoogleCalendarProviderErrorKind {
  if (status === 401) {
    return "needs_reauthorization";
  }
  if (status === 412) {
    return "conflict";
  }
  if (status === 410) {
    return "invalid_sync_token";
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

function requestUrl(path: string): string {
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
  return url.toString();
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
  credential: Pick<{ token: string }, "token">,
  request: GoogleCalendarRequest,
  fetchImplementation: typeof fetch = fetch,
): Promise<T> {
  const url = requestUrl(request.path);
  const body = requestBody(request);
  const headers = new Headers({ Authorization: `Bearer ${credential.token}` });
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (request.ifMatch !== undefined) {
    headers.set("If-Match", request.ifMatch);
  }
  let response: Response;
  try {
    response = await fetchImplementation(url, {
      method: request.method,
      headers,
      body,
    });
  } catch {
    throw new GoogleCalendarProviderError("retryable");
  }
  if (!response.ok) {
    throw new GoogleCalendarProviderError(errorKindForStatus(response.status));
  }
  const responseBody = await response.text();
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
