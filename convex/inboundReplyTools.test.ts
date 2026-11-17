import { afterEach, expect, test, vi } from "vitest";
import { replyFixture } from "./inboundReply.testUtils";
import { internal } from "./_generated/api";

afterEach(() => vi.useRealTimers());

async function generatingRun(f: Awaited<ReturnType<typeof replyFixture>>) {
  const state = (await f.coordinator())!;
  vi.setSystemTime(state.dueAt);
  await f.t.mutation(internal.inboundReplyQueue.wake, {
    coordinatorId: state._id,
    generation: state.wakeGeneration,
  });
  const runId = (await f.coordinator())!.activeRunId!;
  await f.t.mutation(internal.inboundReplyRuns.claimGeneration, { runId });
  return runId;
}

test("completed booking action is reused across a superseded generation of the same unanswered group", async () => {
  const f = await replyFixture();
  await f.inbound("Book tomorrow");
  const oldRunId = await generatingRun(f);
  const action = await f.t.mutation(internal.inboundReplyTools.begin, {
    runId: oldRunId,
    toolName: "bookAppointment",
    inputKey: "same-slot",
  });
  if (!("executionId" in action)) throw new Error("Expected new action");
  await f.t.mutation(internal.inboundReplyTools.complete, {
    executionId: action.executionId,
    resultJson: '{"bookingId":"already-booked"}',
  });
  await f.inbound("Thanks");
  await f.t.mutation(internal.inboundReplyRuns.beginDelivery, {
    runId: oldRunId,
  });
  await f.t.mutation(internal.inboundReplyRuns.complete, {
    workId: "test",
    context: { runId: oldRunId },
    result: { kind: "success", returnValue: null },
  });
  const newRunId = await generatingRun(f);
  await expect(
    f.t.mutation(internal.inboundReplyTools.begin, {
      runId: newRunId,
      toolName: "bookAppointment",
      inputKey: "same-slot",
    }),
  ).resolves.toEqual({ cachedResultJson: '{"bookingId":"already-booked"}' });
  expect(
    await f.t.run((ctx) => ctx.db.query("inboundReplyToolCalls").take(10)),
  ).toHaveLength(1);
});

test("uncertain external action blocks automatic replay", async () => {
  const f = await replyFixture();
  await f.inbound("Book tomorrow");
  const runId = await generatingRun(f);
  await f.t.mutation(internal.inboundReplyTools.begin, {
    runId,
    toolName: "bookAppointment",
    inputKey: "same-slot",
  });
  await expect(
    f.t.mutation(internal.inboundReplyTools.begin, {
      runId,
      toolName: "bookAppointment",
      inputKey: "same-slot",
    }),
  ).rejects.toThrow("unknown outcome");
});

test("new input prevents an old generation from starting another tool action", async () => {
  const f = await replyFixture();
  await f.inbound();
  const runId = await generatingRun(f);
  await f.inbound("Actually, cancel that");
  await expect(
    f.t.mutation(internal.inboundReplyTools.begin, {
      runId,
      toolName: "bookAppointment",
      inputKey: "slot",
    }),
  ).resolves.toEqual({ cancelled: true });
});
