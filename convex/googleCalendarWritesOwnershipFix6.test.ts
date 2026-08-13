/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import type { GoogleCalendarEvent } from "./googleCalendar/eventMapping";
import { createUserAcrossTwoTeams, reserveConnection } from "./googleCalendar/testFixtures";
import { runCreateGoogleCalendarEvent } from "./googleCalendar/writeActions";
import {
  deriveGoogleCalendarEventId,
  fingerprintGoogleCalendarWritePayload,
} from "./googleCalendar/writeFingerprint";
import { googleCalendarWriteTestDependencies } from "./googleCalendar/writeTestDependencies";
import type { GoogleCalendarWriteDependencies } from "./googleCalendar/writeTypes";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const now = Date.UTC(2026, 7, 13, 8);
const eventInput = {
  summary: "Customer appointment",
  start: { dateTime: "2026-08-15T09:00:00+08:00", timeZone: "Asia/Kuala_Lumpur" },
  end: { dateTime: "2026-08-15T10:00:00+08:00", timeZone: "Asia/Kuala_Lumpur" },
};

function providerEvent(
  id: string,
  operationKey: string,
  payloadFingerprint: string,
): GoogleCalendarEvent {
  return {
    id, status: "confirmed", summary: eventInput.summary, etag: '"created"',
    transparency: "opaque", organizer: { self: true },
    start: eventInput.start, end: eventInput.end,
    extendedProperties: { private: {
      kilobotOperationKey: operationKey,
      kilobotOperationFingerprint: payloadFingerprint,
    } },
  };
}

async function setupCreate() {
  const t = convexTest(schema, modules);
  const { userId, teamIds } = await createUserAcrossTwoTeams(t);
  const connectionId = await reserveConnection(t, userId);
  const calendarEventId = await t.run((ctx) => ctx.db.insert("calendarEvents", {
    teamId: teamIds[0], title: "Before", startAt: now + 86_400_000,
    endAt: now + 90_000_000, timeZone: "Asia/Kuala_Lumpur", status: "confirmed",
    createdBy: userId, externalProvider: "google", externalCalendarId: "primary",
    externalOwnerUserId: userId, externalOrigin: "kilobot", externalStatus: "confirmed",
    externalTransparency: "opaque", externalCanEdit: true, externalSyncState: "pending",
    createdAt: now, updatedAt: now,
  }));
  return { t, connectionId, calendarEventId };
}

async function stageMutationStarted(
  write: GoogleCalendarWriteDependencies,
  args: { connectionId: Parameters<typeof write.prepare>[0]["connectionId"];
    calendarEventId: Parameters<typeof write.prepare>[0]["calendarEventId"];
    operationKey: string; },
) {
  const externalEventId = await deriveGoogleCalendarEventId(args.operationKey);
  const prepared = await write.prepare({
    ...args, externalEventId, action: "create", now,
  });
  if (prepared.kind === "error") throw new Error("prepare failed");
  const payloadFingerprint = await fingerprintGoogleCalendarWritePayload({
    action: "create", ...args, externalEventId,
    payloadPreconditionEtag: prepared.payloadPreconditionEtag, event: eventInput,
  });
  const attempt = await write.beginAttempt({
    operationId: prepared.operationId, payloadFingerprint, now,
  });
  if (attempt.kind !== "ready") throw new Error("attempt failed");
  await write.renewAttemptLease({
    operationId: prepared.operationId, attemptGeneration: attempt.attemptGeneration,
    phase: "provider_mutation_started", now,
  });
  return {
    operationId: prepared.operationId,
    attemptGeneration: attempt.attemptGeneration,
    externalEventId,
    payloadFingerprint,
  };
}

test("a just-renewed original lease excludes recovery ownership", async () => {
  const { t, connectionId, calendarEventId } = await setupCreate();
  const write = googleCalendarWriteTestDependencies(t, async () => Response.json({}), () => now);
  const staged = await stageMutationStarted(
    write, { connectionId, calendarEventId, operationKey: "fix6:renewed" },
  );
  expect(await write.renewAttemptLease({
    operationId: staged.operationId, attemptGeneration: staged.attemptGeneration,
    phase: "provider_mutation_started", now: now + 59_999,
  })).toEqual({ kind: "ready" });
  expect(await write.claimMutationRecovery({
    operationId: staged.operationId, attemptGeneration: staged.attemptGeneration,
    now: now + 60_001,
  })).toEqual({ kind: "running" });
});

test("a recovery claim makes original renewal and finalization inert", async () => {
  const { t, connectionId, calendarEventId } = await setupCreate();
  const operationKey = "fix6:ownership";
  const write = googleCalendarWriteTestDependencies(t, async () => Response.json({}), () => now);
  const staged = await stageMutationStarted(write, { connectionId, calendarEventId, operationKey });
  const claim = await write.claimMutationRecovery({
    operationId: staged.operationId, attemptGeneration: staged.attemptGeneration,
    now: now + 120_001,
  });
  expect(claim).toMatchObject({ kind: "ready" });
  expect(await write.renewAttemptLease({
    operationId: staged.operationId, attemptGeneration: staged.attemptGeneration,
    phase: "provider_mutation_started", now: now + 120_002,
  })).toEqual({ kind: "stale" });
  expect(await write.finalizeEvent({
    operationId: staged.operationId, attemptGeneration: staged.attemptGeneration,
    event: {
      eventId: staged.externalEventId, status: "confirmed", title: eventInput.summary,
      etag: '"original"', transparency: "opaque", blocksAvailability: true,
      canEdit: true, startAt: Date.parse(eventInput.start.dateTime),
      endAt: Date.parse(eventInput.end.dateTime), timeZone: "Asia/Kuala_Lumpur", allDay: false,
    },
    now: now + 120_003,
  })).toEqual({ kind: "stale" });
  expect(await write.recordOutcome({
    operationId: staged.operationId, attemptGeneration: staged.attemptGeneration,
    kind: "failed", now: now + 120_004,
  })).toEqual({ kind: "stale" });
  expect((await t.run((ctx) => ctx.db.get(calendarEventId)))?.externalEventId).toBeUndefined();
});

test("simultaneous renewal and recovery claim transactionally choose one owner", async () => {
  const { t, connectionId, calendarEventId } = await setupCreate();
  const write = googleCalendarWriteTestDependencies(t, async () => Response.json({}), () => now);
  const staged = await stageMutationStarted(
    write, { connectionId, calendarEventId, operationKey: "fix6:clock-race" },
  );
  const [renewed, claimed] = await Promise.all([
    write.renewAttemptLease({
      operationId: staged.operationId, attemptGeneration: staged.attemptGeneration,
      phase: "provider_mutation_started", now: now + 60_001,
    }),
    write.claimMutationRecovery({
      operationId: staged.operationId, attemptGeneration: staged.attemptGeneration,
      now: now + 60_001,
    }),
  ]);
  const originalWon = renewed.kind === "ready" && claimed.kind === "running";
  const recoveryWon = renewed.kind === "stale" && claimed.kind === "ready";
  expect(originalWon || recoveryWon).toBe(true);
});

test("held original and recovery produce one semantic create and terminal success", async () => {
  const { t, connectionId, calendarEventId } = await setupCreate();
  const operationKey = "fix6:held-original";
  const externalEventId = await deriveGoogleCalendarEventId(operationKey);
  let clock = now;
  let current: GoogleCalendarEvent | undefined;
  let postCalls = 0;
  let originalStarted!: () => void;
  let releaseOriginal!: () => void;
  const originalStart = new Promise<void>((resolve) => { originalStarted = resolve; });
  const originalRelease = new Promise<void>((resolve) => { releaseOriginal = resolve; });
  const write = googleCalendarWriteTestDependencies(t, async (_input, init) => {
    if (init?.method === "GET") {
      return current === undefined ? new Response(null, { status: 404 }) : Response.json(current);
    }
    postCalls += 1;
    const body = JSON.parse(String(init?.body)) as {
      id: string; extendedProperties: { private: { kilobotOperationFingerprint: string } };
    };
    if (postCalls === 1) {
      originalStarted();
      await originalRelease;
      if (current !== undefined) return new Response(null, { status: 409 });
    }
    current = providerEvent(
      body.id, operationKey, body.extendedProperties.private.kilobotOperationFingerprint,
    );
    return Response.json(current);
  }, () => clock);
  const args = { connectionId, calendarEventId, operationKey, event: eventInput, now };
  const original = runCreateGoogleCalendarEvent(args, write);
  await originalStart;
  clock += 120_001;
  const recovered = await runCreateGoogleCalendarEvent({ ...args, now: clock }, write);
  releaseOriginal();
  expect(recovered).toMatchObject({ kind: "success", externalEventId });
  expect(await original).toMatchObject({ kind: "success", externalEventId });
  expect(postCalls).toBe(2);
  expect(await t.run((ctx) => ctx.db.query("googleCalendarWriteOperations")
    .withIndex("by_operationKey", (q) => q.eq("operationKey", operationKey)).unique()))
    .toMatchObject({ state: "succeeded", recoveryRetryCount: 1 });
});

test("a failed recovery stays pending until the held original is observed", async () => {
  const { t, connectionId, calendarEventId } = await setupCreate();
  const operationKey = "fix6:original-after-recovery-failure";
  let clock = now;
  let current: GoogleCalendarEvent | undefined;
  let postCalls = 0;
  let originalStarted!: () => void;
  let releaseOriginal!: () => void;
  const originalStart = new Promise<void>((resolve) => { originalStarted = resolve; });
  const originalRelease = new Promise<void>((resolve) => { releaseOriginal = resolve; });
  const write = googleCalendarWriteTestDependencies(t, async (_input, init) => {
    if (init?.method === "GET") {
      return current === undefined ? new Response(null, { status: 404 }) : Response.json(current);
    }
    postCalls += 1;
    const body = JSON.parse(String(init?.body)) as {
      id: string; extendedProperties: { private: { kilobotOperationFingerprint: string } };
    };
    if (postCalls === 1) {
      originalStarted();
      await originalRelease;
      current = providerEvent(
        body.id, operationKey, body.extendedProperties.private.kilobotOperationFingerprint,
      );
      return Response.json(current);
    }
    return new Response(null, { status: 500 });
  }, () => clock);
  const args = { connectionId, calendarEventId, operationKey, event: eventInput, now };
  const original = runCreateGoogleCalendarEvent(args, write);
  await originalStart;
  clock += 60_001;
  expect(await runCreateGoogleCalendarEvent({ ...args, now: clock }, write))
    .toMatchObject({ kind: "retryable" });
  expect(await t.run((ctx) => ctx.db.query("googleCalendarWriteOperations")
    .withIndex("by_operationKey", (q) => q.eq("operationKey", operationKey)).unique()))
    .toMatchObject({ state: "pending", recoveryRetryCount: 1 });
  releaseOriginal();
  expect(await original).toMatchObject({ kind: "retryable" });
  clock += 120_001;
  expect(await runCreateGoogleCalendarEvent({ ...args, now: clock }, write))
    .toMatchObject({ kind: "success" });
  expect(postCalls).toBe(2);
});
