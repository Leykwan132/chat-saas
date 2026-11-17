import { afterEach, expect, test, vi } from "vitest";
import { replyFixture } from "./inboundReply.testUtils";
import { internal } from "./_generated/api";
import { finishReplyMedia, queueInboundReply } from "./inboundReplyQueue";
import { invalidatePendingReply } from "./inboundReplyState";

afterEach(() => vi.useRealTimers());

test("an edit during delivery remains pending after the old version is acknowledged", async () => {
  const f = await replyFixture();
  const promptMessageId = await f.inbound();
  const runId = await readyRun(f);
  await f.t.mutation(internal.inboundReplyRuns.claimGeneration, { runId });
  await f.t.mutation(internal.inboundReplyRuns.beginDelivery, { runId });
  await f.t.run((ctx) =>
    queueInboundReply(ctx, {
      conversationId: f.conversationId,
      promptMessageId,
      sourceMessageUpdatedAt: Date.now(),
    }),
  );
  await f.t.mutation(internal.inboundReplyRuns.delivered, { runId });
  await f.t.mutation(internal.inboundReplyRuns.complete, {
    workId: "test",
    context: { runId },
    result: { kind: "success", returnValue: null },
  });
  expect(await f.coordinator()).toMatchObject({
    latestSequence: 2,
    answeredSequence: 1,
  });
  expect((await f.coordinator())?.wakeWorkId).toBeDefined();
});

async function readyRun(f: Awaited<ReturnType<typeof replyFixture>>) {
  const state = (await f.coordinator())!;
  vi.setSystemTime(state.dueAt);
  await f.t.mutation(internal.inboundReplyQueue.wake, {
    coordinatorId: state._id,
    generation: state.wakeGeneration,
  });
  return (await f.coordinator())!.activeRunId!;
}

test("new arrivals while queued invalidate the old run without losing pending input", async () => {
  const f = await replyFixture();
  await f.inbound();
  const runId = await readyRun(f);
  await f.inbound("Another detail");
  expect(
    await f.t.mutation(internal.inboundReplyRuns.claimGeneration, { runId }),
  ).toBe(false);
  await f.t.mutation(internal.inboundReplyRuns.complete, {
    workId: "test",
    context: { runId },
    result: { kind: "success", returnValue: null },
  });
  expect(await f.coordinator()).toMatchObject({
    latestSequence: 2,
    answeredSequence: 0,
  });
  expect((await f.coordinator())?.wakeWorkId).toBeDefined();
});

test("new arrivals during generation prevent outdated delivery and parallel runs", async () => {
  const f = await replyFixture();
  await f.inbound();
  const runId = await readyRun(f);
  expect(
    await f.t.mutation(internal.inboundReplyRuns.claimGeneration, { runId }),
  ).toBe(true);
  expect(
    await f.t.mutation(internal.inboundReplyRuns.claimGeneration, { runId }),
  ).toBe(false);
  await f.inbound("Actually tomorrow");
  expect((await f.coordinator())?.activeRunId).toBe(runId);
  expect((await f.coordinator())?.wakeWorkId).toBeUndefined();
  expect(
    await f.t.mutation(internal.inboundReplyRuns.beginDelivery, { runId }),
  ).toBe(false);
});

test("delivery acknowledges only its claimed cutoff and retains new input", async () => {
  const f = await replyFixture();
  await f.inbound();
  const runId = await readyRun(f);
  await f.t.mutation(internal.inboundReplyRuns.claimGeneration, { runId });
  expect(
    await f.t.mutation(internal.inboundReplyRuns.beginDelivery, { runId }),
  ).toBe(true);
  expect(
    await f.t.mutation(internal.inboundReplyRuns.beginDelivery, { runId }),
  ).toBe(false);
  await f.inbound("Thanks, one more thing");
  await f.t.mutation(internal.inboundReplyRuns.delivered, { runId });
  await f.t.mutation(internal.inboundReplyRuns.complete, {
    workId: "test",
    context: { runId },
    result: { kind: "success", returnValue: null },
  });
  expect(await f.coordinator()).toMatchObject({
    latestSequence: 2,
    answeredSequence: 1,
  });
  expect((await f.coordinator())?.wakeWorkId).toBeDefined();
  expect((await f.t.run((ctx) => ctx.db.get(runId)))?.state).toBe("delivered");
});

test("known pre-delivery skip pauses only that revision and a new message can resume", async () => {
  const f = await replyFixture();
  await f.inbound();
  const runId = await readyRun(f);
  await f.t.mutation(internal.inboundReplyRuns.claimGeneration, { runId });
  await f.t.mutation(internal.inboundReplyRuns.complete, {
    workId: "test",
    context: { runId },
    result: { kind: "success", returnValue: null },
  });
  expect((await f.coordinator())?.wakeWorkId).toBeUndefined();
  expect((await f.coordinator())?.answeredSequence).toBe(0);
  await f.inbound("Credits restored, please help");
  expect((await f.coordinator())?.lastError).toBeUndefined();
  expect((await f.coordinator())?.wakeWorkId).toBeDefined();
});

test("failed or uncertain delivery retains input and blocks automatic resend", async () => {
  const f = await replyFixture();
  await f.inbound();
  const runId = await readyRun(f);
  await f.t.mutation(internal.inboundReplyRuns.claimGeneration, { runId });
  await f.t.mutation(internal.inboundReplyRuns.beginDelivery, { runId });
  await f.t.mutation(internal.inboundReplyRuns.complete, {
    workId: "test",
    context: { runId },
    result: { kind: "failed", error: "Delivery outcome unknown" },
  });
  await f.inbound("Hello?");
  expect(await f.coordinator()).toMatchObject({
    answeredSequence: 0,
    lastError: "Delivery outcome unknown",
  });
  expect((await f.coordinator())?.wakeWorkId).toBeUndefined();
});

test("media readiness schedules an expired quiet group without restarting the deadline", async () => {
  const f = await replyFixture();
  const promptMessageId = await f.inbound("Voice", true);
  const state = (await f.coordinator())!;
  vi.setSystemTime(state.dueAt);
  await f.t.mutation(internal.inboundReplyQueue.wake, {
    coordinatorId: state._id,
    generation: state.wakeGeneration,
  });
  expect((await f.coordinator())?.activeRunId).toBeUndefined();
  await f.t.run((ctx) =>
    finishReplyMedia(ctx, f.conversationId, [promptMessageId]),
  );
  expect((await f.coordinator())?.dueAt).toBe(state.dueAt);
  expect((await f.coordinator())?.wakeWorkId).toBeDefined();
});

test("takeover invalidates pending work and re-enabling never revives it", async () => {
  const f = await replyFixture();
  await f.inbound();
  const state = (await f.coordinator())!;
  await f.t.run((ctx) => invalidatePendingReply(ctx, f.conversationId));
  vi.setSystemTime(state.dueAt);
  await f.t.mutation(internal.inboundReplyQueue.wake, {
    coordinatorId: state._id,
    generation: state.wakeGeneration,
  });
  expect(await f.coordinator()).toMatchObject({
    answeredSequence: 1,
    latestSequence: 1,
  });
  expect((await f.coordinator())?.activeRunId).toBeUndefined();
});
