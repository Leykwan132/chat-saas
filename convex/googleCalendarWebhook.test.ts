/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import type { FunctionReference } from "convex/server";
import { afterAll, afterEach, beforeEach, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { createUserAcrossTwoTeams, reserveConnection } from "./googleCalendar/testFixtures";

const modules = import.meta.glob("./**/*.ts");
const now = Date.UTC(2026, 7, 13, 9);
const day = 86_400_000;
const originalApiKey = process.env.WORKOS_API_KEY;
const originalSiteUrl = process.env.CONVEX_SITE_URL;
const originalClientId = process.env.WORKOS_CLIENT_ID;
const originalWebhookSecret = process.env.WORKOS_WEBHOOK_SECRET;
type CalendarTest = TestConvex<typeof schema>;

process.env.WORKOS_CLIENT_ID = "client_test_google_calendar";
process.env.WORKOS_WEBHOOK_SECRET = "whsec_test_google_calendar";

const watchActions = (internal as unknown as {
  googleCalendar: { watchActions: {
    createGoogleCalendarWatch: FunctionReference<"action", "internal", { connectionId: Id<"googleCalendarConnections"> }, unknown>;
    renewExpiringGoogleCalendarWatches: FunctionReference<"action", "internal", Record<string, never>, null>;
    stopGoogleCalendarWatch: FunctionReference<"action", "internal", { channelId: Id<"googleCalendarWatchChannels"> }, unknown>;
    runDailyGoogleCalendarMaintenance: FunctionReference<"action", "internal", Record<string, never>, null>;
    runStaleSyncSweepPage: FunctionReference<"action", "internal", { state: "connected" | "syncing"; cursor: string | null }, null>;
  } };
}).googleCalendar.watchActions;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  process.env.WORKOS_API_KEY = "sk_test_google_calendar";
  process.env.CONVEX_SITE_URL = "https://calendar.example.com";
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (originalApiKey === undefined) delete process.env.WORKOS_API_KEY;
  else process.env.WORKOS_API_KEY = originalApiKey;
  if (originalSiteUrl === undefined) delete process.env.CONVEX_SITE_URL;
  else process.env.CONVEX_SITE_URL = originalSiteUrl;
});

afterAll(() => {
  if (originalClientId === undefined) delete process.env.WORKOS_CLIENT_ID;
  else process.env.WORKOS_CLIENT_ID = originalClientId;
  if (originalWebhookSecret === undefined) delete process.env.WORKOS_WEBHOOK_SECRET;
  else process.env.WORKOS_WEBHOOK_SECRET = originalWebhookSecret;
});

function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function tokenHash(token: string) {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))));
}

async function fixture(state: "active" | "pending" = "active", expirationAt = now + day) {
  const t = convexTest(schema, modules);
  const { userId } = await createUserAcrossTwoTeams(t);
  const connectionId = await reserveConnection(t, userId);
  const token = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const channelId = await t.run(async (ctx) => {
    return await ctx.db.insert("googleCalendarWatchChannels", {
      connectionId,
      channelId: "channel-1",
      resourceId: state === "pending" ? "" : "resource-1",
      resourceUri: state === "pending" ? "" : "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      tokenHash: await tokenHash(token),
      expirationAt,
      state,
      createdAt: now,
      updatedAt: now,
    });
  });
  if (state === "active") {
    await t.run(async (ctx) => await ctx.db.patch(connectionId, { activeWatchChannelId: channelId }));
  }
  return { t, connectionId, channelId, token };
}

function notificationHeaders(input: Partial<Record<string, string>> = {}) {
  return {
    "X-Goog-Channel-ID": "channel-1",
    "X-Goog-Channel-Token": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "X-Goog-Resource-ID": "resource-1",
    "X-Goog-Resource-State": "exists",
    "X-Goog-Message-Number": "7",
    "X-Goog-Channel-Expiration": new Date(now + day).toUTCString(),
    ...input,
  };
}

async function scheduledCount(t: CalendarTest) {
  return await t.run(async (ctx) => (await ctx.db.system.query("_scheduled_functions").take(20)).length);
}

test.each(["sync", "exists", "not_exists"] as const)("accepts bodyless %s notifications and durably schedules sync", async (resourceState) => {
  const pending = resourceState === "sync";
  const { t, connectionId } = await fixture(pending ? "pending" : "active");
  const response = await t.fetch("/webhook/google-calendar", {
    method: "POST",
    headers: notificationHeaders({ "X-Goog-Resource-State": resourceState }),
  });
  const connection = await t.run(async (ctx) => await ctx.db.get(connectionId));
  expect(response.status).toBe(204);
  expect(connection?.dirtyGeneration).toBe(1);
  expect(await scheduledCount(t)).toBe(1);
});

test.each([
  ["unknown channel", { "X-Goog-Channel-ID": "unknown" }, now + day],
  ["bad token", { "X-Goog-Channel-Token": "wrong" }, now + day],
  ["wrong resource", { "X-Goog-Resource-ID": "wrong" }, now + day],
  ["invalid state", { "X-Goog-Resource-State": "updated" }, now + day],
  ["invalid message", { "X-Goog-Message-Number": "7.5" }, now + day],
  ["invalid expiration", { "X-Goog-Channel-Expiration": "tomorrow" }, now + day],
  ["wrong expiration", { "X-Goog-Channel-Expiration": new Date(now + 2 * day).toUTCString() }, now + day],
  ["expired channel", {}, now - 1],
] as const)("rejects %s without dirtying or scheduling", async (_kind, headers, expirationAt) => {
  const { t, connectionId } = await fixture("active", expirationAt);
  const response = await t.fetch("/webhook/google-calendar", { method: "POST", headers: notificationHeaders(headers) });
  expect(response.status).toBe(404);
  expect((await t.run(async (ctx) => await ctx.db.get(connectionId)))?.dirtyGeneration).toBe(0);
  expect(await scheduledCount(t)).toBe(0);
});

test("acknowledges duplicate and out-of-order message numbers without duplicate scheduling", async () => {
  const { t, connectionId, channelId } = await fixture();
  for (const messageNumber of ["7", "7", "6"]) {
    expect((await t.fetch("/webhook/google-calendar", {
      method: "POST",
      headers: notificationHeaders({ "X-Goog-Message-Number": messageNumber }),
    })).status).toBe(204);
  }
  expect((await t.run(async (ctx) => await ctx.db.get(connectionId)))?.dirtyGeneration).toBe(1);
  expect((await t.run(async (ctx) => await ctx.db.get(channelId)))?.lastMessageNumber).toBe(7);
  expect(await scheduledCount(t)).toBe(1);
});

function providerFetch(t: CalendarTest, onWatch: (body: Record<string, unknown>) => Promise<void>, calls: Array<Record<string, unknown>>) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    if (request.method === "GET" && request.url.includes("/connected_accounts/google-calendar")) {
      return Response.json({
        object: "connected_account",
        state: "connected",
        scopes: ["https://www.googleapis.com/auth/calendar.events"],
      });
    }
    const googleUrl = request.headers.get("X-Relay-URL") ?? request.url;
    const body = await request.json() as Record<string, unknown>;
    calls.push(body);
    if (googleUrl.includes("/calendars/primary/events/watch")) {
      await onWatch(body);
      return Response.json({ id: body.id, resourceId: `resource-${body.id}`, resourceUri: "https://www.googleapis.com/calendar/v3/calendars/primary/events", expiration: String(now + 7 * day) });
    }
    if (googleUrl.endsWith("/channels/stop")) return new Response(null, { status: 204 });
    return Response.json({}, { status: 400 });
  };
}

test("persists only a token verifier before Google watch and activates the actual response", async () => {
  const { t, connectionId } = await fixture();
  await t.run(async (ctx) => {
    const active = await ctx.db.get((await ctx.db.get(connectionId))!.activeWatchChannelId!);
    await ctx.db.patch(active!._id, { state: "retired" });
    await ctx.db.patch(connectionId, { activeWatchChannelId: undefined });
  });
  const calls: Array<Record<string, unknown>> = [];
  vi.stubGlobal("fetch", providerFetch(t, async (body) => {
    const pending = await t.run(async (ctx) => await ctx.db.query("googleCalendarWatchChannels").withIndex("by_channelId", (q) => q.eq("channelId", String(body.id))).unique());
    expect(pending).toMatchObject({ state: "pending", resourceId: "", resourceUri: "" });
    expect(pending?.tokenHash).not.toBe(body.token);
    expect(pending?.tokenHash).toBe(await tokenHash(String(body.token)));
    expect(body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  }, calls));
  await t.action(watchActions.createGoogleCalendarWatch, { connectionId });
  const connection = await t.run(async (ctx) => await ctx.db.get(connectionId));
  const active = await t.run(async (ctx) => await ctx.db.get(connection!.activeWatchChannelId!));
  expect(active).toMatchObject({ state: "active", resourceId: `resource-${calls[0].id}`, expirationAt: now + 7 * day });
});

test("renews within 48 hours with overlap before stopping and retiring the old channel", async () => {
  const { t, connectionId, channelId } = await fixture("active", now + 48 * 60 * 60 * 1000);
  const calls: Array<Record<string, unknown>> = [];
  vi.stubGlobal("fetch", providerFetch(t, async () => {
    const rows = await t.run(async (ctx) => await ctx.db.query("googleCalendarWatchChannels").withIndex("by_connectionId", (q) => q.eq("connectionId", connectionId)).take(10));
    expect(rows.map((row) => row.state).sort()).toEqual(["active", "pending"]);
  }, calls));
  await t.action(watchActions.renewExpiringGoogleCalendarWatches, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  const rows = await t.run(async (ctx) => await ctx.db.query("googleCalendarWatchChannels").withIndex("by_connectionId", (q) => q.eq("connectionId", connectionId)).take(10));
  expect(rows.find((row) => row._id === channelId)?.state).toBe("retired");
  expect(rows.find((row) => row.state === "active")?.channelId).not.toBe("channel-1");
  expect(calls.at(-1)).toEqual({ id: "channel-1", resourceId: "resource-1" });
});

test("a disconnect racing the watch response stops the new channel instead of activating it", async () => {
  const { t, connectionId } = await fixture();
  await t.run(async (ctx) => {
    const connection = await ctx.db.get(connectionId);
    await ctx.db.patch(connection!.activeWatchChannelId!, { state: "retired" });
    await ctx.db.patch(connectionId, { activeWatchChannelId: undefined });
  });
  const calls: Array<Record<string, unknown>> = [];
  vi.stubGlobal("fetch", providerFetch(t, async () => {
    await t.run(async (ctx) => await ctx.db.patch(connectionId, { state: "disconnected" }));
  }, calls));
  await expect(t.action(watchActions.createGoogleCalendarWatch, { connectionId })).resolves.toMatchObject({ kind: "superseded" });
  const connection = await t.run(async (ctx) => await ctx.db.get(connectionId));
  const rows = await t.run(async (ctx) => await ctx.db.query("googleCalendarWatchChannels").withIndex("by_connectionId", (q) => q.eq("connectionId", connectionId)).take(10));
  expect(connection?.activeWatchChannelId).toBeUndefined();
  expect(rows.find((row) => row.channelId !== "channel-1")?.state).toBe("retired");
  expect(calls.at(-1)).toMatchObject({ id: expect.not.stringMatching(/^channel-1$/), resourceId: expect.stringMatching(/^resource-/) });
});

test("stopping an already expired channel succeeds without contacting Google", async () => {
  const { t, channelId } = await fixture("active", now - 1);
  const fetchImplementation = vi.fn();
  vi.stubGlobal("fetch", fetchImplementation);
  await expect(t.action(watchActions.stopGoogleCalendarWatch, { channelId })).resolves.toMatchObject({ kind: "expired" });
  expect(fetchImplementation).not.toHaveBeenCalled();
  expect((await t.run(async (ctx) => await ctx.db.get(channelId)))?.state).toBe("expired");
});

test("stopping tolerates Google not finding an unexpired channel", async () => {
  const { t, channelId } = await fixture();
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    if (request.method === "GET" && request.url.includes("/connected_accounts/google-calendar")) {
      return Response.json({
        object: "connected_account",
        state: "connected",
        scopes: ["https://www.googleapis.com/auth/calendar.events"],
      });
    }
    const googleUrl = request.headers.get("X-Relay-URL") ?? request.url;
    if (googleUrl.includes("/channels/stop")) {
      return Response.json({}, { status: 404, headers: { "X-Relay-Upstream-Status": "404" } });
    }
    return Response.json({}, { status: 404, headers: { "X-Relay-Upstream-Status": "404" } });
  });
  await expect(t.action(watchActions.stopGoogleCalendarWatch, { channelId })).resolves.toMatchObject({ kind: "stopped" });
  expect((await t.run(async (ctx) => await ctx.db.get(channelId)))?.state).toBe("retired");
});

test("daily maintenance delegates immediately to renewal and stale-sync sweeps", async () => {
  const t = convexTest(schema, modules);
  await t.action(watchActions.runDailyGoogleCalendarMaintenance, {});
  const names = await t.run(async (ctx) => (await ctx.db.system.query("_scheduled_functions").take(10)).map((row) => row.name).sort());
  expect(names).toEqual([
    "googleCalendar/watchActions:renewExpiringGoogleCalendarWatches",
    "googleCalendar/watchActions:sweepStaleGoogleCalendarSyncs",
  ]);
});

test("the stale-sync sweep durably dirties and schedules old connections", async () => {
  const { t, connectionId } = await fixture();
  await t.action(watchActions.runStaleSyncSweepPage, { state: "connected", cursor: null });
  expect((await t.run(async (ctx) => await ctx.db.get(connectionId)))?.dirtyGeneration).toBe(1);
  const names = await t.run(async (ctx) => (await ctx.db.system.query("_scheduled_functions").take(10)).map((row) => row.name));
  expect(names).toEqual(["googleCalendar/syncWorker:run"]);
});
