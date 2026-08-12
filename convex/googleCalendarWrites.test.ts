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
  runDeleteGoogleCalendarEvent,
  runUpdateGoogleCalendarEvent,
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
  };
};
const now = Date.UTC(2026, 7, 13, 8);
const input = {
  summary: "Customer appointment",
  start: { dateTime: "2026-08-15T09:00:00+08:00", timeZone: "Asia/Kuala_Lumpur" },
  end: { dateTime: "2026-08-15T10:00:00+08:00", timeZone: "Asia/Kuala_Lumpur" },
};

function providerEvent(
  id: string, title = input.summary, etag = '"etag_1"',
  operationKey?: string, payloadFingerprint?: string,
): GoogleCalendarEvent {
  return {
    id, status: "confirmed", summary: title, etag, updated: "2026-08-13T08:00:00.000Z",
    transparency: "opaque", organizer: { self: true }, start: input.start, end: input.end,
    extendedProperties: operationKey === undefined ? undefined : { private: {
      kilobotOperationKey: operationKey, kilobotOperationFingerprint: payloadFingerprint,
    } },
  };
}

async function setupLocalEvent(options?: { external?: boolean }) {
  const t = convexTest(schema, modules);
  const { userId, teamIds } = await createUserAcrossTwoTeams(t);
  const connectionId = await reserveConnection(t, userId);
  const calendarEventId = await t.run((ctx) => ctx.db.insert("calendarEvents", {
    teamId: teamIds[0], title: "Before", startAt: now + 86_400_000, endAt: now + 90_000_000,
    timeZone: "Asia/Kuala_Lumpur", status: "confirmed", createdBy: userId,
    externalProvider: "google", externalCalendarId: "primary", externalOwnerUserId: userId,
    externalOrigin: "kilobot", externalStatus: "confirmed", externalTransparency: "opaque",
    externalCanEdit: true, externalSyncState: options?.external ? "synced" : "pending",
    externalEventId: options?.external ? "existing_event" : undefined,
    externalEtag: options?.external ? '"etag_1"' : undefined,
    createdAt: now, updatedAt: now,
  }));
  return { t, userId, teamIds, connectionId, calendarEventId };
}

const writeDependencies = (t: CalendarTest, provider: typeof fetch) =>
  googleCalendarWriteTestDependencies(t, provider, () => now);

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

test("derives the documented base32hex SHA-256 Google event ID", async () => {
  expect(await deriveGoogleCalendarEventId("booking:123:create")).toBe(
    "1lmoovhh35sm7duukv2ccd8gakl3f4nntafm437iho3tdogvirog",
  );
});

test("finalizes all-day provider responses in the connection time zone", async () => {
  const { t, connectionId, calendarEventId } = await setupLocalEvent();
  const operationKey = "booking:all-day:create";
  const result = await runCreateGoogleCalendarEvent(
    {
      connectionId,
      calendarEventId,
      operationKey,
      event: { summary: "Holiday", start: { date: "2026-08-15" }, end: { date: "2026-08-16" } },
      now,
    },
    writeDependencies(t, async (_request, init) => {
      const body = JSON.parse(String(init?.body)) as { id: string };
      return Response.json({
        id: body.id,
        status: "confirmed",
        summary: "Holiday",
        organizer: { self: true },
        start: { date: "2026-08-15" },
        end: { date: "2026-08-16" },
        extendedProperties: { private: { kilobotOperationKey: operationKey } },
      });
    }),
  );
  expect(result).toMatchObject({ kind: "success" });
  expect(await t.run((ctx) => ctx.db.get(calendarEventId))).toMatchObject({
    allDay: true,
    startAt: Date.parse("2026-08-14T16:00:00.000Z"),
    endAt: Date.parse("2026-08-15T16:00:00.000Z"),
  });
});

test("concurrent retried creates reserve once and address the same provider event", async () => {
  const { t, connectionId, calendarEventId } = await setupLocalEvent();
  const insertIds: string[] = [];
  const fetchImplementation: typeof fetch = async (request, init) => {
    const body = JSON.parse(String(init?.body)) as { id: string; extendedProperties: { private: { kilobotOperationKey: string } } };
    insertIds.push(body.id);
    return Response.json(providerEvent(body.id, input.summary, '"etag_1"', body.extendedProperties.private.kilobotOperationKey));
  };
  const args = { connectionId, calendarEventId, operationKey: "booking:123:create", event: input, now };
  const [first, retry] = await Promise.all([
    runCreateGoogleCalendarEvent(args, writeDependencies(t, fetchImplementation)),
    runCreateGoogleCalendarEvent(args, writeDependencies(t, fetchImplementation)),
  ]);
  expect(first).toEqual(retry);
  expect(first).toMatchObject({ kind: "success", externalEventId: insertIds[0] });
  expect(insertIds.length).toBeGreaterThanOrEqual(1);
  expect(new Set(insertIds)).toEqual(new Set([insertIds[0]]));
  expect(await t.run((ctx) => ctx.db.query("googleCalendarWriteOperations").withIndex("by_operationKey", (q) => q.eq("operationKey", args.operationKey)).take(2))).toHaveLength(1);
});

test("reusing an operation key for another action is rejected before provider access", async () => {
  const { t, connectionId, calendarEventId } = await setupLocalEvent();
  await runCreateGoogleCalendarEvent(
    { connectionId, calendarEventId, operationKey: "stable-key", event: input, now },
    writeDependencies(t, async (_request, init) => {
      const body = JSON.parse(String(init?.body)) as { id: string };
      return Response.json(providerEvent(body.id, input.summary, '"etag"', "stable-key"));
    }),
  );
  let providerCalls = 0;
  const provider: typeof fetch = async () => {
    providerCalls += 1;
    return Response.json({});
  };
  const result = await runUpdateGoogleCalendarEvent(
    { connectionId, calendarEventId, operationKey: "stable-key", event: input, now: now + 1 },
    writeDependencies(t, provider),
  );
  expect(result).toMatchObject({ kind: "invalid_request" });
  expect(providerCalls).toBe(0);
});

test("provider create success remains ambiguous until later sync reconciles the operation key", async () => {
  const { t, userId, connectionId, calendarEventId } = await setupLocalEvent();
  const operationKey = "booking:ambiguous:create";
  let created: GoogleCalendarEvent | undefined;
  const dependencies = writeDependencies(t, async (_request, init) => {
    const body = JSON.parse(String(init?.body)) as {
      id: string; extendedProperties: { private: { kilobotOperationFingerprint: string } };
    };
    created = providerEvent(
      body.id, input.summary, '"created"', operationKey,
      body.extendedProperties.private.kilobotOperationFingerprint,
    );
    return Response.json(created);
  });
  dependencies.finalizeEvent = async () => { throw new Error("interrupted finalize"); };
  expect(await runCreateGoogleCalendarEvent(
    { connectionId, calendarEventId, operationKey, event: input, now }, dependencies,
  )).toMatchObject({ kind: "retryable" });
  expect((await t.run((ctx) => ctx.db.get(calendarEventId)))?.externalSyncState).toBe("pending");
  await runGoogleCalendarSync({
    connectionId, now: now + 1, dependencies: syncDependencies(t),
    listPage: async () => ({ items: [created!], nextSyncToken: "sync_after_create" }),
  });
  const local = await t.run((ctx) => ctx.db.get(calendarEventId));
  const operation = await t.run((ctx) => ctx.db.query("googleCalendarWriteOperations").withIndex("by_operationKey", (q) => q.eq("operationKey", operationKey)).unique());
  expect(local).toMatchObject({ externalOwnerUserId: userId, externalOrigin: "kilobot", externalOperationKey: operationKey, externalEventId: created?.id, externalSyncState: "synced" });
  expect(operation).toMatchObject({ state: "succeeded", externalEventId: created?.id });
});

test("an ETag precondition conflict refreshes once without overwriting newer Google state", async () => {
  const { t, connectionId, calendarEventId } = await setupLocalEvent({ external: true });
  let writes = 0;
  const requests: Request[] = [];
  const dependencies = writeDependencies(t, async (input, init) => {
    requests.push(new Request(input, init));
    if (init?.method === "GET") return Response.json(providerEvent("existing_event", "Before", '"etag_1"'));
    writes += 1;
    return new Response(null, { status: 412 });
  });
  dependencies.refresh = async () => {
    await t.run((ctx) => ctx.db.patch(calendarEventId, { title: "Newer Google title", externalEtag: '"etag_2"', externalSyncState: "synced" }));
  };
  const result = await runUpdateGoogleCalendarEvent(
    { connectionId, calendarEventId, operationKey: "booking:update", event: input, now }, dependencies,
  );
  expect(result).toMatchObject({ kind: "conflict" });
  expect(writes).toBe(1);
  expect(requests.map((request) => request.method)).toEqual(["GET", "PATCH"]);
  expect(requests[1].headers.get("If-Match")).toBe('"etag_1"');
  expect((await t.run((ctx) => ctx.db.get(calendarEventId)))?.title).toBe("Newer Google title");
});

test("deleting an already absent event succeeds and preserves the cancelled booking", async () => {
  const { t, connectionId, calendarEventId } = await setupLocalEvent({ external: true });
  let providerCalls = 0;
  const dependencies = writeDependencies(t, async () => {
    providerCalls += 1;
    return new Response(null, { status: 410 });
  });
  const args = { connectionId, calendarEventId, operationKey: "booking:delete", now };
  const result = await runDeleteGoogleCalendarEvent(args, dependencies);
  const retry = await runDeleteGoogleCalendarEvent({ ...args, now: now + 1 }, dependencies);
  expect(result).toEqual(retry);
  expect(result).toMatchObject({ kind: "success", externalEventId: "existing_event" });
  expect(providerCalls).toBe(1);
  expect(await t.run((ctx) => ctx.db.get(calendarEventId))).toMatchObject(
    { status: "cancelled", externalStatus: "cancelled", externalSyncState: "synced" },
  );
});

test("credential and provider failures return safe exact outcomes and fail closed", async () => {
  const { t, connectionId, calendarEventId } = await setupLocalEvent({ external: true });
  const dependencies = writeDependencies(t, async () => new Response("secret provider body", { status: 403 }));
  expect(await runDeleteGoogleCalendarEvent(
    { connectionId, calendarEventId, operationKey: "booking:forbidden", now }, dependencies,
  )).toEqual({ kind: "forbidden", message: "Google Calendar denied this request." });
  let providerCalls = 0;
  const provider: typeof fetch = async () => {
    providerCalls += 1;
    return Response.json({});
  };
  expect(await runDeleteGoogleCalendarEvent(
    { connectionId, calendarEventId, operationKey: "booking:blocked", now: now + 1 },
    writeDependencies(t, provider),
  )).toEqual({ kind: "needs_reauthorization", message: "Google Calendar needs to be reconnected." });
  expect(providerCalls).toBe(0);
});

test("another connection cannot mutate an event it does not own", async () => {
  const { t, calendarEventId } = await setupLocalEvent({ external: true });
  const { userId } = await createUserAcrossTwoTeams(t);
  const otherConnectionId = await reserveConnection(t, userId);
  let providerCalls = 0;
  const provider: typeof fetch = async () => {
    providerCalls += 1;
    return Response.json({});
  };
  const result = await runDeleteGoogleCalendarEvent(
    { connectionId: otherConnectionId, calendarEventId, operationKey: "foreign:delete", now },
    writeDependencies(t, provider),
  );
  expect(result).toMatchObject({ kind: "forbidden" });
  expect(providerCalls).toBe(0);
});

test("an owner can delete an editable Google-originated primary event", async () => {
  const { t, connectionId, calendarEventId } = await setupLocalEvent({ external: true });
  await t.run((ctx) => ctx.db.patch(calendarEventId, { externalOrigin: "google" }));
  const result = await runDeleteGoogleCalendarEvent(
    { connectionId, calendarEventId, operationKey: "owned-google:delete", now },
    writeDependencies(t, async () => new Response(null, { status: 204 })),
  );
  expect(result).toMatchObject({ kind: "success", externalEventId: "existing_event" });
  expect(await t.run((ctx) => ctx.db.get(calendarEventId))).toBeNull();
});
