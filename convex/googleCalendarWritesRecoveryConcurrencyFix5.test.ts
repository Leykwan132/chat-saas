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
  return { externalEventId, payloadFingerprint };
}

test("concurrent recovery callers acquire one claim and issue one create", async () => {
  const { t, connectionId, calendarEventId } = await setupCreate();
  const operationKey = "fix5:create:exclusive";
  let clock = now;
  let getCalls = 0;
  let postCalls = 0;
  let settled = 0;
  let releaseGets!: () => void;
  let releaseFirstPost!: () => void;
  const getBarrier = new Promise<void>((resolve) => { releaseGets = resolve; });
  const firstPostBarrier = new Promise<void>((resolve) => { releaseFirstPost = resolve; });
  const write = googleCalendarWriteTestDependencies(t, async (_input, init) => {
    if (init?.method === "GET") {
      getCalls += 1;
      await getBarrier;
      return new Response(null, { status: 404 });
    }
    postCalls += 1;
    const body = JSON.parse(String(init?.body)) as {
      id: string; extendedProperties: { private: { kilobotOperationFingerprint: string } };
    };
    if (postCalls === 1) await firstPostBarrier;
    return Response.json(providerEvent(
      body.id, operationKey, body.extendedProperties.private.kilobotOperationFingerprint,
    ));
  }, () => clock);
  const staged = await stageMutationStarted(
    write, { connectionId, calendarEventId, operationKey },
  );
  write.renewAttemptLease = async () => ({ kind: "ready" });
  clock += 120_001;
  const calls = Array.from({ length: 8 }, () => runCreateGoogleCalendarEvent({
    connectionId, calendarEventId, operationKey, event: eventInput, now: clock,
  }, write).finally(() => { settled += 1; }));
  while (getCalls < 1) await new Promise((resolve) => setTimeout(resolve, 0));
  releaseGets();
  while (postCalls < 1) await new Promise((resolve) => setTimeout(resolve, 0));
  while (settled < 7) await new Promise((resolve) => setTimeout(resolve, 0));
  expect(postCalls).toBe(1);
  releaseFirstPost();
  const results = await Promise.all(calls);
  expect(results.filter((result) => result.kind === "success")).toHaveLength(1);
  expect(results.filter((result) => result.kind === "retryable")).toHaveLength(7);
  const operation = await t.run((ctx) => ctx.db.query("googleCalendarWriteOperations")
    .withIndex("by_operationKey", (q) => q.eq("operationKey", operationKey)).unique());
  expect(operation).toMatchObject({
    state: "succeeded", recoveryRetryCount: 1, externalEventId: staged.externalEventId,
  });
});

test("a failed recovery cannot be reclaimed until its claim lease expires", async () => {
  const { t, connectionId, calendarEventId } = await setupCreate();
  const operationKey = "fix5:create:failed-lease";
  let clock = now;
  let postCalls = 0;
  let payloadFingerprint = "";
  const write = googleCalendarWriteTestDependencies(t, async (_input, init) => {
    if (init?.method === "GET") return new Response(null, { status: 404 });
    postCalls += 1;
    return postCalls === 1
      ? new Response(null, { status: 500 })
      : Response.json(providerEvent(
          await deriveGoogleCalendarEventId(operationKey), operationKey, payloadFingerprint,
        ));
  }, () => clock);
  payloadFingerprint = (await stageMutationStarted(
    write, { connectionId, calendarEventId, operationKey },
  )).payloadFingerprint;
  clock += 120_001;
  const args = { connectionId, calendarEventId, operationKey, event: eventInput, now: clock };
  expect(await runCreateGoogleCalendarEvent(args, write)).toMatchObject({ kind: "retryable" });
  clock += 1;
  expect(await runCreateGoogleCalendarEvent({ ...args, now: clock }, write))
    .toMatchObject({ kind: "retryable" });
  expect(postCalls).toBe(1);
  clock += 120_001;
  expect(await runCreateGoogleCalendarEvent({ ...args, now: clock }, write))
    .toMatchObject({ kind: "success" });
  expect(postCalls).toBe(2);
});

test("create recovery conflicts on drift in an omitted optional field", async () => {
  const { t, connectionId, calendarEventId } = await setupCreate();
  const operationKey = "fix5:create:omitted-drift";
  let clock = now;
  let payloadFingerprint = "";
  let postCalls = 0;
  const write = googleCalendarWriteTestDependencies(t, async (_input, init) => {
    if (init?.method !== "GET") {
      postCalls += 1;
      return Response.json({});
    }
    return Response.json({
      ...providerEvent(
        await deriveGoogleCalendarEventId(operationKey), operationKey, payloadFingerprint,
      ),
      description: "Human edit",
    });
  }, () => clock);
  payloadFingerprint = (await stageMutationStarted(
    write, { connectionId, calendarEventId, operationKey },
  )).payloadFingerprint;
  clock += 120_001;
  expect(await runCreateGoogleCalendarEvent({
    connectionId, calendarEventId, operationKey, event: eventInput, now: clock,
  }, write)).toMatchObject({ kind: "conflict" });
  expect(postCalls).toBe(0);
  expect((await t.run((ctx) => ctx.db.get(calendarEventId)))?.title).toBe("Before");
});
