import { afterAll, expect, test } from "vitest";
import { createUserScopedGoogleCalendarAuthorizeUrl } from "./googleCalendar/connectionWorkos";
import {
  getGoogleCalendarCredential,
} from "./googleCalendar/workosToken";
import {
  GoogleCalendarProviderError,
  googleCalendarRequest,
} from "./googleCalendar/googleClient";
import { WORKOS_RELAY_URL } from "./googleCalendar/constants";

const originalWorkOSApiKey = process.env.WORKOS_API_KEY;
process.env.WORKOS_API_KEY = "sk_test_google_calendar";
const actor = { workosUserId: "user_123" };

afterAll(() => {
  if (originalWorkOSApiKey === undefined) {
    delete process.env.WORKOS_API_KEY;
    return;
  }
  process.env.WORKOS_API_KEY = originalWorkOSApiKey;
});

function responseJson(payload: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function withUpstream(status: number, body: BodyInit | null = "provider diagnostic") {
  return new Response(body, {
    status,
    headers: { "X-Relay-Upstream-Status": String(status) },
  });
}

function workosFetchReturning(payload: unknown, status = 200): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, init);
    if (
      request.method !== "GET" ||
      request.url !== "https://api.workos.com/user_management/users/user_123/connected_accounts/google-calendar"
    ) {
      return responseJson({ error: "unexpected_request" }, 400);
    }
    return responseJson(payload, status);
  };
}

function connectedAccount(scopes = ["https://www.googleapis.com/auth/calendar.events"]) {
  return {
    object: "connected_account",
    state: "connected",
    scopes,
  };
}

test("treats a connected account with the events scope as active", async () => {
  const result = await getGoogleCalendarCredential(
    "user_123",
    workosFetchReturning(connectedAccount()),
  );

  expect(result).toMatchObject({
    kind: "active",
    workosUserId: "user_123",
  });
  expect(result.workosHttpStatus).toBe(200);
  expect(result.workosConnectedAccount).toEqual(connectedAccount());
});

test("treats a connected account with the full calendar scope as active", async () => {
  const result = await getGoogleCalendarCredential(
    "user_123",
    workosFetchReturning(connectedAccount(["https://www.googleapis.com/auth/calendar"])),
  );
  expect(result.kind).toBe("active");
});

test("treats a connected account with empty scopes as active", async () => {
  const result = await getGoogleCalendarCredential(
    "user_123",
    workosFetchReturning(connectedAccount([])),
  );
  expect(result.kind).toBe("active");
});

test("retries a missing connected account until WorkOS returns it", async () => {
  let calls = 0;
  const fetchImplementation: typeof fetch = async (input, init) => {
    calls += 1;
    const request = new Request(input, init);
    if (
      request.method !== "GET" ||
      request.url !== "https://api.workos.com/user_management/users/user_123/connected_accounts/google-calendar"
    ) {
      return responseJson({ error: "unexpected_request" }, 400);
    }
    if (calls < 3) return responseJson({ error: "missing" }, 404);
    return responseJson(connectedAccount());
  };

  const result = await getGoogleCalendarCredential("user_123", fetchImplementation, {
    retryMissing: true,
    retryDelaysMs: [0, 0, 0],
  });

  expect(result.kind).toBe("active");
  expect(calls).toBe(3);
});

test.each([
  [404, "not_connected"],
  [connectedAccount(["https://www.googleapis.com/auth/calendar.readonly"]), "needs_reauthorization"],
  [{ object: "connected_account", state: "needs_reauthorization", scopes: [] }, "needs_reauthorization"],
])("classifies WorkOS connected-account state", async (payloadOrStatus, expectedKind) => {
  const fetchImplementation = typeof payloadOrStatus === "number"
    ? workosFetchReturning({ error: "missing" }, payloadOrStatus)
    : workosFetchReturning(payloadOrStatus);
  expect((await getGoogleCalendarCredential("user_123", fetchImplementation)).kind).toBe(expectedKind);
});

test("calls Google Calendar through WorkOS Relay with no organization", async () => {
  const received: Request[] = [];
  const fetchImplementation: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    received.push(request);
    return responseJson({ id: "event_123" }, 200, { "X-Relay-Upstream-Status": "200" });
  };

  const result = await googleCalendarRequest<{ id: string }>(
    actor,
    {
      method: "PUT",
      path: "/calendars/primary/events/event_123",
      body: { summary: "Updated meeting" },
      ifMatch: '"etag_123"',
    },
    fetchImplementation,
  );

  expect(result).toEqual({ id: "event_123" });
  expect(received).toHaveLength(1);
  expect(received[0]?.url).toBe(
    `${WORKOS_RELAY_URL}/google-calendar/calendar/v3/calendars/primary/events/event_123`,
  );
  expect(received[0]?.headers.get("Authorization")).toBe("Bearer sk_test_google_calendar");
  expect(received[0]?.headers.get("X-Relay-User")).toBe("user_123");
  expect(received[0]?.headers.get("X-Relay-Organization")).toBeNull();
  expect(received[0]?.headers.get("X-Relay-URL")).toBeNull();
  expect(received[0]?.headers.get("If-Match")).toBe('"etag_123"');
  expect(received[0]?.headers.get("Content-Type")).toBe("application/json");
  expect(await received[0]?.text()).toBe('{"summary":"Updated meeting"}');
});

test.each(["https://attacker.example/events", "//attacker.example/events"])(
  "rejects the cross-origin path %s before contacting Relay",
  async (path) => {
    let fetchInvoked = false;

    await expect(
      googleCalendarRequest(
        actor,
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
    actor,
    {
      method: "DELETE",
      path: "/calendars/primary/events/event_123",
    },
    async () => withUpstream(204, null),
  );

  expect(result).toBeUndefined();
});

test("rejects malformed successful Google JSON without exposing the response body", async () => {
  await expect(
    googleCalendarRequest(
      actor,
      { method: "GET", path: "/calendars/primary/events" },
      async () => withUpstream(200, "provider diagnostic"),
    ),
  ).rejects.toEqual(
    expect.objectContaining({
      kind: "failed",
      message: "Google Calendar returned an invalid response.",
    }),
  );
});

test.each([
  [412, "conflict"],
  [429, "retryable"],
  [500, "retryable"],
  [404, "not_found"],
])("classifies Google upstream response %i", async (status, expectedKind) => {
  await expect(
    googleCalendarRequest(
      actor,
      { method: "GET", path: "/calendars/primary/events" },
      async () => withUpstream(status),
    ),
  ).rejects.toMatchObject({ kind: expectedKind });
});

test("maps Relay 402 to reconnect without an organization header", async () => {
  let received: Request | undefined;
  await expect(
    googleCalendarRequest(
      actor,
      { method: "GET", path: "/calendars/primary/events" },
      async (input, init) => {
        received = new Request(input, init);
        return responseJson({ code: "relay_authorization_required" }, 402);
      },
    ),
  ).rejects.toMatchObject({ kind: "needs_reauthorization" });
  expect(received?.headers.get("X-Relay-Organization")).toBeNull();
  expect(received?.headers.get("X-Relay-User")).toBe("user_123");
  expect(received?.headers.get("X-Relay-URL")).toBeNull();
  expect(received?.url).toBe(
    `${WORKOS_RELAY_URL}/google-calendar/calendar/v3/calendars/primary/events`,
  );
});

test.each([404, 401])(
  "maps a Relay %i without upstream status to failed, not a Google error",
  async (status) => {
    await expect(
      googleCalendarRequest(
        actor,
        { method: "GET", path: "/calendars/primary/events" },
        async () => new Response(null, { status }),
      ),
    ).rejects.toMatchObject({ kind: "failed" });
  },
);

test("classifies network failures as retryable without exposing the error", async () => {
  await expect(
    googleCalendarRequest(
      actor,
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

test("vends a user-scoped Google Calendar authorize URL", async () => {
  let receivedRequest: Request | undefined;
  const url = await createUserScopedGoogleCalendarAuthorizeUrl("user_123", async (input, init) => {
    receivedRequest = new Request(input, init);
    return responseJson({
      url: "https://api.workos.com/data-integrations/q2czJKmVAraSBg8xFpT7M9uR/authorize-redirect",
    });
  });

  expect(url).toBe(
    "https://api.workos.com/data-integrations/q2czJKmVAraSBg8xFpT7M9uR/authorize-redirect",
  );
  expect(receivedRequest?.method).toBe("POST");
  expect(receivedRequest?.url).toBe(
    "https://api.workos.com/data-integrations/google-calendar/authorize",
  );
  expect(await receivedRequest?.json()).toEqual({ user_id: "user_123" });
});

test("rejects an authorize URL that is not a WorkOS data-integration redirect", async () => {
  await expect(
    createUserScopedGoogleCalendarAuthorizeUrl("user_123", async () =>
      responseJson({ url: "https://evil.example/phish" }),
    ),
  ).rejects.toThrow("WorkOS authorize URL was invalid.");
});
