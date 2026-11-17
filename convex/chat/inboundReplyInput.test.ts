import { afterEach, expect, test, vi } from "vitest";
import { saveMessage } from "@convex-dev/agent";
import { components, internal } from "../_generated/api";
import { replyFixture } from "../inboundReply.testUtils";
import { loadGroupedReplyInput } from "./inboundReplyInput";
import { queueInboundReply } from "../inboundReplyQueue";

afterEach(() => vi.useRealTimers());

test("group loads every pending original including prepared media and excludes newer arrivals", async () => {
  const f = await replyFixture();
  await f.t.run((ctx) =>
    saveMessage(ctx, components.agent, {
      threadId: f.threadId,
      message: { role: "assistant", content: "Previous reply" },
    }),
  );
  const firstId = await f.inbound("Hi");
  await f.inbound("Image description: eyebrow treatment price list");
  const lastId = await f.inbound("Audio transcript: Can I book tomorrow?");
  const state = (await f.coordinator())!;
  vi.setSystemTime(state.dueAt);
  await f.t.mutation(internal.inboundReplyQueue.wake, {
    coordinatorId: state._id,
    generation: state.wakeGeneration,
  });
  const runId = (await f.coordinator())!.activeRunId!;
  await f.t.mutation(internal.inboundReplyRuns.claimGeneration, { runId });
  await f.inbound("Later message");
  const input = await f.t.run((ctx) =>
    loadGroupedReplyInput(ctx, runId, f.threadId),
  );
  expect(input?.sourcePromptMessageId).toBe(firstId);
  expect(input?.latestPromptMessageId).toBe(lastId);
  expect(input?.messages.map((message) => message.content)).toEqual([
    "Hi",
    "Image description: eyebrow treatment price list",
    "Audio transcript: Can I book tomorrow?",
  ]);
  expect(input?.history.map((message) => message.content)).toEqual([
    "Previous reply",
  ]);
  expect(input?.decisionState).not.toContain("Later message");
});

test("editing an earlier pending message preserves group order and never duplicates it into history", async () => {
  const f = await replyFixture();
  const first = await f.inbound("First question");
  await f.inbound("Second detail");
  await f.t.run((ctx) =>
    queueInboundReply(ctx, {
      conversationId: f.conversationId,
      promptMessageId: first,
      sourceMessageUpdatedAt: Date.now() + 1,
    }),
  );
  const state = (await f.coordinator())!;
  vi.setSystemTime(state.dueAt);
  await f.t.mutation(internal.inboundReplyQueue.wake, {
    coordinatorId: state._id,
    generation: state.wakeGeneration,
  });
  const runId = (await f.coordinator())!.activeRunId!;
  await f.t.mutation(internal.inboundReplyRuns.claimGeneration, { runId });
  const input = await f.t.run((ctx) =>
    loadGroupedReplyInput(ctx, runId, f.threadId),
  );
  expect(input?.messages.map((message) => message.content)).toEqual([
    "First question",
    "Second detail",
  ]);
  expect(input?.history).toEqual([]);
});
