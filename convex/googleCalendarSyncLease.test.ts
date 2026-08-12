/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import type { FunctionReference } from "convex/server";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { runGoogleCalendarSync, type GoogleCalendarSyncDependencies } from "./googleCalendar/syncWorker";
import { createUserAcrossTwoTeams, reserveConnection } from "./googleCalendar/testFixtures";
import schema from "./schema";

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
      renewSyncRunLease: InternalMutation;
    };
  };
}).googleCalendar;

const baseNow = Date.UTC(2026, 7, 13, 1);
const minute = 60_000;

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
  } as GoogleCalendarSyncDependencies;
}

async function insertGoogleRows(
  t: CalendarTest,
  userId: Id<"users">,
  teamId: Id<"teams">,
  count: number,
) {
  await t.run(async (ctx) => {
    for (let index = 0; index < count; index += 1) {
      await ctx.db.insert("calendarEvents", {
        teamId,
        title: `Imported ${index}`,
        startAt: baseNow + index,
        endAt: baseNow + 3_600_000 + index,
        timeZone: "UTC",
        status: "confirmed",
        createdBy: userId,
        externalProvider: "google",
        externalCalendarId: "primary",
        externalEventId: `imported_${index}`,
        externalOwnerUserId: userId,
        externalOrigin: "google",
        externalStatus: "confirmed",
        externalTransparency: "opaque",
        externalCanEdit: false,
        externalSyncState: "synced",
        createdAt: baseNow,
        updatedAt: baseNow,
      });
    }
  });
}

test("a run lasting over five minutes is not stolen after periodic page progress", async () => {
  const { t, connectionId } = await setup();
  const deps = dependencies(t);
  let currentTime = baseNow;
  let pageCalls = 0;
  let competingStart: Awaited<ReturnType<typeof deps.beginRun>> | undefined;
  const result = await runGoogleCalendarSync({
    connectionId,
    now: () => currentTime,
    dependencies: deps,
    listPage: async (request) => {
      pageCalls += 1;
      if (pageCalls === 1) {
        currentTime = baseNow + 4 * minute;
        return { items: [], nextPageToken: "page_2" };
      }
      if (pageCalls === 2) {
        currentTime = baseNow + 8 * minute;
        competingStart = await deps.beginRun({
          connectionId,
          requestKind: request.kind,
          fullSyncStartAt: request.timeMin,
          fullSyncEndAt: request.timeMax,
          now: currentTime,
        });
      }
      return { items: [], nextSyncToken: `sync_${pageCalls}` };
    },
  });
  expect(competingStart).toEqual({ kind: "already_running" });
  expect(result.kind).toBe("completed");
  expect((await t.run((ctx) => ctx.db.get(connectionId)))?.lastSuccessfulSyncAt).toBe(baseNow + 8 * minute);
});

test("stale takeover installs one successor and displaced transitions cannot clobber it", async () => {
  const { t, connectionId } = await setup();
  await t.run((ctx) => ctx.db.patch(connectionId, { syncToken: "committed_token" }));
  const deps = dependencies(t);
  const first = await deps.beginRun({
    connectionId,
    requestKind: "full",
    fullSyncStartAt: baseNow,
    fullSyncEndAt: baseNow + 86_400_000,
    now: baseNow,
  });
  expect(first.kind).toBe("started");
  if (first.kind !== "started") throw new Error("Expected first owner run");
  const second = await deps.beginRun({
    connectionId,
    requestKind: "incremental",
    now: baseNow + 6 * minute,
  });
  expect(second.kind).toBe("started");
  if (second.kind !== "started") throw new Error("Expected successor owner run");
  expect(await deps.failRun({
    connectionId,
    runId: first.runId,
    errorKind: "needs_reauthorization",
    now: baseNow + 7 * minute,
  })).toEqual({ kind: "lost" });
  expect(await deps.finalizeRun({
    connectionId,
    runId: first.runId,
    syncToken: "stale_token",
    now: baseNow + 7 * minute,
  })).toEqual({ kind: "lost" });
  expect(await deps.applyPage({
    connectionId,
    runId: first.runId,
    events: [],
    now: baseNow + 7 * minute,
  })).toEqual({ kind: "lost" });
  expect(await deps.reconcileFullRun({
    connectionId,
    runId: first.runId,
    now: baseNow + 7 * minute,
  })).toEqual({ kind: "lost" });
  const stored = await t.run((ctx) => ctx.db.get(connectionId));
  expect(stored).toMatchObject({
    state: "syncing",
    activeSyncRunId: second.runId,
  });
  expect(stored?.syncToken).toBe("committed_token");
  expect(stored?.lastErrorKind).toBeUndefined();
});

test("reconciliation and invalid-token cleanup renew their leases across batches", async () => {
  for (const recovery of [false, true]) {
    const { t, userId, teamIds, connectionId } = await setup();
    await insertGoogleRows(t, userId, teamIds[0], 41);
    const deps = dependencies(t);
    const started = await deps.beginRun({
      connectionId,
      requestKind: recovery ? "incremental" : "full",
      fullSyncStartAt: recovery ? undefined : baseNow,
      fullSyncEndAt: recovery ? undefined : baseNow + 86_400_000,
      now: baseNow,
    });
    if (started.kind !== "started") throw new Error("Expected owner run");
    const progress = recovery
      ? await deps.recoverInvalidToken({
          connectionId,
          runId: started.runId,
          now: baseNow + 4 * minute,
        })
      : await deps.reconcileFullRun({
          connectionId,
          runId: started.runId,
          now: baseNow + 4 * minute,
        });
    expect(progress).toMatchObject({ kind: "progress", complete: false });
    expect((await t.run((ctx) => ctx.db.get(started.runId)))?.updatedAt).toBe(baseNow + 4 * minute);
    expect(await deps.beginRun({
      connectionId,
      requestKind: "full",
      fullSyncStartAt: baseNow,
      fullSyncEndAt: baseNow + 86_400_000,
      now: baseNow + 8 * minute,
    })).toEqual({ kind: "already_running" });
  }
});
