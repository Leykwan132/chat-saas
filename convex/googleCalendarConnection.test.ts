/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { expect, test } from "vitest";
import type { FunctionReference } from "convex/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import schema from "./schema";
import { canMutateCalendarEvent } from "./googleCalendar/calendarProjection";
import {
  reconcileGoogleCalendarConnection,
  refreshGoogleCalendarConnection,
  disconnectGoogleCalendarConnection,
  type GoogleCalendarConnectionDependencies,
} from "./googleCalendar/connectionRuntime";
import { googleCalendarConnectionStatus } from "./googleCalendar/connectionStatus";
import { CALENDAR_PAGE_FRESHNESS_MS } from "./googleCalendar/constants";

const modules = import.meta.glob("./**/*.ts");
type CalendarTest = TestConvex<typeof schema>;
const googleInternal = internal as unknown as {
  googleCalendar: {
    connectionLifecycle: {
      ensureSyncing: FunctionReference<"mutation", "internal", { userId: Id<"users">; timeZone: string; now: number }, Id<"googleCalendarConnections">>;
      getForUser: FunctionReference<"query", "internal", { userId: Id<"users"> }, { _id: Id<"googleCalendarConnections">; state: string } | null>;
      purgeImportedGoogleEvents: FunctionReference<"mutation", "internal", { userId: Id<"users">; now: number }, null>;
    };
    connectionQueries: {
      getCurrentConnectionStatus: FunctionReference<"query", "public", Record<string, never>, { state: string }>;
    };
  };
};

function actionCtx(t: CalendarTest) {
  const authed = t.withIdentity({ subject: "user_google_calendar" });
  return {
    runQuery: (ref: FunctionReference<"query", "internal" | "public", Record<string, unknown>, unknown>, args: Record<string, unknown>) =>
      authed.query(ref, args),
    runMutation: (ref: FunctionReference<"mutation", "internal", Record<string, unknown>, unknown>, args: Record<string, unknown>) =>
      authed.mutation(ref, args),
    runAction: () => {
      throw new Error("unexpected action");
    },
  } as unknown as ActionCtx;
}

async function setupUser(t: CalendarTest) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "user_google_calendar",
      email: "calendar@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Personal",
      ownerId: userId,
      timeZone: "Asia/Kuala_Lumpur",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", { teamId, userId, role: "owner", createdAt: now });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    return { userId, teamId, now };
  });
}

test("maps disconnected and missing rows to not_connected", () => {
  expect(googleCalendarConnectionStatus(null).state).toBe("not_connected");
  expect(googleCalendarConnectionStatus({
    state: "disconnected",
    timeZone: "UTC",
  }).state).toBe("not_connected");
  expect(googleCalendarConnectionStatus({
    state: "needs_reauthorization",
    lastErrorKind: "needs_reauthorization",
    timeZone: "UTC",
  })).toMatchObject({
    state: "needs_reauthorization",
    lastErrorMessage: "Google Calendar needs to be reconnected.",
  });
});

test("getCurrentConnectionStatus reports connected after ensureSyncing plus a local connected patch", async () => {
  const t = convexTest(schema, modules);
  const { userId } = await setupUser(t);
  const connectionId = await t.mutation(googleInternal.googleCalendar.connectionLifecycle.ensureSyncing, {
    userId,
    timeZone: "UTC",
    now: Date.now(),
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(connectionId, { state: "connected", lastSuccessfulSyncAt: Date.now() });
  });
  const status = await t.withIdentity({ subject: "user_google_calendar" }).query(
    googleInternal.googleCalendar.connectionQueries.getCurrentConnectionStatus,
    {},
  );
  expect(status.state).toBe("connected");
});

test("purgeImportedGoogleEvents deletes Google copies and keeps Kilobot bookings", async () => {
  const t = convexTest(schema, modules);
  const { userId, teamId, now } = await setupUser(t);
  const ids = await t.run(async (ctx) => {
    const googleEventId = await ctx.db.insert("calendarEvents", {
      teamId,
      title: "Imported",
      startAt: now + 60_000,
      endAt: now + 120_000,
      timeZone: "UTC",
      status: "confirmed",
      createdBy: userId,
      externalProvider: "google",
      externalOwnerUserId: userId,
      externalOrigin: "google",
      createdAt: now,
      updatedAt: now,
    });
    const kilobotEventId = await ctx.db.insert("calendarEvents", {
      teamId,
      title: "Booking",
      startAt: now + 180_000,
      endAt: now + 240_000,
      timeZone: "UTC",
      status: "confirmed",
      createdBy: userId,
      externalProvider: "google",
      externalOwnerUserId: userId,
      externalOrigin: "kilobot",
      createdAt: now,
      updatedAt: now,
    });
    return { googleEventId, kilobotEventId };
  });
  await t.mutation(googleInternal.googleCalendar.connectionLifecycle.purgeImportedGoogleEvents, {
    userId,
    now,
  });
  expect(await t.run((ctx) => ctx.db.get(ids.googleEventId))).toBeNull();
  expect((await t.run((ctx) => ctx.db.get(ids.kilobotEventId)))?.title).toBe("Booking");
});

test("reconcile runs initial sync and watch when WorkOS is active", async () => {
  const t = convexTest(schema, modules);
  await setupUser(t);
  const calls: string[] = [];
  const deps: GoogleCalendarConnectionDependencies = {
    getCredential: async () => ({ kind: "active", token: "token", expiresAt: null }),
    getPrimaryTimeZone: async () => "Asia/Kuala_Lumpur",
    runSync: async () => {
      calls.push("sync");
      return { kind: "completed", passes: 1, dirty: false };
    },
    createWatch: async () => {
      calls.push("watch");
      return { kind: "active" };
    },
    stopWatch: async () => ({ kind: "stopped" }),
    deleteConnectedAccount: async () => {
      calls.push("delete");
    },
  };
  const status = await reconcileGoogleCalendarConnection(actionCtx(t), deps);
  expect(calls).toEqual(["sync", "watch"]);
  expect(["syncing", "connected", "not_connected"]).toContain(status.state);
});

test("refresh skips Google sync when the last sync is fresh", async () => {
  const t = convexTest(schema, modules);
  const { userId } = await setupUser(t);
  const now = Date.now();
  await t.mutation(googleInternal.googleCalendar.connectionLifecycle.ensureSyncing, {
    userId,
    timeZone: "UTC",
    now,
  });
  const connection = await t.query(googleInternal.googleCalendar.connectionLifecycle.getForUser, { userId });
  await t.run(async (ctx) => {
    if (connection === null) throw new Error("missing connection");
    await ctx.db.patch(connection._id, {
      state: "connected",
      lastSuccessfulSyncAt: now - 1_000,
    });
  });
  let synced = false;
  await refreshGoogleCalendarConnection(actionCtx(t), {
    getCredential: async () => ({ kind: "active", token: "token", expiresAt: null }),
    getPrimaryTimeZone: async () => "UTC",
    runSync: async () => {
      synced = true;
      return { kind: "completed", passes: 1, dirty: false };
    },
    createWatch: async () => ({ kind: "active" }),
    stopWatch: async () => ({ kind: "stopped" }),
    deleteConnectedAccount: async () => undefined,
  }, now);
  expect(synced).toBe(false);
  expect(now - (now - 1_000) < CALENDAR_PAGE_FRESHNESS_MS).toBe(true);
});

test("disconnect deletes the WorkOS account and imported events", async () => {
  const t = convexTest(schema, modules);
  const { userId, teamId, now } = await setupUser(t);
  await t.mutation(googleInternal.googleCalendar.connectionLifecycle.ensureSyncing, {
    userId,
    timeZone: "UTC",
    now,
  });
  const eventId = await t.run(async (ctx) => {
    return await ctx.db.insert("calendarEvents", {
      teamId,
      title: "Imported",
      startAt: now + 60_000,
      endAt: now + 120_000,
      timeZone: "UTC",
      status: "confirmed",
      createdBy: userId,
      externalProvider: "google",
      externalOwnerUserId: userId,
      externalOrigin: "google",
      createdAt: now,
      updatedAt: now,
    });
  });
  let deletedAccount = false;
  const status = await disconnectGoogleCalendarConnection(actionCtx(t), {
    getCredential: async () => ({ kind: "not_connected" }),
    getPrimaryTimeZone: async () => "UTC",
    runSync: async () => ({ kind: "completed", passes: 0, dirty: false }),
    createWatch: async () => ({ kind: "active" }),
    stopWatch: async () => ({ kind: "already_stopped" }),
    deleteConnectedAccount: async () => {
      deletedAccount = true;
    },
  });
  expect(deletedAccount).toBe(true);
  expect(status.state).toBe("not_connected");
  expect(await t.run((inner) => inner.db.get(eventId))).toBeNull();
});

test("owners can mutate their Google events without calendar.manage", () => {
  const ownerId = "jd7owner" as Id<"users">;
  const event = {
    externalProvider: "google" as const,
    externalOrigin: "google" as const,
    externalOwnerUserId: ownerId,
    externalCanEdit: true,
  };
  expect(canMutateCalendarEvent(event as never, ownerId, false)).toBe(true);
  expect(canMutateCalendarEvent(event as never, "jd7other" as Id<"users">, true)).toBe(false);
});
