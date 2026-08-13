import { afterAll, expect, test } from "vitest";
import { createUserScopedPipesWidgetToken } from "./googleCalendar/connectionWorkos";
import {
  getGoogleCalendarCredential,
  type GoogleCalendarCredentialResult,
} from "./googleCalendar/workosToken";
import {
  GoogleCalendarProviderError,
  googleCalendarRequest,
} from "./googleCalendar/googleClient";

const workosAccessToken = {
  active: true,
  access_token: {
    object: "access_token",
    access_token: "token",
    expires_at: "2026-08-14T00:00:00.000Z",
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
    missing_scopes: [],
  },
};

const originalWorkOSApiKey = process.env.WORKOS_API_KEY;
process.env.WORKOS_API_KEY = "sk_test_google_calendar";

afterAll(() => {
  if (originalWorkOSApiKey === undefined) {
    delete process.env.WORKOS_API_KEY;
    return;
  }
  process.env.WORKOS_API_KEY = originalWorkOSApiKey;
});

function responseJson(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function workosFetchReturning(payload: unknown): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, init);
    if (
      request.method !== "POST" ||
      request.url !== "https://api.workos.com/data-integrations/google_calendar/token" ||
      JSON.stringify(await request.json()) !== '{"user_id":"user_123"}'
    ) {
      return responseJson({ error: "unexpected_request" }, 400);
    }
    return responseJson(payload);
  };
}

function activeCredentialWithoutRequiredScope() {
  return {
    ...workosAccessToken,
    access_token: {
      ...workosAccessToken.access_token,
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    },
  };
}

function credentialFromPayload(payload: unknown): Promise<GoogleCalendarCredentialResult> {
  return getGoogleCalendarCredential("user_123", workosFetchReturning(payload));
}

test("returns an active Google token only when the events scope is present", async () => {
  const result = await getGoogleCalendarCredential(
    "user_123",
    workosFetchReturning(workosAccessToken),
  );

  expect(result).toEqual({
    kind: "active",
    token: "token",
    expiresAt: "2026-08-14T00:00:00.000Z",
  });
});

test.each([
  [{ active: false, error: "not_installed" }, "not_connected"],
  [{ active: false, error: "needs_reauthorization" }, "needs_reauthorization"],
  [activeCredentialWithoutRequiredScope(), "needs_reauthorization"],
])("classifies WorkOS credential state", async (payload, expectedKind) => {
  expect((await credentialFromPayload(payload)).kind).toBe(expectedKind);
});

test("sends the Google authorization header and conditional match header", async () => {
  let receivedRequest: Request | undefined;
  const fetchImplementation: typeof fetch = async (input, init) => {
    receivedRequest = new Request(input, init);
    return responseJson({ id: "event_123" });
  };

  const result = await googleCalendarRequest<{ id: string }>(
    { token: "token" },
    {
      method: "PUT",
      path: "/calendars/primary/events/event_123",
      body: { summary: "Updated meeting" },
      ifMatch: '"etag_123"',
    },
    fetchImplementation,
  );

  expect(result).toEqual({ id: "event_123" });
  expect(receivedRequest?.headers.get("Authorization")).toBe("Bearer token");
  expect(receivedRequest?.headers.get("If-Match")).toBe('"etag_123"');
  expect(receivedRequest?.headers.get("Content-Type")).toBe("application/json");
  expect(await receivedRequest?.text()).toBe('{"summary":"Updated meeting"}');
});

test.each(["https://attacker.example/events", "//attacker.example/events"])(
  "rejects the cross-origin path %s before attaching a Google token",
  async (path) => {
    let fetchInvoked = false;

    await expect(
      googleCalendarRequest(
        { token: "token" },
        { method: "GET", path },
        async () => {
          fetchInvoked = true;
          return responseJson({});
        },
      ),
    ).rejects.toMatchObject({ kind: "invalid_request" });

    expect(fetchInvoked).toBe(false);
  },
);

test("returns undefined for an empty successful Google response", async () => {
  const result = await googleCalendarRequest<undefined>(
    { token: "token" },
    {
      method: "DELETE",
      path: "/calendars/primary/events/event_123",
    },
    async () => new Response(null, { status: 204 }),
  );

  expect(result).toBeUndefined();
});

test("rejects malformed successful Google JSON without exposing the response body", async () => {
  await expect(
    googleCalendarRequest(
      { token: "token" },
      { method: "GET", path: "/calendars/primary/events" },
      async () => new Response("provider diagnostic", { status: 200 }),
    ),
  ).rejects.toEqual(
    expect.objectContaining({
      kind: "failed",
      message: "Google Calendar returned an invalid response.",
    }),
  );
});

test.each([
  [401, "needs_reauthorization"],
  [412, "conflict"],
  [429, "retryable"],
  [500, "retryable"],
])("classifies Google response %i", async (status, expectedKind) => {
  await expect(
    googleCalendarRequest(
      { token: "token" },
      { method: "GET", path: "/calendars/primary/events" },
      async () => new Response("provider diagnostic", { status }),
    ),
  ).rejects.toMatchObject({ kind: expectedKind });
});

test("classifies network failures as retryable without exposing the error", async () => {
  await expect(
    googleCalendarRequest(
      { token: "token" },
      { method: "POST", path: "/calendars/primary/events", body: { summary: "Meeting" } },
      async () => {
        throw new Error("provider diagnostic");
      },
    ),
  ).rejects.toEqual(
    expect.objectContaining({
      kind: "retryable",
      message: "Google Calendar is temporarily unavailable.",
    }),
  );
});

test("exposes the classified error type", () => {
  expect(new GoogleCalendarProviderError("conflict")).toBeInstanceOf(Error);
});

test("mints a Pipes widget token with user_id only", async () => {
  let receivedRequest: Request | undefined;
  const token = await createUserScopedPipesWidgetToken("user_123", async (input, init) => {
    receivedRequest = new Request(input, init);
    return responseJson({ token: "widget_token" });
  });

  expect(token).toBe("widget_token");
  expect(receivedRequest?.method).toBe("POST");
  expect(receivedRequest?.url).toBe("https://api.workos.com/widgets/token");
  expect(await receivedRequest?.json()).toEqual({ user_id: "user_123" });
});
