import { readFileSync } from "node:fs";
import { afterAll, expect, test } from "vitest";
import { createUserScopedGoogleCalendarAuthorizeUrl } from "./googleCalendar/connectionWorkos";
import {
  getGoogleCalendarCredential,
} from "./googleCalendar/workosToken";
import { googleCalendarRequest } from "./googleCalendar/googleClient";
import { WORKOS_GOOGLE_CALENDAR_TOKEN_URL } from "./googleCalendar/constants";

const originalWorkOSApiKey = process.env.WORKOS_API_KEY;
process.env.WORKOS_API_KEY = "sk_test_google_calendar";
const actor = { workosUserId: "user_123" };
const TEST_ACCESS_TOKEN = "ya29.test";

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

function isTokenVend(request: Request) {
  return request.method === "POST" && request.url === WORKOS_GOOGLE_CALENDAR_TOKEN_URL;
}

async function vendTestAccessToken(request: Request) {
  expect(request.headers.get("Authorization")).toBe("Bearer sk_test_google_calendar");
  expect(await request.json()).toEqual({ user_id: "user_123" });
  return responseJson({
    active: true,
    access_token: {
      object: "access_token",
      access_token: TEST_ACCESS_TOKEN,
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
      missing_scopes: [],
    },
  });
}

function withAccessToken(googleFetch: typeof fetch): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, init);
    if (isTokenVend(request)) return vendTestAccessToken(request);
    return googleFetch(input, init);
  };
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

test("calls Google Calendar with a vended Pipes access token and no organization", async () => {
  const received: Request[] = [];
  const fetchImplementation: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    received.push(request);
    if (isTokenVend(request)) return vendTestAccessToken(request);
    return responseJson({ id: "event_123" });
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
  expect(received).toHaveLength(2);
  expect(received[1]?.url).toBe(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events/event_123",
  );
  expect(received[1]?.headers.get("Authorization")).toBe(`Bearer ${TEST_ACCESS_TOKEN}`);
  expect(received[1]?.headers.get("If-Match")).toBe('"etag_123"');
  expect(received[1]?.headers.get("Content-Type")).toBe("application/json");
  expect(await received[1]?.text()).toBe('{"summary":"Updated meeting"}');
});

test.each(["https://attacker.example/events", "//attacker.example/events"])(
  "rejects the cross-origin path %s before vending a token",
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
    withAccessToken(async () => new Response(null, { status: 204 })),
  );

  expect(result).toBeUndefined();
});

test("rejects malformed successful Google JSON without exposing the response body", async () => {
  await expect(
    googleCalendarRequest(
      actor,
      { method: "GET", path: "/calendars/primary/events" },
      withAccessToken(async () => new Response("provider diagnostic", { status: 200 })),
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
  [402, "needs_reauthorization"],
  [412, "conflict"],
  [429, "retryable"],
  [500, "retryable"],
])("classifies Google response %i", async (status, expectedKind) => {
  await expect(
    googleCalendarRequest(
      actor,
      { method: "GET", path: "/calendars/primary/events" },
      withAccessToken(async () => new Response("provider diagnostic", { status })),
    ),
  ).rejects.toMatchObject({ kind: expectedKind });
});

test("classifies network failures as retryable without exposing the error", async () => {
  await expect(
    googleCalendarRequest(
      actor,
      { method: "POST", path: "/calendars/primary/events", body: { summary: "Meeting" } },
      withAccessToken(async () => {
        throw new Error("provider diagnostic");
      }),
    ),
  ).rejects.toEqual(
    expect.objectContaining({
      kind: "retryable",
      message: "Google Calendar is temporarily unavailable.",
    }),
  );
});

test("does not call Google when WorkOS has no access token", async () => {
  let googleCalled = false;
  await expect(
    googleCalendarRequest(
      actor,
      { method: "GET", path: "/calendars/primary/events" },
      async (input, init) => {
        const request = new Request(input, init);
        if (isTokenVend(request)) {
          expect(await request.json()).toEqual({ user_id: "user_123" });
          return responseJson({ active: false, error: "not_installed" });
        }
        googleCalled = true;
        return responseJson({});
      },
    ),
  ).rejects.toMatchObject({ kind: "needs_reauthorization" });
  expect(googleCalled).toBe(false);
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

test("does not log WorkOS connected-account or access-token payloads", () => {
  const token = readFileSync(new URL("./googleCalendar/workosToken.ts", import.meta.url), "utf8");
  const workos = readFileSync(new URL("./googleCalendar/connectionWorkos.ts", import.meta.url), "utf8");
  expect(token).not.toContain("console.log");
  expect(workos).not.toContain("console.log");
});
