/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import type { FunctionReference } from "convex/server";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import type { GoogleCalendarEvent } from "./googleCalendar/eventMapping";
import { createUserAcrossTwoTeams, reserveConnection } from "./googleCalendar/testFixtures";
import {
  runCreateGoogleCalendarEvent,
  runDeleteGoogleCalendarEvent,
  runUpdateGoogleCalendarEvent,
} from "./googleCalendar/writeActions";
import {
  deriveGoogleCalendarEventId,
  fingerprintGoogleCalendarWritePayload,
} from "./googleCalendar/writeFingerprint";
import type {
  GoogleCalendarWriteArgs,
  GoogleCalendarWriteDependencies,
} from "./googleCalendar/writeTypes";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
type CalendarTest = TestConvex<typeof schema>;
type MutationRef = FunctionReference<"mutation", "internal", Record<string, unknown>, unknown>;
const googleInternal = internal as unknown as {
  googleCalendar: {
    writeStore: { prepare: MutationRef; beginAttempt: MutationRef };
    writeAttemptLeaseStore: {
      renewAttemptLease: MutationRef; claimMutationRecovery: MutationRef;
      deferMutationRecovery: MutationRef; recordRecoveryConflict: MutationRef;
    };
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
};

function providerEvent(
  id: string,
  etag: string,
  summary = eventInput.summary,
  operationKey?: string,
  payloadFingerprint?: string,
): GoogleCalendarEvent {
  return {
    id, status: "confirmed", summary, etag, updated: "2026-08-13T08:00:00.000Z",
    transparency: "opaque", organizer: { self: true }, start: eventInput.start,
    end: eventInput.end, extendedProperties: operationKey === undefined
      ? undefined
      : { private: {
          kilobotOperationKey: operationKey,
          kilobotOperationFingerprint: payloadFingerprint,
        } },
  };
}

async function setupEvent(external: boolean) {
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
  clock: () => number,
): GoogleCalendarWriteDependencies {
  const store = googleInternal.googleCalendar.writeStore;
  const lease = googleInternal.googleCalendar.writeAttemptLeaseStore;
  const finalization = googleInternal.googleCalendar.writeFinalizationStore;
  return {
    prepare: (args) => t.mutation(store.prepare, args) as never,
    beginAttempt: (args) => t.mutation(store.beginAttempt, args) as never,
    renewAttemptLease: (args) => t.mutation(lease.renewAttemptLease, args) as never,
    claimMutationRecovery: (args) => t.mutation(lease.claimMutationRecovery, args) as never,
    deferMutationRecovery: (args) => t.mutation(lease.deferMutationRecovery, args) as never,
    recordRecoveryConflict: (args) => t.mutation(lease.recordRecoveryConflict, args) as never,
    finalizeEvent: (args) => t.mutation(finalization.finalizeEvent, args) as never,
    establishDeletePrecondition: (args) => t.mutation(finalization.establishDeletePrecondition, args) as never,
    finalizeDelete: (args) => t.mutation(finalization.finalizeDelete, args) as never,
    recordOutcome: (args) => t.mutation(finalization.recordOutcome, args) as never,
    getCredential: async () => ({ kind: "active", token: "secret", expiresAt: null }),
    refresh: async () => undefined,
    fetchImplementation,
    clock,
  };
}

async function stageMutationStarted(
  write: GoogleCalendarWriteDependencies,
  args: GoogleCalendarWriteArgs,
  action: "create" | "update" | "delete",
  externalEventId?: string,
) {
  const prepared = await write.prepare({ ...args, action, externalEventId });
  if (prepared.kind === "error") throw new Error("prepare failed");
  const event = action === "delete" ? undefined : eventInput;
  const payloadFingerprint = await fingerprintGoogleCalendarWritePayload({
    action, connectionId: args.connectionId, calendarEventId: args.calendarEventId,
    externalEventId: prepared.externalEventId,
    payloadPreconditionEtag: prepared.payloadPreconditionEtag, event,
  });
  const attempt = await write.beginAttempt({
    operationId: prepared.operationId, payloadFingerprint, now,
  });
  if (attempt.kind !== "ready") throw new Error("attempt failed");
  await write.renewAttemptLease({
    operationId: prepared.operationId, attemptGeneration: attempt.attemptGeneration,
    phase: "provider_mutation_started", now,
  });
  return { prepared, payloadFingerprint };
}

test("create recovery reissues a deterministic create after a crash before send", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent(false);
  let clock = now;
  let postCalls = 0;
  const operationKey = "fix4:create:crash";
  const externalEventId = await deriveGoogleCalendarEventId(operationKey);
  const write = dependencies(t, async (_request, init) => {
    if (init?.method === "GET") return new Response(null, { status: 404 });
    postCalls += 1;
    const body = JSON.parse(String(init?.body)) as {
      id: string; extendedProperties: { private: {
        kilobotOperationKey: string; kilobotOperationFingerprint: string;
      } };
    };
    return Response.json(providerEvent(
      body.id, '"created"', eventInput.summary,
      body.extendedProperties.private.kilobotOperationKey,
      body.extendedProperties.private.kilobotOperationFingerprint,
    ));
  }, () => clock);
  await stageMutationStarted(
    write, { connectionId, calendarEventId, operationKey, now }, "create", externalEventId,
  );
  clock += 120_001;
  expect(await runCreateGoogleCalendarEvent(
    { connectionId, calendarEventId, operationKey, event: eventInput, now: clock }, write,
  )).toMatchObject({ kind: "success", externalEventId });
  expect(postCalls).toBe(1);
});

test("update recovery reissues one conditional PATCH after a crash before send", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent(true);
  let clock = now;
  const requests: Request[] = [];
  const write = dependencies(t, async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    if (request.method === "GET") return Response.json(providerEvent("existing_event", '"etag_n"'));
    const body = JSON.parse(await request.text()) as {
      extendedProperties: { private: { kilobotOperationKey: string; kilobotOperationFingerprint: string } };
    };
    return Response.json(providerEvent(
      "existing_event", '"etag_n1"', eventInput.summary,
      body.extendedProperties.private.kilobotOperationKey,
      body.extendedProperties.private.kilobotOperationFingerprint,
    ));
  }, () => clock);
  const args = { connectionId, calendarEventId, operationKey: "fix4:update:crash", now };
  await stageMutationStarted(write, args, "update");
  clock += 120_001;
  expect(await runUpdateGoogleCalendarEvent({ ...args, event: eventInput, now: clock }, write))
    .toMatchObject({ kind: "success" });
  expect(requests.map((request) => request.method)).toEqual(["GET", "PATCH"]);
  expect(requests[1].headers.get("If-Match")).toBe('"etag_n"');
});

test("delete recovery reissues one conditional DELETE after a crash before send", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent(true);
  let clock = now;
  const requests: Request[] = [];
  const write = dependencies(t, async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    return request.method === "GET"
      ? Response.json(providerEvent("existing_event", '"etag_n"'))
      : new Response(null, { status: 204 });
  }, () => clock);
  const args = { connectionId, calendarEventId, operationKey: "fix4:delete:crash", now };
  await stageMutationStarted(write, args, "delete");
  clock += 120_001;
  expect(await runDeleteGoogleCalendarEvent({ ...args, now: clock }, write))
    .toMatchObject({ kind: "success" });
  expect(requests.map((request) => request.method)).toEqual(["GET", "DELETE"]);
  expect(requests[1].headers.get("If-Match")).toBe('"etag_n"');
});

test("a delayed original PATCH and recovery produce one semantic update", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent(true);
  let clock = now;
  const operationKey = "fix4:update:delayed";
  let current = providerEvent("existing_event", '"etag_n"');
  let patchCalls = 0;
  const write = dependencies(t, async (_input, init) => {
    if (init?.method === "GET") return Response.json(current);
    patchCalls += 1;
    const body = JSON.parse(String(init?.body)) as {
      extendedProperties: { private: { kilobotOperationFingerprint: string } };
    };
    current = providerEvent(
      "existing_event", '"etag_n1"', eventInput.summary, operationKey,
      body.extendedProperties.private.kilobotOperationFingerprint,
    );
    return new Response(null, { status: 412 });
  }, () => clock);
  const args = { connectionId, calendarEventId, operationKey, now };
  await stageMutationStarted(write, args, "update");
  clock += 120_001;
  expect(await runUpdateGoogleCalendarEvent({ ...args, event: eventInput, now: clock }, write))
    .toMatchObject({ kind: "conflict" });
  clock += 60_001;
  expect(await runUpdateGoogleCalendarEvent({ ...args, event: eventInput, now: clock }, write))
    .toMatchObject({ kind: "success" });
  expect(patchCalls).toBe(1);
});

test("provider mutation recovery exhausts after three failed reissues", async () => {
  const { t, connectionId, calendarEventId } = await setupEvent(false);
  let clock = now;
  let postCalls = 0;
  const operationKey = "fix4:create:bounded";
  const externalEventId = await deriveGoogleCalendarEventId(operationKey);
  const write = dependencies(t, async (_input, init) => {
    if (init?.method === "GET") return new Response(null, { status: 404 });
    postCalls += 1;
    return new Response(null, { status: 500 });
  }, () => clock);
  const args = { connectionId, calendarEventId, operationKey, now };
  await stageMutationStarted(write, args, "create", externalEventId);
  clock += 60_000;
  for (let retry = 0; retry < 3; retry += 1) {
    clock += 120_001;
    expect(await runCreateGoogleCalendarEvent({ ...args, event: eventInput, now: clock }, write))
      .toMatchObject({ kind: "retryable" });
  }
  clock += 60_001;
  expect(await runCreateGoogleCalendarEvent({ ...args, event: eventInput, now: clock }, write))
    .toMatchObject({ kind: "failed" });
  expect(postCalls).toBe(3);
});

test("matching recovery markers conflict when create or update payload changed", async () => {
  for (const action of ["create", "update"] as const) {
    const { t, connectionId, calendarEventId } = await setupEvent(action === "update");
    let clock = now;
    const operationKey = `fix4:${action}:payload`;
    const externalEventId = action === "create"
      ? await deriveGoogleCalendarEventId(operationKey)
      : "existing_event";
    let payloadFingerprint = "";
    let mutationCalls = 0;
    const write = dependencies(t, async (_input, init) => {
      if (init?.method !== "GET") {
        mutationCalls += 1;
        return Response.json({});
      }
      return Response.json(providerEvent(
        externalEventId, '"provider_changed"', "Human changed",
        operationKey, payloadFingerprint,
      ));
    }, () => clock);
    const args = { connectionId, calendarEventId, operationKey, now };
    payloadFingerprint = (await stageMutationStarted(
      write, args, action, action === "create" ? externalEventId : undefined,
    )).payloadFingerprint;
    clock += 60_001;
    const result = action === "create"
      ? await runCreateGoogleCalendarEvent({ ...args, event: eventInput, now: clock }, write)
      : await runUpdateGoogleCalendarEvent({ ...args, event: eventInput, now: clock }, write);
    expect(result, action).toMatchObject({ kind: "conflict" });
    expect(mutationCalls, action).toBe(0);
    expect((await t.run((ctx) => ctx.db.get(calendarEventId)))?.title).toBe("Before");
  }
});
