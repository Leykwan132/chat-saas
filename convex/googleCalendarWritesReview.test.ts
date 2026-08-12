/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import type { FunctionReference } from "convex/server";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import type { GoogleCalendarEvent } from "./googleCalendar/eventMapping";
import { runGoogleCalendarSync, type GoogleCalendarSyncDependencies } from "./googleCalendar/syncWorker";
import { createUserAcrossTwoTeams, reserveConnection } from "./googleCalendar/testFixtures";
import {
  deriveGoogleCalendarEventId,
  runCreateGoogleCalendarEvent,
  runDeleteGoogleCalendarEvent,
  runUpdateGoogleCalendarEvent,
  type GoogleCalendarWriteDependencies,
} from "./googleCalendar/writeActions";
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
    writeStore: {
      prepare: MutationRef; beginAttempt: MutationRef;
    };
    writeAttemptLeaseStore: { renewAttemptLease: MutationRef; deferMutationRecovery: MutationRef };
    writeFinalizationStore: {
      finalizeEvent: MutationRef; establishDeletePrecondition: MutationRef;
      finalizeDelete: MutationRef; recordOutcome: MutationRef;
    };
  };
};
const now = Date.UTC(2026, 7, 13, 8);
const eventInput = {
  summary: "Customer appointment",
  start: { dateTime: "2026-08-15T09:00:00+08:00", timeZone: "Asia/Kuala_Lumpur" },
  end: { dateTime: "2026-08-15T10:00:00+08:00", timeZone: "Asia/Kuala_Lumpur" },
  attendees: [{ email: "customer@example.com", displayName: "Customer" }],
};

function providerEvent(id: string, title: string, etag: string, operationKey?: string): GoogleCalendarEvent {
  return {
    id, status: "confirmed", summary: title, etag, updated: "2026-08-13T08:00:00.000Z",
    transparency: "opaque", organizer: { self: true }, start: eventInput.start, end: eventInput.end,
    extendedProperties: operationKey === undefined ? undefined : { private: { kilobotOperationKey: operationKey } },
  };
}

async function setupEvent(external = false) {
  const t = convexTest(schema, modules);
  const { userId, teamIds } = await createUserAcrossTwoTeams(t);
  const connectionId = await reserveConnection(t, userId);
  const calendarEventId = await t.run((ctx) => ctx.db.insert("calendarEvents", {
    teamId: teamIds[0], title: "Before", startAt: now + 86_400_000, endAt: now + 90_000_000,
    timeZone: "Asia/Kuala_Lumpur", status: "confirmed", createdBy: userId,
    externalProvider: "google", externalCalendarId: "primary", externalOwnerUserId: userId,
    externalOrigin: "kilobot", externalStatus: "confirmed", externalTransparency: "opaque",
    externalCanEdit: true, externalSyncState: external ? "synced" : "pending",
    externalEventId: external ? "existing_event" : undefined,
    externalEtag: external ? '"etag_n"' : undefined,
    createdAt: now, updatedAt: now,
  }));
  return { t, userId, teamIds, connectionId, calendarEventId };
}

function dependencies(t: CalendarTest, fetchImplementation: typeof fetch): GoogleCalendarWriteDependencies {
  const store = googleInternal.googleCalendar.writeStore;
  const leaseStore = googleInternal.googleCalendar.writeAttemptLeaseStore;
  const finalization = googleInternal.googleCalendar.writeFinalizationStore;
  return {
    prepare: (args) => t.mutation(store.prepare, args) as never,
    beginAttempt: (args) => t.mutation(store.beginAttempt, args) as never,
    renewAttemptLease: (args) => t.mutation(leaseStore.renewAttemptLease, args) as never,
    deferMutationRecovery: (args) => t.mutation(leaseStore.deferMutationRecovery, args) as never,
    finalizeEvent: (args) => t.mutation(finalization.finalizeEvent, args) as never,
    establishDeletePrecondition: (args) => t.mutation(finalization.establishDeletePrecondition, args) as never,
    finalizeDelete: (args) => t.mutation(finalization.finalizeDelete, args) as never,
    recordOutcome: (args) => t.mutation(finalization.recordOutcome, args) as never,
    getCredential: async () => ({ kind: "active", token: "secret", expiresAt: null }),
    refresh: async () => undefined,
    clock: () => now,
    fetchImplementation,
  };
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

test("a create operation key cannot be reused for a different semantic payload", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent();
  const operationKey = "payload:create";
  let providerCalls = 0;
  const write = dependencies(t, async (_request, init) => {
    providerCalls += 1;
    const body = JSON.parse(String(init?.body)) as { id: string; summary: string };
    return Response.json(providerEvent(body.id, body.summary, '"created"', operationKey));
  });
  expect(await runCreateGoogleCalendarEvent(
    { connectionId, calendarEventId, operationKey, event: eventInput, now }, write,
  )).toMatchObject({ kind: "success" });
  expect(await runCreateGoogleCalendarEvent(
    { connectionId, calendarEventId, operationKey, event: { ...eventInput, summary: "Different" }, now: now + 1 }, write,
  )).toMatchObject({ kind: "invalid_request" });
  expect(providerCalls).toBe(1);
});

test("an update operation key cannot be reused for different attendees or title", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent(true);
  const operationKey = "payload:update";
  let version = 0;
  const write = dependencies(t, async (_request, init) => {
    if (init?.method === "GET") return Response.json(providerEvent("existing_event", "Before", version === 0 ? '"etag_n"' : '"etag_n1"'));
    version += 1;
    return Response.json(providerEvent("existing_event", eventInput.summary, '"etag_n1"'));
  });
  expect(await runUpdateGoogleCalendarEvent(
    { connectionId, calendarEventId, operationKey, event: eventInput, now }, write,
  )).toMatchObject({ kind: "success" });
  const changed = { ...eventInput, summary: "Different", attendees: [{ email: "other@example.com" }] };
  expect(await runUpdateGoogleCalendarEvent(
    { connectionId, calendarEventId, operationKey, event: changed, now: now + 1 }, write,
  )).toMatchObject({ kind: "invalid_request" });
  expect(version).toBe(1);
});

test("a concurrent retry cannot overtake a provider mutation or poison health", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent();
  const operationKey = "concurrent:create";
  let releaseSlow: (() => void) | undefined;
  let signalSlow: (() => void) | undefined;
  const slowStarted = new Promise<void>((resolve) => { signalSlow = resolve; });
  const slowRelease = new Promise<void>((resolve) => { releaseSlow = resolve; });
  const slow = dependencies(t, async () => {
    signalSlow!();
    await slowRelease;
    return new Response(null, { status: 500 });
  });
  const args = { connectionId, calendarEventId, operationKey, event: eventInput, now };
  const slowResult = runCreateGoogleCalendarEvent(args, slow);
  await slowStarted;
  const fastResult = await runCreateGoogleCalendarEvent(
    { ...args, now: now + 1 },
    dependencies(t, async (_request, init) => {
      const body = JSON.parse(String(init?.body)) as { id: string };
      return Response.json(providerEvent(body.id, eventInput.summary, '"created"', operationKey));
    }),
  );
  releaseSlow!();
  expect(await slowResult).toMatchObject({ kind: "retryable" });
  expect(fastResult).toMatchObject({ kind: "retryable" });
  const operation = await t.run((ctx) => ctx.db.query("googleCalendarWriteOperations")
    .withIndex("by_operationKey", (q) => q.eq("operationKey", operationKey)).unique());
  expect(operation).toMatchObject({ state: "pending", attemptCount: 1 });
  expect((await t.run((ctx) => ctx.db.get(connectionId)))?.lastErrorKind).toBeUndefined();
});

test("update finalization preserves a newer sync version", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent(true);
  const write = dependencies(t, async (_request, init) => {
    if (init?.method === "GET") return Response.json(providerEvent("existing_event", "Before", '"etag_n"'));
    await t.run((ctx) => ctx.db.patch(calendarEventId, {
      title: "Provider N+2", externalEtag: '"etag_n2"', externalUpdatedAt: now + 2,
    }));
    return Response.json(providerEvent("existing_event", "Intended N+1", '"etag_n1"'));
  });
  expect(await runUpdateGoogleCalendarEvent(
    { connectionId, calendarEventId, operationKey: "race:update", event: eventInput, now }, write,
  )).toMatchObject({ kind: "conflict" });
  expect(await t.run((ctx) => ctx.db.get(calendarEventId))).toMatchObject({
    title: "Provider N+2", externalEtag: '"etag_n2"', externalUpdatedAt: now + 2,
  });
});

test("a missing delete ETag is established before exactly one conditional delete", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent(true);
  await t.run((ctx) => ctx.db.patch(calendarEventId, { externalEtag: undefined }));
  const requests: Request[] = [];
  const result = await runDeleteGoogleCalendarEvent(
    { connectionId, calendarEventId, operationKey: "missing-etag:delete", now },
    dependencies(t, async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      if (request.method === "GET") return Response.json(providerEvent("existing_event", "Before", '"provider_n"'));
      return request.headers.get("If-Match") === '"provider_n"'
        ? new Response(null, { status: 204 })
        : new Response(null, { status: 428 });
    }),
  );
  expect(result).toMatchObject({ kind: "success" });
  expect(requests.map((request) => request.method)).toEqual(["GET", "DELETE"]);
});

test("a missing delete ETag conflicts if local provider state changes after the fetch", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent(true);
  await t.run((ctx) => ctx.db.patch(calendarEventId, { externalEtag: undefined }));
  let deleteCalls = 0;
  const write = dependencies(t, async (_input, init) => {
    if (init?.method === "GET") {
      await t.run((ctx) => ctx.db.patch(calendarEventId, { title: "Provider changed", externalEtag: '"provider_n1"' }));
      return Response.json(providerEvent("existing_event", "Before", '"provider_n"'));
    }
    deleteCalls += 1;
    return new Response(null, { status: 204 });
  });
  expect(await runDeleteGoogleCalendarEvent(
    { connectionId, calendarEventId, operationKey: "missing-etag:race", now }, write,
  )).toMatchObject({ kind: "conflict" });
  expect(deleteCalls).toBe(0);
  expect((await t.run((ctx) => ctx.db.get(calendarEventId)))?.title).toBe("Provider changed");
});

test("sync does not reconcile an operation after its local event link changes", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent();
  const operationKey = "identity:create";
  let created: GoogleCalendarEvent | undefined;
  const write = dependencies(t, async (_request, init) => {
    const body = JSON.parse(String(init?.body)) as { id: string };
    created = providerEvent(body.id, eventInput.summary, '"created"', operationKey);
    return Response.json(created);
  });
  write.finalizeEvent = async () => { throw new Error("interrupted"); };
  await runCreateGoogleCalendarEvent(
    { connectionId, calendarEventId, operationKey, event: eventInput, now }, write,
  );
  await t.run((ctx) => ctx.db.patch(calendarEventId, { externalOperationKey: "another-operation" }));
  await runGoogleCalendarSync({
    connectionId, now: now + 1, dependencies: syncDependencies(t),
    listPage: async () => ({ items: [created!], nextSyncToken: "identity_sync" }),
  });
  const operation = await t.run((ctx) => ctx.db.query("googleCalendarWriteOperations")
    .withIndex("by_operationKey", (q) => q.eq("operationKey", operationKey)).unique());
  expect(operation?.state).not.toBe("succeeded");
  expect((await t.run((ctx) => ctx.db.get(calendarEventId)))?.externalOperationKey).toBe("another-operation");
});

test("legacy unbound operation rows fail before provider access", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent();
  const operationKey = "legacy:create";
  const externalEventId = await deriveGoogleCalendarEventId(operationKey);
  await t.run((ctx) => ctx.db.insert("googleCalendarWriteOperations", {
    connectionId, calendarEventId, operationKey, action: "create", state: "pending",
    externalEventId, attemptCount: 0, createdAt: now, updatedAt: now,
  }));
  let providerCalls = 0;
  const result = await runCreateGoogleCalendarEvent(
    { connectionId, calendarEventId, operationKey, event: eventInput, now },
    dependencies(t, async () => { providerCalls += 1; return Response.json({}); }),
  );
  expect(result).toMatchObject({ kind: "invalid_request" });
  expect(providerCalls).toBe(0);
});
