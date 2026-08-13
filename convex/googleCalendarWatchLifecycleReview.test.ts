/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import type { FunctionReference } from "convex/server";
import { v } from "convex/values";
import { afterAll, afterEach, beforeEach, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { hashGoogleCalendarChannelToken } from "./googleCalendar/channelToken";
import { createUserAcrossTwoTeams, reserveConnection } from "./googleCalendar/testFixtures";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const now = Date.UTC(2026, 7, 13, 9);
const day = 86_400_000;
const originalApiKey = process.env.WORKOS_API_KEY;
const originalSiteUrl = process.env.CONVEX_SITE_URL;
type CalendarTest = TestConvex<typeof schema>;

const watchActions = (internal as unknown as {
  googleCalendar: { watchActions: {
    createGoogleCalendarWatch: FunctionReference<"action", "internal", { connectionId: Id<"googleCalendarConnections"> }, unknown>;
    renewConnectionWatch: FunctionReference<"action", "internal", { connectionId: Id<"googleCalendarConnections"> }, null>;
    renewExpiringGoogleCalendarWatches: FunctionReference<"action", "internal", Record<string, never>, null>;
  } };
}).googleCalendar.watchActions;

const acceptNotification = (internal as unknown as {
  googleCalendar: { watchStore: {
    acceptNotification: FunctionReference<"mutation", "internal", {
      channelId: string;
      tokenHash: string;
      resourceId: string;
      resourceState: "sync" | "exists" | "not_exists";
      messageNumber: number;
      headerExpirationAt: number;
      now: number;
    }, { kind: "accepted" | "duplicate" | "rejected" }>;
  } };
}).googleCalendar.watchStore.acceptNotification;

const activationFailure = internalMutation({
  args: {
    pendingChannelId: v.id("googleCalendarWatchChannels"),
    expectedChannelId: v.string(),
    resourceId: v.string(),
    resourceUri: v.string(),
    expirationAt: v.number(),
    replacingChannelId: v.optional(v.id("googleCalendarWatchChannels")),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal("activated"), retiringChannelId: v.optional(v.id("googleCalendarWatchChannels")) }),
    v.object({ kind: v.literal("superseded") }),
  ),
  handler: async () => {
    throw new Error("injected activation failure");
  },
});

function modulesWithActivationFailure() {
  const watchActivationModule = modules["./googleCalendar/watchActivation.ts"];
  if (watchActivationModule === undefined) throw new Error("watch activation module missing");
  return {
    ...modules,
    "./googleCalendar/watchActivation.ts": async () => ({
      ...(await watchActivationModule() as Record<string, unknown>),
      activatePendingWatch: activationFailure,
    }),
  };
}

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
  if (originalApiKey === undefined) delete process.env.WORKOS_API_KEY;
  else process.env.WORKOS_API_KEY = originalApiKey;
  if (originalSiteUrl === undefined) delete process.env.CONVEX_SITE_URL;
  else process.env.CONVEX_SITE_URL = originalSiteUrl;
});

async function connectionFixture(t: CalendarTest) {
  const { userId } = await createUserAcrossTwoTeams(t);
  return await reserveConnection(t, userId);
}

async function insertWatch(t: CalendarTest, connectionId: Id<"googleCalendarConnections">, channelId: string, state: "active" | "retiring", expirationAt = now + day) {
  return await t.run(async (ctx) => await ctx.db.insert("googleCalendarWatchChannels", {
    connectionId,
    channelId,
    resourceId: `resource-${channelId}`,
    resourceUri: "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    tokenHash: `hash-${channelId}`,
    expirationAt,
    state,
    createdAt: now,
    updatedAt: now,
  }));
}

function providerFetch(
  stopStatus: (channelId: string) => number,
  beforeWatchResponse?: (body: Record<string, unknown>) => Promise<void>,
) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    if (request.method === "GET" && request.url.includes("/connected_accounts/google-calendar")) {
      return Response.json({
        object: "connected_account",
        state: "connected",
        scopes: ["https://www.googleapis.com/auth/calendar.events"],
      });
    }
    const relayUrl = request.headers.get("X-Relay-URL") ?? "";
    const body = await request.json() as Record<string, unknown>;
    if (relayUrl.endsWith("/calendars/primary/events/watch")) {
      await beforeWatchResponse?.(body);
      return Response.json({ id: body.id, resourceId: `resource-${body.id}`, resourceUri: "https://www.googleapis.com/calendar/v3/calendars/primary/events", expiration: String(now + 7 * day) });
    }
    if (request.url.endsWith("/channels/stop") || relayUrl.endsWith("/channels/stop")) {
      const status = stopStatus(String(body.id));
      return status === 204 ? new Response(null, { status }) : Response.json({}, { status });
    }
    return Response.json({}, { status: 400 });
  };
}

async function watches(t: CalendarTest, connectionId: Id<"googleCalendarConnections">) {
  return await t.run(async (ctx) => await ctx.db.query("googleCalendarWatchChannels")
    .withIndex("by_connectionId", (q) => q.eq("connectionId", connectionId)).take(20));
}

test("retiring stop failures cannot gate an expiring active watch replacement", async () => {
  const t = convexTest(schema, modules);
  const connectionId = await connectionFixture(t);
  const activeId = await insertWatch(t, connectionId, "active-expiring", "active", now + 60 * 60 * 1000);
  await insertWatch(t, connectionId, "retiring-forbidden", "retiring");
  await insertWatch(t, connectionId, "retiring-retryable", "retiring");
  await t.run(async (ctx) => await ctx.db.patch(connectionId, { activeWatchChannelId: activeId }));
  vi.stubGlobal("fetch", providerFetch((channelId) => channelId === "retiring-forbidden" ? 403 : 500));

  await expect(t.action(watchActions.renewConnectionWatch, { connectionId })).resolves.toBeNull();
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  await expect(t.action(watchActions.renewConnectionWatch, { connectionId })).resolves.toBeNull();
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  const connection = await t.run(async (ctx) => await ctx.db.get(connectionId));
  const rows = await watches(t, connectionId);
  expect(connection?.activeWatchChannelId).not.toBe(activeId);
  expect(rows.find((row) => row._id === connection?.activeWatchChannelId)?.state).toBe("active");
  expect(rows.filter((row) => row.channelId !== rows.find((candidate) => candidate._id === connection?.activeWatchChannelId)?.channelId).map((row) => row.state)).toEqual(["retiring", "retiring", "retiring"]);
});

test("activation failure records the provider resource and retires it after a successful stop", async () => {
  const t = convexTest(schema, modulesWithActivationFailure());
  const connectionId = await connectionFixture(t);
  vi.stubGlobal("fetch", providerFetch(() => 204));

  await expect(t.action(watchActions.createGoogleCalendarWatch, { connectionId })).rejects.toThrow("injected activation failure");

  const [channel] = await watches(t, connectionId);
  expect(channel).toMatchObject({ state: "retired", resourceId: expect.stringMatching(/^resource-/), expirationAt: now + 7 * day });
});

test("activation failure retains recoverable metadata when stop fails and maintenance retries cleanup", async () => {
  const t = convexTest(schema, modulesWithActivationFailure());
  const connectionId = await connectionFixture(t);
  let stopStatus = 500;
  vi.stubGlobal("fetch", providerFetch(() => stopStatus));

  await expect(t.action(watchActions.createGoogleCalendarWatch, { connectionId })).rejects.toThrow("injected activation failure");
  const [recoverable] = await watches(t, connectionId);
  expect(recoverable).toMatchObject({ state: "retiring", resourceId: expect.stringMatching(/^resource-/), expirationAt: now + 7 * day });

  const stableId = await insertWatch(t, connectionId, "stable-active", "active", now + 6 * day);
  await t.run(async (ctx) => await ctx.db.patch(connectionId, { activeWatchChannelId: stableId }));
  stopStatus = 204;
  await t.action(watchActions.renewConnectionWatch, { connectionId });
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  expect((await t.run(async (ctx) => await ctx.db.get(recoverable._id)))?.state).toBe("retired");
  expect((await t.run(async (ctx) => await ctx.db.get(connectionId)))?.activeWatchChannelId).toBe(stableId);
});

test("an expired pending row retains cleanup metadata after stop failure and maintenance retires it", async () => {
  const t = convexTest(schema, modules);
  const connectionId = await connectionFixture(t);
  let stopStatus = 500;
  let watchCount = 0;
  let rawToken = "";
  vi.stubGlobal("fetch", providerFetch(
    () => stopStatus,
    async (body) => {
      watchCount += 1;
      if (watchCount !== 1) return;
      rawToken = String(body.token);
      await t.run(async (ctx) => {
        const pending = await ctx.db.query("googleCalendarWatchChannels")
          .withIndex("by_channelId", (q) => q.eq("channelId", String(body.id))).unique();
        await ctx.db.patch(pending!._id, { state: "expired", updatedAt: now });
      });
    },
  ));

  await expect(t.action(watchActions.createGoogleCalendarWatch, { connectionId })).resolves.toMatchObject({ kind: "superseded" });
  const [cleanup] = await watches(t, connectionId);
  expect(cleanup).toMatchObject({ state: "retiring", resourceId: expect.stringMatching(/^resource-/), expirationAt: now + 7 * day });
  expect(cleanup.tokenHash).not.toBe(rawToken);
  expect((await t.run(async (ctx) => await ctx.db.get(connectionId)))?.activeWatchChannelId).toBeUndefined();
  await expect(t.mutation(acceptNotification, {
    channelId: cleanup.channelId,
    tokenHash: await hashGoogleCalendarChannelToken(rawToken),
    resourceId: cleanup.resourceId,
    resourceState: "sync",
    messageNumber: 1,
    headerExpirationAt: cleanup.expirationAt,
    now,
  })).resolves.toEqual({ kind: "rejected" });
  expect((await t.run(async (ctx) => await ctx.db.get(connectionId)))?.dirtyGeneration).toBe(0);

  stopStatus = 204;
  await t.action(watchActions.renewConnectionWatch, { connectionId });
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  expect((await t.run(async (ctx) => await ctx.db.get(cleanup._id)))?.state).toBe("retired");
  expect((await t.run(async (ctx) => await ctx.db.get(connectionId)))?.activeWatchChannelId).not.toBe(cleanup._id);
});

test("a retired pending row on disconnect remains cleanup-only until maintenance stops it", async () => {
  const t = convexTest(schema, modules);
  const connectionId = await connectionFixture(t);
  let stopStatus = 500;
  let rawToken = "";
  vi.stubGlobal("fetch", providerFetch(
    () => stopStatus,
    async (body) => {
      rawToken = String(body.token);
      await t.run(async (ctx) => {
        const pending = await ctx.db.query("googleCalendarWatchChannels")
          .withIndex("by_channelId", (q) => q.eq("channelId", String(body.id))).unique();
        await ctx.db.patch(pending!._id, { state: "retired", updatedAt: now });
        await ctx.db.patch(connectionId, { state: "disconnected", updatedAt: now });
      });
    },
  ));

  await expect(t.action(watchActions.createGoogleCalendarWatch, { connectionId })).resolves.toMatchObject({ kind: "superseded" });
  const [cleanup] = await watches(t, connectionId);
  expect(cleanup).toMatchObject({ state: "retiring", resourceId: expect.stringMatching(/^resource-/), expirationAt: now + 7 * day });
  expect(cleanup.tokenHash).not.toBe(rawToken);
  expect((await t.run(async (ctx) => await ctx.db.get(connectionId)))?.activeWatchChannelId).toBeUndefined();

  stopStatus = 204;
  await t.action(watchActions.renewExpiringGoogleCalendarWatches, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  expect((await t.run(async (ctx) => await ctx.db.get(cleanup._id)))?.state).toBe("retired");
  expect((await t.run(async (ctx) => await ctx.db.get(connectionId)))?.activeWatchChannelId).toBeUndefined();
});
