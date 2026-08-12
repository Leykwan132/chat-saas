/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import type { FunctionReference } from "convex/server";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import type { GoogleCalendarEvent } from "./googleCalendar/eventMapping";
import { runGoogleCalendarSync, type GoogleCalendarSyncDependencies } from "./googleCalendar/syncWorker";
import { createUserAcrossTwoTeams, reserveConnection } from "./googleCalendar/testFixtures";
import { googleCalendarWriteTestDependencies } from "./googleCalendar/writeTestDependencies";
import {
  deriveGoogleCalendarEventId,
  runCreateGoogleCalendarEvent,
  runUpdateGoogleCalendarEvent,
} from "./googleCalendar/writeActions";
import { fingerprintGoogleCalendarWritePayload } from "./googleCalendar/writeFingerprint";
import type { GoogleCalendarWriteInput } from "./googleCalendar/writeTypes";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
type CalendarTest = TestConvex<typeof schema>;
type MutationRef = FunctionReference<"mutation", "internal", Record<string, unknown>, unknown>;
type QueryRef = FunctionReference<"query", "internal", Record<string, unknown>, unknown>;
const googleInternal = internal as unknown as {
  googleCalendar: {
    eventStore: { applyPage: MutationRef };
    syncRecovery: { recoverInvalidSyncToken: MutationRef; reconcileFullSync: MutationRef };
    syncState: {
      beginSyncRun: MutationRef; failSyncRun: MutationRef; finalizeSyncRun: MutationRef;
      getConnectionForSync: QueryRef; renewSyncRunLease: MutationRef;
    };
  };
};
const now = Date.UTC(2026, 7, 13, 8);
const eventInput: GoogleCalendarWriteInput = {
  summary: "Customer appointment",
  start: { dateTime: "2026-08-15T09:00:00+08:00", timeZone: "Asia/Kuala_Lumpur" },
  end: { dateTime: "2026-08-15T10:00:00+08:00", timeZone: "Asia/Kuala_Lumpur" },
};

function providerEvent(
  id: string,
  etag: string,
  operationKey?: string,
  payloadFingerprint?: string,
): GoogleCalendarEvent {
  return {
    id, status: "confirmed", summary: eventInput.summary, etag,
    updated: "2026-08-13T08:00:00.000Z", transparency: "opaque",
    organizer: { self: true }, start: eventInput.start, end: eventInput.end,
    extendedProperties: operationKey === undefined
      ? undefined
      : { private: {
          kilobotOperationKey: operationKey,
          kilobotOperationFingerprint: payloadFingerprint,
        } },
  };
}

async function setupEvent(external = false) {
  const t = convexTest(schema, modules);
  const { userId, teamIds } = await createUserAcrossTwoTeams(t);
  const connectionId = await reserveConnection(t, userId);
  const calendarEventId = await t.run((ctx) => ctx.db.insert("calendarEvents", {
    teamId: teamIds[0], title: "Before", startAt: now + 86_400_000,
    endAt: now + 90_000_000, timeZone: "Asia/Kuala_Lumpur", status: "confirmed",
    createdBy: userId, externalProvider: "google", externalCalendarId: "primary",
    externalOwnerUserId: userId, externalOrigin: "kilobot", externalStatus: "confirmed",
    externalTransparency: "opaque", externalCanEdit: true,
    externalSyncState: external ? "synced" : "pending",
    externalEventId: external ? "existing_event" : undefined,
    externalEtag: external ? '"etag_n"' : undefined,
    createdAt: now, updatedAt: now,
  }));
  return { t, connectionId, calendarEventId };
}

function dependencies(
  t: CalendarTest,
  fetchImplementation: typeof fetch,
  clock: () => number = () => now,
) {
  return googleCalendarWriteTestDependencies(t, fetchImplementation, clock);
}

function syncDependencies(t: CalendarTest): GoogleCalendarSyncDependencies {
  const value = googleInternal.googleCalendar;
  return {
    getConnection: (args) => t.query(value.syncState.getConnectionForSync, args) as never,
    beginRun: (args) => t.mutation(value.syncState.beginSyncRun, args) as never,
    renewRun: (args) => t.mutation(value.syncState.renewSyncRunLease, args) as never,
    applyPage: (args) => t.mutation(value.eventStore.applyPage, args) as never,
    finalizeRun: (args) => t.mutation(value.syncState.finalizeSyncRun, args) as never,
    failRun: (args) => t.mutation(value.syncState.failSyncRun, args) as never,
    recoverInvalidToken: (args) => t.mutation(value.syncRecovery.recoverInvalidSyncToken, args) as never,
    reconcileFullRun: (args) => t.mutation(value.syncRecovery.reconcileFullSync, args) as never,
  };
}

test("an identical create retry keeps its original null precondition after finalization", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent();
  const operationKey = "fix2:create:finalized";
  let providerCalls = 0;
  const write = dependencies(t, async (_request, init) => {
    providerCalls += 1;
    const body = JSON.parse(String(init?.body)) as { id: string };
    return Response.json(providerEvent(body.id, '"created"', operationKey));
  });
  const args = { connectionId, calendarEventId, operationKey, event: eventInput, now };
  expect(await runCreateGoogleCalendarEvent(args, write)).toMatchObject({ kind: "success" });
  expect(await t.run((ctx) => ctx.db.query("googleCalendarWriteOperations")
    .withIndex("by_operationKey", (q) => q.eq("operationKey", operationKey)).unique()))
    .toMatchObject({ intendedEtag: null, payloadPreconditionEtag: null });
  expect(await runCreateGoogleCalendarEvent({ ...args, now: now + 1 }, write)).toMatchObject({ kind: "success" });
  expect(providerCalls).toBe(1);
});

test("an identical create retry succeeds after sync reconciles interrupted finalization", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent();
  const operationKey = "fix2:create:reconciled";
  let created: GoogleCalendarEvent | undefined;
  const write = dependencies(t, async (_request, init) => {
    const body = JSON.parse(String(init?.body)) as {
      id: string; extendedProperties: { private: { kilobotOperationFingerprint: string } };
    };
    created = providerEvent(
      body.id, '"created"', operationKey,
      body.extendedProperties.private.kilobotOperationFingerprint,
    );
    return Response.json(created);
  });
  write.finalizeEvent = async () => { throw new Error("interrupted"); };
  const args = { connectionId, calendarEventId, operationKey, event: eventInput, now };
  expect(await runCreateGoogleCalendarEvent(args, write)).toMatchObject({ kind: "retryable" });
  await runGoogleCalendarSync({
    connectionId, now: now + 1, dependencies: syncDependencies(t),
    listPage: async () => ({ items: [created!], nextSyncToken: "fix2_sync" }),
  });
  let retryProviderCalls = 0;
  expect(await runCreateGoogleCalendarEvent(
    { ...args, now: now + 2 },
    dependencies(t, async () => { retryProviderCalls += 1; return Response.json({}); }),
  )).toMatchObject({ kind: "success" });
  expect(retryProviderCalls).toBe(0);
});

test("an update retry after the lease expires cannot overlap a held provider PATCH", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent(true);
  let releasePatch: (() => void) | undefined;
  let signalPatch: (() => void) | undefined;
  const patchStarted = new Promise<void>((resolve) => { signalPatch = resolve; });
  const patchRelease = new Promise<void>((resolve) => { releasePatch = resolve; });
  let patchCalls = 0;
  let currentTime = now;
  const write = dependencies(t, async (_request, init) => {
    if (init?.method === "GET") return Response.json(providerEvent("existing_event", '"etag_n"'));
    patchCalls += 1;
    if (patchCalls === 1) {
      signalPatch!();
      await patchRelease;
    }
    return Response.json(providerEvent("existing_event", '"etag_n1"'));
  }, () => currentTime);
  const args = { connectionId, calendarEventId, operationKey: "fix2:update:overlap", event: eventInput, now };
  const first = runUpdateGoogleCalendarEvent(args, write);
  await patchStarted;
  currentTime = now + 60_001;
  const retry = await runUpdateGoogleCalendarEvent({ ...args, now: now + 60_001 }, write);
  expect(retry).toMatchObject({ kind: "retryable" });
  expect(patchCalls).toBe(1);
  releasePatch!();
  expect(await first).toMatchObject({ kind: "success" });
  expect(await t.run((ctx) => ctx.db.get(calendarEventId))).toMatchObject({ externalEtag: '"etag_n1"' });
  expect(await t.run((ctx) => ctx.db.query("googleCalendarWriteOperations")
    .withIndex("by_operationKey", (q) => q.eq("operationKey", args.operationKey)).unique()))
    .toMatchObject({ attemptCount: 1, attemptGeneration: 1, state: "succeeded" });
});

test("retry recovers a provider-applied update without issuing another PATCH", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent(true);
  const operationKey = "fix3:update:recovery";
  let current = providerEvent("existing_event", '"etag_n"');
  let patchCalls = 0;
  const firstWrite = dependencies(t, async (_request, init) => {
    if (init?.method === "GET") return Response.json(current);
    patchCalls += 1;
    const body = JSON.parse(String(init?.body)) as {
      extendedProperties: { private: { kilobotOperationFingerprint: string } };
    };
    current = providerEvent(
      "existing_event", '"etag_n1"', operationKey,
      body.extendedProperties.private.kilobotOperationFingerprint,
    );
    return Response.json(current);
  });
  firstWrite.finalizeEvent = async () => { throw new Error("interrupted"); };
  const args = { connectionId, calendarEventId, operationKey, event: eventInput, now };
  expect(await runUpdateGoogleCalendarEvent(args, firstWrite)).toMatchObject({ kind: "retryable" });
  expect(await runUpdateGoogleCalendarEvent(
    { ...args, now: now + 60_001 },
    dependencies(t, async () => Response.json(current), () => now + 60_001),
  )).toMatchObject({ kind: "success" });
  expect(patchCalls).toBe(1);
  expect(await t.run((ctx) => ctx.db.get(calendarEventId))).toMatchObject({ externalEtag: '"etag_n1"' });
});

test("version 1 terminal success remains retryable as its stored result", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent();
  const operationKey = "fix3:v1:succeeded";
  const externalEventId = await deriveGoogleCalendarEventId(operationKey);
  await t.run(async (ctx) => {
    await ctx.db.patch(calendarEventId, { externalEventId, externalEtag: '"created"' });
    await ctx.db.insert("googleCalendarWriteOperations", {
      connectionId, calendarEventId, operationKey, action: "create", state: "succeeded",
      externalEventId, payloadBindingVersion: 1, payloadFingerprint: "v1-bound",
      payloadPreconditionEtag: null, intendedEtag: null, attemptCount: 1,
      createdAt: now, updatedAt: now,
    });
  });
  let providerCalls = 0;
  expect(await runCreateGoogleCalendarEvent(
    { connectionId, calendarEventId, operationKey, event: eventInput, now },
    dependencies(t, async () => { providerCalls += 1; return Response.json({}); }),
  )).toMatchObject({ kind: "success", externalEventId });
  expect(providerCalls).toBe(0);
});

test.each([undefined, 3])(
  "terminal payload binding version %s fails before provider access",
  async (payloadBindingVersion) => {
    const { t, connectionId, calendarEventId } = await setupEvent();
    const operationKey = `fix4:legacy:${String(payloadBindingVersion)}`;
    const externalEventId = await deriveGoogleCalendarEventId(operationKey);
    await t.run(async (ctx) => {
      await ctx.db.patch(calendarEventId, { externalEventId, externalEtag: '"created"' });
      await ctx.db.insert("googleCalendarWriteOperations", {
        connectionId, calendarEventId, operationKey, action: "create", state: "succeeded",
        externalEventId, payloadBindingVersion, payloadFingerprint: "legacy-bound",
        payloadPreconditionEtag: null, intendedEtag: null, attemptCount: 1,
        createdAt: now, updatedAt: now,
      });
    });
    let providerCalls = 0;
    expect(await runCreateGoogleCalendarEvent(
      { connectionId, calendarEventId, operationKey, event: eventInput, now },
      dependencies(t, async () => { providerCalls += 1; return Response.json({}); }),
    )).toMatchObject({ kind: "invalid_request" });
    expect(providerCalls).toBe(0);
  },
);

test("version 1 nonterminal operations fail before provider access", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent();
  const operationKey = "fix3:v1:pending";
  const externalEventId = await deriveGoogleCalendarEventId(operationKey);
  const payloadFingerprint = await fingerprintGoogleCalendarWritePayload({
    action: "create", connectionId, calendarEventId, externalEventId,
    payloadPreconditionEtag: null, event: eventInput,
  });
  await t.run((ctx) => ctx.db.insert("googleCalendarWriteOperations", {
    connectionId, calendarEventId, operationKey, action: "create", state: "pending",
    externalEventId, payloadBindingVersion: 1, payloadFingerprint,
    payloadPreconditionEtag: null, intendedEtag: null, attemptCount: 0,
    createdAt: now, updatedAt: now,
  }));
  let providerCalls = 0;
  expect(await runCreateGoogleCalendarEvent(
    { connectionId, calendarEventId, operationKey, event: eventInput, now },
    dependencies(t, async () => { providerCalls += 1; return Response.json({}); }),
  )).toMatchObject({ kind: "invalid_request" });
  expect(providerCalls).toBe(0);
});

test("an expired update attempt lease can be taken over", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent(true);
  const write = dependencies(t, async () => Response.json({}));
  const prepared = await write.prepare({
    connectionId, calendarEventId, operationKey: "fix2:update:lease",
    action: "update", now,
  });
  if (prepared.kind === "error") throw new Error("prepare failed");
  const payloadFingerprint = await fingerprintGoogleCalendarWritePayload({
    action: "update", connectionId, calendarEventId,
    externalEventId: prepared.externalEventId,
    payloadPreconditionEtag: prepared.payloadPreconditionEtag,
    event: eventInput,
  });
  expect(await write.beginAttempt({ operationId: prepared.operationId, payloadFingerprint, now }))
    .toMatchObject({ kind: "ready", attemptGeneration: 1 });
  expect(await write.beginAttempt({ operationId: prepared.operationId, payloadFingerprint, now: now + 1 }))
    .toMatchObject({ kind: "running" });
  expect(await write.beginAttempt({ operationId: prepared.operationId, payloadFingerprint, now: now + 60_001 }))
    .toMatchObject({ kind: "ready", attemptGeneration: 2 });
});
