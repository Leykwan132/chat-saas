import { afterEach, expect, test, vi } from "vitest";
import { replyFixture } from "./inboundReply.testUtils";
import { queueInboundReply } from "./inboundReplyQueue";
import { internal } from "./_generated/api";

afterEach(() => vi.useRealTimers());

test("burst messages move one shared deadline without enqueueing another wake", async () => {
  const f = await replyFixture();
  await f.inbound("Hi");
  const first = await f.coordinator();
  expect(first?.dueAt).toBe(Date.now() + 5000);
  vi.setSystemTime(Date.now() + 2000);
  await f.inbound("I want to book");
  vi.setSystemTime(Date.now() + 2000);
  await f.inbound("Tomorrow");
  const latest = await f.coordinator();
  expect(latest).toMatchObject({
    latestSequence: 3,
    revision: 3,
    dueAt: Date.now() + 5000,
    wakeWorkId: first!.wakeWorkId,
    wakeGeneration: first!.wakeGeneration,
  });
  expect(
    await f.t.run((ctx) => ctx.db.query("inboundReplyInputs").take(10)),
  ).toHaveLength(3);
});

test("duplicate input never extends the deadline or adds another pending message", async () => {
  const f = await replyFixture();
  const promptMessageId = await f.inbound();
  const before = await f.coordinator();
  vi.setSystemTime(Date.now() + 2000);
  await f.t.run((ctx) =>
    queueInboundReply(ctx, {
      conversationId: f.conversationId,
      promptMessageId,
    }),
  );
  expect(await f.coordinator()).toEqual(before);
});

test("early wake requeues for the latest deadline and only one current wake claims a run", async () => {
  const f = await replyFixture();
  await f.inbound();
  const original = await f.coordinator();
  vi.setSystemTime(Date.now() + 2000);
  await f.inbound();
  vi.setSystemTime(Date.now() + 3000);
  await f.t.mutation(internal.inboundReplyQueue.wake, {
    coordinatorId: original!._id,
    generation: original!.wakeGeneration,
  });
  const moved = await f.coordinator();
  expect(moved?.activeRunId).toBeUndefined();
  expect(moved!.wakeGeneration).toBe(original!.wakeGeneration + 1);
  vi.setSystemTime(Date.now() + 2000);
  await f.t.mutation(internal.inboundReplyQueue.wake, {
    coordinatorId: moved!._id,
    generation: moved!.wakeGeneration,
  });
  await f.t.mutation(internal.inboundReplyQueue.wake, {
    coordinatorId: original!._id,
    generation: original!.wakeGeneration,
  });
  await f.t.mutation(internal.inboundReplyQueue.wake, {
    coordinatorId: moved!._id,
    generation: moved!.wakeGeneration,
  });
  expect(
    await f.t.run((ctx) => ctx.db.query("inboundReplyRuns").take(10)),
  ).toHaveLength(1);
});

test("media input prevents an otherwise quiet group from starting", async () => {
  const f = await replyFixture();
  await f.inbound("A voice note", true);
  const state = await f.coordinator();
  vi.setSystemTime(Date.now() + 5000);
  await f.t.mutation(internal.inboundReplyQueue.wake, {
    coordinatorId: state!._id,
    generation: state!.wakeGeneration,
  });
  expect((await f.coordinator())?.activeRunId).toBeUndefined();
});
