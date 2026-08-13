/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import type { FunctionReference } from "convex/server";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { GoogleCalendarEvent } from "./googleCalendar/eventMapping";
import { googleCalendarRequest } from "./googleCalendar/googleClient";
import { listGoogleCalendarPage } from "./googleCalendar/syncProvider";
import {
  runGoogleCalendarSync,
  scheduleGoogleCalendarFollowUp,
  type GoogleCalendarSyncDependencies,
} from "./googleCalendar/syncWorker";
import { createUserAcrossTwoTeams, reserveConnection } from "./googleCalendar/testFixtures";
import { GOOGLE_CALENDAR_EXTERNAL_EVENT_INDEX } from "./googleCalendar/constants";
import schema from "./schema";

const originalWorkOSApiKey = process.env.WORKOS_API_KEY;
process.env.WORKOS_API_KEY = "sk_test_google_calendar";

const modules = import.meta.glob("./**/*.ts");
type CalendarTest = TestConvex<typeof schema>;
type InternalMutation = FunctionReference<"mutation", "internal", Record<string, unknown>, unknown>;
type InternalQuery = FunctionReference<"query", "internal", Record<string, unknown>, unknown>;

const calendarInternal = (internal as unknown as {
  googleCalendar: {
    eventStore: { applyPage: InternalMutation };
    syncRecovery: {
      recoverInvalidSyncToken: InternalMutation;
      reconcileFullSync: InternalMutation;
    };
    syncState: {
      beginSyncRun: InternalMutation;
      failSyncRun: InternalMutation;
      finalizeSyncRun: InternalMutation;
      getConnectionForSync: InternalQuery;
      markGoogleCalendarDirty: InternalMutation;
      renewSyncRunLease: InternalMutation;
    };
  };
}).googleCalendar;

const baseNow = Date.UTC(2026, 7, 13, 1);

function event(id: string, startHour: number): GoogleCalendarEvent {
  const start = new Date(Date.UTC(2026, 7, 15, startHour - 8));
  const end = new Date(start.getTime() + 3_600_000);
  return {
    id,
    status: "confirmed",
    summary: id,
    etag: `"${id}_${startHour}"`,
    updated: "2026-08-13T01:00:00.000Z",
    organizer: { self: true },
    start: { dateTime: start.toISOString(), timeZone: "Asia/Kuala_Lumpur" },
    end: { dateTime: end.toISOString(), timeZone: "Asia/Kuala_Lumpur" },
  };
}

async function setup() {
  const t = convexTest(schema, modules);
  const { userId, teamIds } = await createUserAcrossTwoTeams(t);
  const connectionId = await reserveConnection(t, userId);
  return { t, userId, teamIds, connectionId };
}

function dependencies(t: CalendarTest): GoogleCalendarSyncDependencies {
  return {
    getConnection: (args) => t.query(calendarInternal.syncState.getConnectionForSync, args) as never,
    beginRun: (args) => t.mutation(calendarInternal.syncState.beginSyncRun, args) as never,
    renewRun: (args) => t.mutation(calendarInternal.syncState.renewSyncRunLease, args) as never,
    applyPage: (args) => t.mutation(calendarInternal.eventStore.applyPage, args) as never,
    finalizeRun: (args) => t.mutation(calendarInternal.syncState.finalizeSyncRun, args) as never,
    failRun: (args) => t.mutation(calendarInternal.syncState.failSyncRun, args) as never,
    recoverInvalidToken: (args) =>
      t.mutation(calendarInternal.syncRecovery.recoverInvalidSyncToken, args) as never,
    reconcileFullRun: (args) =>
      t.mutation(calendarInternal.syncRecovery.reconcileFullSync, args) as never,
  };
}

async function ownerEvents(t: CalendarTest, userId: Id<"users">) {
  return await t.run(async (ctx) => {
    const memberships = await ctx.db
      .query("teamMemberships")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(10);
    const rows = [];
    for (const membership of memberships) {
      rows.push(...await ctx.db
        .query("calendarEvents")
        .withIndex(
          GOOGLE_CALENDAR_EXTERNAL_EVENT_INDEX,
          (q) => q.eq("teamId", membership.teamId).eq("externalOwnerUserId", userId),
        )
        .take(20));
    }
    return rows;
  });
}

async function syncSinglePage(
  t: CalendarTest,
  connectionId: Id<"googleCalendarConnections">,
  now: number,
  items: GoogleCalendarEvent[],
  syncToken: string,
) {
  return await runGoogleCalendarSync({
    connectionId,
    now,
    dependencies: dependencies(t),
    listPage: async () => ({ items, nextSyncToken: syncToken }),
  });
}

test("moving a one-off event updates one stable projection per team", async () => {
  const { t, userId, connectionId } = await setup();
  await syncSinglePage(t, connectionId, baseNow, [event("one_off", 9)], "sync_1");
  await syncSinglePage(t, connectionId, baseNow + 1_000, [event("one_off", 11)], "sync_2");
  const rows = await ownerEvents(t, userId);
  expect(rows).toHaveLength(2);
  expect(rows.map((row) => row.startAt)).toEqual([
    Date.parse("2026-08-15T03:00:00.000Z"),
    Date.parse("2026-08-15T03:00:00.000Z"),
  ]);
  expect(rows.every((row) => row.externalOriginalStartAt === undefined)).toBe(true);
});

test("scopes Google 410 invalid-token classification to sync-list requests", async () => {
  const response: typeof fetch = async () =>
    new Response(null, { status: 410, headers: { "X-Relay-Upstream-Status": "410" } });
  await expect(googleCalendarRequest(
    { workosUserId: "user_123" },
    { method: "DELETE", path: "calendars/primary/events/event_1" },
    response,
  )).rejects.toMatchObject({ kind: "not_found" });
  await expect(listGoogleCalendarPage(
    { workosUserId: "user_123" },
    {
      kind: "incremental",
      singleEvents: true,
      showDeleted: true,
      pageSize: 20,
      syncToken: "expired",
    },
    response,
  )).rejects.toMatchObject({ kind: "invalid_sync_token" });
  await expect(listGoogleCalendarPage(
    { workosUserId: "user_123" },
    {
      kind: "full",
      singleEvents: true,
      showDeleted: true,
      pageSize: 20,
      timeMin: baseNow,
      timeMax: baseNow + 86_400_000,
    },
    response,
  )).rejects.toMatchObject({ kind: "not_found" });
});

test("coalescing marks the active run dirty without requesting self-rescheduling", async () => {
  const { t, connectionId } = await setup();
  const deps = dependencies(t);
  await deps.beginRun({
    connectionId,
    requestKind: "full",
    fullSyncStartAt: baseNow,
    fullSyncEndAt: baseNow + 86_400_000,
    now: baseNow,
  });
  const result = await runGoogleCalendarSync({
    connectionId,
    now: baseNow + 1,
    dependencies: deps,
    listPage: async () => { throw new Error("must not list"); },
  });
  const connection = await t.run((ctx) => ctx.db.get(connectionId));
  expect(result).toMatchObject({ kind: "coalesced", dirty: false });
  expect(connection?.dirtyGeneration).toBe(1);
});

test("the action scheduling branch ignores coalesced workers", async () => {
  let scheduled = 0;
  const schedule = async () => { scheduled += 1; };
  await scheduleGoogleCalendarFollowUp(
    { kind: "coalesced", passes: 0, dirty: false },
    schedule,
  );
  await scheduleGoogleCalendarFollowUp(
    { kind: "completed", passes: 20, dirty: true },
    schedule,
  );
  expect(scheduled).toBe(1);
});

test("a monthly full rebase removes unseen imports and preserves Kilobot rows", async () => {
  const { t, userId, teamIds, connectionId } = await setup();
  await syncSinglePage(t, connectionId, baseNow, [event("kept", 9), event("stale", 10)], "sync_1");
  await t.run(async (ctx) => {
    await ctx.db.patch(connectionId, {
      fullSyncStartAt: Date.UTC(2026, 4, 15, 1),
      fullSyncEndAt: Date.UTC(2028, 1, 13, 1),
    });
    await ctx.db.insert("calendarEvents", {
      teamId: teamIds[0], title: "Booking", startAt: baseNow, endAt: baseNow + 3_600_000,
      timeZone: "UTC", status: "confirmed", createdBy: userId, externalProvider: "google",
      externalCalendarId: "primary", externalEventId: "booking", externalOwnerUserId: userId,
      externalOrigin: "kilobot", externalStatus: "confirmed", externalTransparency: "opaque",
      externalCanEdit: true, externalSyncState: "synced", createdAt: baseNow, updatedAt: baseNow,
    });
  });
  await syncSinglePage(t, connectionId, Date.UTC(2026, 8, 14, 1), [event("kept", 9)], "sync_2");
  expect((await ownerEvents(t, userId)).map((row) => row.externalEventId).sort()).toEqual([
    "booking", "kept", "kept",
  ]);
});

test("a stale active run is failed and replaced by a new owner run", async () => {
  const { t, connectionId } = await setup();
  const deps = dependencies(t);
  const first = await deps.beginRun({
    connectionId,
    requestKind: "full",
    fullSyncStartAt: baseNow,
    fullSyncEndAt: baseNow + 86_400_000,
    now: baseNow,
  });
  const second = await deps.beginRun({
    connectionId,
    requestKind: "full",
    fullSyncStartAt: baseNow,
    fullSyncEndAt: baseNow + 86_400_000,
    now: baseNow + 6 * 60_000,
  });
  expect(first.kind).toBe("started");
  expect(second.kind).toBe("started");
  const runs = await t.run((ctx) => ctx.db
    .query("googleCalendarSyncRuns")
    .withIndex("by_connectionId", (q) => q.eq("connectionId", connectionId))
    .take(3));
  expect(runs.map((run) => run.state)).toEqual(["failed", "running"]);
});

test("recovery failures fail the owner run and clear syncing state", async () => {
  const { t, connectionId } = await setup();
  await t.run((ctx) => ctx.db.patch(connectionId, { syncToken: "expired" }));
  const deps = dependencies(t);
  await expect(runGoogleCalendarSync({
    connectionId,
    now: baseNow,
    dependencies: {
      ...deps,
      recoverInvalidToken: async () => { throw new Error("recovery failed"); },
    },
    listPage: async () => { throw Object.assign(new Error("gone"), { kind: "invalid_sync_token" }); },
  })).rejects.toThrow("recovery failed");
  const connection = await t.run((ctx) => ctx.db.get(connectionId));
  const activeRuns = await t.run((ctx) => ctx.db
    .query("googleCalendarSyncRuns")
    .withIndex("by_connectionId_and_state", (q) =>
      q.eq("connectionId", connectionId).eq("state", "running"),
    )
    .take(2));
  expect(connection?.state).toBe("connected");
  expect(activeRuns).toHaveLength(0);
});
