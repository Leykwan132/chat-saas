/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import type { FunctionReference } from "convex/server";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mapGoogleEvent, type GoogleCalendarEvent } from "./googleCalendar/eventMapping";
import {
  runGoogleCalendarSync,
  type GoogleCalendarSyncDependencies,
  type GoogleCalendarSyncRequest,
} from "./googleCalendar/syncWorker";
import { createUserAcrossTwoTeams, reserveConnection } from "./googleCalendar/testFixtures";
import { GOOGLE_CALENDAR_EXTERNAL_EVENT_INDEX } from "./googleCalendar/constants";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
type CalendarTest = TestConvex<typeof schema>;
type InternalReference<TArgs extends Record<string, unknown>, TResult> = FunctionReference<"mutation", "internal", TArgs, TResult>;
type InternalQueryReference<TArgs extends Record<string, unknown>, TResult> = FunctionReference<"query", "internal", TArgs, TResult>;
const syncInternal = internal as unknown as {
  googleCalendar: {
    eventStore: { applyPage: InternalReference<Record<string, unknown>, unknown> };
    syncRecovery: {
      recoverInvalidSyncToken: InternalReference<Record<string, unknown>, unknown>;
      reconcileFullSync: InternalReference<Record<string, unknown>, unknown>;
    };
    syncState: {
      beginSyncRun: InternalReference<Record<string, unknown>, unknown>;
      failSyncRun: InternalReference<Record<string, unknown>, unknown>;
      finalizeSyncRun: InternalReference<Record<string, unknown>, unknown>;
      getConnectionForSync: InternalQueryReference<Record<string, unknown>, unknown>;
      markGoogleCalendarDirty: InternalReference<Record<string, unknown>, unknown>;
      renewSyncRunLease: InternalReference<Record<string, unknown>, unknown>;
    };
  };
};
const baseNow = Date.UTC(2026, 7, 13, 1, 0, 0);
function timedEvent(id: string, summary: string, start = "2026-08-15T09:00:00+08:00"): GoogleCalendarEvent {
  return {
    id,
    status: "confirmed",
    summary,
    etag: `"${id}"`,
    updated: "2026-08-13T01:00:00.000Z",
    transparency: "opaque",
    organizer: { self: true },
    start: { dateTime: start, timeZone: "Asia/Kuala_Lumpur" },
    end: { dateTime: "2026-08-15T10:00:00+08:00", timeZone: "Asia/Kuala_Lumpur" },
  };
}
function dependencies(t: CalendarTest): GoogleCalendarSyncDependencies {
  const state = syncInternal.googleCalendar;
  return {
    getConnection: (args) => t.query(state.syncState.getConnectionForSync, args) as never,
    beginRun: (args) => t.mutation(state.syncState.beginSyncRun, args) as never,
    renewRun: (args) => t.mutation(state.syncState.renewSyncRunLease, args) as never,
    applyPage: (args) => t.mutation(state.eventStore.applyPage, args) as never,
    finalizeRun: (args) => t.mutation(state.syncState.finalizeSyncRun, args) as never,
    failRun: (args) => t.mutation(state.syncState.failSyncRun, args) as never,
    recoverInvalidToken: (args) =>
      t.mutation(state.syncRecovery.recoverInvalidSyncToken, args) as never,
    reconcileFullRun: (args) =>
      t.mutation(state.syncRecovery.reconcileFullSync, args) as never,
  };
}
async function setupConnection() {
  const t = convexTest(schema, modules);
  const { userId, teamIds } = await createUserAcrossTwoTeams(t);
  const connectionId = await reserveConnection(t, userId);
  return { t, userId, teamIds, connectionId };
}
async function connection(t: CalendarTest, connectionId: Id<"googleCalendarConnections">) {
  return await t.run((ctx) => ctx.db.get(connectionId));
}
async function eventsForOwner(t: CalendarTest, userId: Id<"users">) {
  return await t.run(async (ctx) => {
    const memberships = await ctx.db
      .query("teamMemberships")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(30);
    const rows = [];
    for (const membership of memberships) {
      rows.push(
        ...(await ctx.db
          .query("calendarEvents")
          .withIndex(
            GOOGLE_CALENDAR_EXTERNAL_EVENT_INDEX,
            (q) => q.eq("teamId", membership.teamId).eq("externalOwnerUserId", userId),
          )
          .take(20)),
      );
    }
    return rows;
  });
}

test("maps all-day end dates as exclusive", () => {
  expect(
    mapGoogleEvent({
      id: "all_day",
      status: "confirmed",
      start: { date: "2026-08-13", timeZone: "Asia/Kuala_Lumpur" },
      end: { date: "2026-08-15", timeZone: "Asia/Kuala_Lumpur" },
    }),
  ).toMatchObject({
    allDay: true,
    startDate: "2026-08-13",
    endDate: "2026-08-15",
    startAt: Date.parse("2026-08-12T16:00:00.000Z"),
    endAt: Date.parse("2026-08-14T16:00:00.000Z"),
  });
});

test("transparent events do not block availability", () => {
  expect(mapGoogleEvent({ ...timedEvent("transparent", "Optional"), transparency: "transparent" }).blocksAvailability).toBe(false);
});

test("recurring exceptions retain stable instance identity", () => {
  expect(
    mapGoogleEvent({
      ...timedEvent("instance_1", "Changed occurrence"),
      recurringEventId: "series_1",
      originalStartTime: { dateTime: "2026-08-15T09:00:00+08:00" },
    }),
  ).toMatchObject({
    recurringEventId: "series_1",
    originalStartAt: Date.parse("2026-08-15T09:00:00+08:00"),
  });
});

test("cancelled events retain provider update metadata", () => {
  expect(mapGoogleEvent({
    id: "cancelled",
    status: "cancelled",
    etag: "\"cancelled\"",
    updated: "2026-08-13T01:00:00.000Z",
  })).toMatchObject({
    etag: "\"cancelled\"",
    updatedAt: Date.parse("2026-08-13T01:00:00.000Z"),
    blocksAvailability: false,
  });
});

test("initial full sync traverses pages with stable bounds and commits only the final token", async () => {
  const { t, userId, connectionId } = await setupConnection();
  const requests: GoogleCalendarSyncRequest[] = [];
  await runGoogleCalendarSync({
    connectionId,
    now: baseNow,
    dependencies: dependencies(t),
    listPage: async (request) => {
      requests.push(request);
      expect((await connection(t, connectionId))?.syncToken).toBeUndefined();
      return request.pageToken === undefined
        ? { items: [timedEvent("first", "First")], nextPageToken: "page_2" }
        : { items: [timedEvent("second", "Second")], nextSyncToken: "sync_final" };
    },
  });
  expect(requests).toHaveLength(2);
  const { pageToken: firstPageToken, ...firstBase } = requests[0];
  const { pageToken: secondPageToken, ...secondBase } = requests[1];
  expect(firstPageToken).toBeUndefined();
  expect(secondPageToken).toBe("page_2");
  expect(requests[0].pageSize).toBeLessThanOrEqual(20);
  expect(secondBase).toEqual(firstBase);
  expect((await connection(t, connectionId))?.syncToken).toBe("sync_final");
  expect((await eventsForOwner(t, userId)).map((row) => row.externalEventId)).toEqual(["first", "second", "first", "second"]);
});

test("incremental sync applies creates, updates, and deletions idempotently", async () => {
  const { t, userId, connectionId } = await setupConnection();
  await runGoogleCalendarSync({
    connectionId,
    now: baseNow,
    dependencies: dependencies(t),
    listPage: async () => ({ items: [timedEvent("updated", "Before"), timedEvent("deleted", "Delete")], nextSyncToken: "sync_1" }),
  });
  await runGoogleCalendarSync({
    connectionId,
    now: baseNow + 1_000,
    dependencies: dependencies(t),
    listPage: async () => ({
      items: [timedEvent("updated", "After"), { id: "deleted", status: "cancelled" }],
      nextSyncToken: "sync_2",
    }),
  });
  const rows = await eventsForOwner(t, userId);
  expect(rows).toHaveLength(2);
  expect(rows.map((row) => row.title)).toEqual(["After", "After"]);
  expect((await connection(t, connectionId))?.syncToken).toBe("sync_2");
});

test("event application remains complete across bounded workspace batches", async () => {
  const { t, userId, connectionId } = await setupConnection();
  await t.run(async (ctx) => {
    for (let index = 0; index < 19; index += 1) {
      const teamId = await ctx.db.insert("teams", {
        type: "organizational", name: `Team ${index}`, createdAt: baseNow, updatedAt: baseNow,
      });
      await ctx.db.insert("teamMemberships", { teamId, userId, role: "member", createdAt: baseNow });
    }
  });
  await runGoogleCalendarSync({
    connectionId, now: baseNow, dependencies: dependencies(t),
    listPage: async () => ({ items: [timedEvent("all_teams", "Across teams")], nextSyncToken: "sync_all" }),
  });
  expect(await eventsForOwner(t, userId)).toHaveLength(21);
});

test("page failure leaves the prior sync token unchanged", async () => {
  const { t, connectionId } = await setupConnection();
  await t.run((ctx) => ctx.db.patch(connectionId, { syncToken: "sync_previous" }));
  await expect(
    runGoogleCalendarSync({
      connectionId,
      now: baseNow,
      dependencies: dependencies(t),
      listPage: async () => {
        throw new Error("page failed");
      },
    }),
  ).rejects.toThrow("page failed");
  expect((await connection(t, connectionId))?.syncToken).toBe("sync_previous");
});

test("a dirty notification during a run forces a second incremental pass", async () => {
  const { t, connectionId } = await setupConnection();
  await t.run((ctx) => ctx.db.patch(connectionId, { syncToken: "sync_0" }));
  const tokens: Array<string | undefined> = [];
  await runGoogleCalendarSync({
    connectionId,
    now: baseNow,
    dependencies: dependencies(t),
    listPage: async (request) => {
      tokens.push(request.syncToken);
      if (tokens.length === 1) {
        await t.mutation(syncInternal.googleCalendar.syncState.markGoogleCalendarDirty, { connectionId, now: baseNow + 1 });
      }
      return { items: [], nextSyncToken: `sync_${tokens.length}` };
    },
  });
  expect(tokens).toEqual(["sync_0", "sync_1"]);
  expect((await connection(t, connectionId))?.syncToken).toBe("sync_2");
});

test("invalid tokens remove Google projections but preserve Kilobot bookings", async () => {
  const { t, userId, teamIds, connectionId } = await setupConnection();
  await t.run(async (ctx) => {
    await ctx.db.patch(connectionId, { syncToken: "expired" });
    for (const [origin, eventId] of [["google", "imported"], ["kilobot", "booking"]] as const) {
      await ctx.db.insert("calendarEvents", {
        teamId: teamIds[0], title: eventId, startAt: baseNow, endAt: baseNow + 3_600_000,
        timeZone: "UTC", status: "confirmed", createdBy: userId, externalProvider: "google",
        externalCalendarId: "primary", externalEventId: eventId, externalOwnerUserId: userId,
        externalOrigin: origin, externalStatus: "confirmed", externalTransparency: "opaque",
        externalCanEdit: true, externalOriginalStartAt: baseNow, externalSyncState: "synced",
        createdAt: baseNow, updatedAt: baseNow,
      });
    }
  });
  let calls = 0;
  await runGoogleCalendarSync({
    connectionId,
    now: baseNow,
    dependencies: dependencies(t),
    listPage: async () => {
      calls += 1;
      if (calls === 1) throw Object.assign(new Error("gone"), { kind: "invalid_sync_token" });
      return { items: [], nextSyncToken: "rebased" };
    },
  });
  expect((await eventsForOwner(t, userId)).map((row) => row.externalEventId)).toEqual(["booking"]);
  expect((await connection(t, connectionId))?.syncToken).toBe("rebased");
});

test("monthly rebase advances the rolling full-sync window", async () => {
  const { t, connectionId } = await setupConnection();
  await t.run((ctx) => ctx.db.patch(connectionId, {
    syncToken: "sync_old",
    fullSyncStartAt: Date.UTC(2026, 4, 15, 1),
    fullSyncEndAt: Date.UTC(2028, 1, 13, 1),
  }));
  let request: GoogleCalendarSyncRequest | undefined;
  await runGoogleCalendarSync({
    connectionId,
    now: Date.UTC(2026, 8, 14, 1),
    dependencies: dependencies(t),
    listPage: async (value) => {
      request = value;
      return { items: [], nextSyncToken: "sync_rebased" };
    },
  });
  expect(request).toMatchObject({ kind: "full", singleEvents: true, showDeleted: true });
  const stored = await connection(t, connectionId);
  expect(stored?.fullSyncStartAt).toBe(request?.timeMin);
  expect(stored?.fullSyncEndAt).toBe(request?.timeMax);
  expect(stored?.fullSyncEndAt).toBeGreaterThan(Date.UTC(2028, 1, 13, 1));
});
