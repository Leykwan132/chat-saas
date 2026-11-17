import { afterEach, expect, test, vi } from "vitest";
import { v } from "convex/values";
import { replyFixture } from "./inboundReply.testUtils";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { loadGroupedReplyInput } from "./chat/inboundReplyInput";

afterEach(() => vi.useRealTimers());

test("real delayed workpool groups a burst into one worker invocation and acknowledges delivery", async () => {
  const generated: unknown[] = [];
  let threadId = "";
  const worker = internalAction({
    args: {
      conversationId: v.id("conversations"),
      promptMessageId: v.optional(v.string()),
      inboundExternalId: v.optional(v.string()),
      sourceMessageUpdatedAt: v.optional(v.number()),
      replyRunId: v.id("inboundReplyRuns"),
    },
    handler: async (ctx, args) => {
      if (
        !(await ctx.runMutation(internal.inboundReplyRuns.claimGeneration, {
          runId: args.replyRunId,
        }))
      )
        return;
      const input = await loadGroupedReplyInput(ctx, args.replyRunId, threadId);
      generated.push(input?.messages.map((message) => message.content));
      if (
        !(await ctx.runMutation(internal.inboundReplyRuns.beginDelivery, {
          runId: args.replyRunId,
        }))
      )
        throw new Error("Delivery claim failed");
      await ctx.runMutation(internal.inboundReplyRuns.delivered, {
        runId: args.replyRunId,
      });
    },
  });
  const f = await replyFixture({
    "./chat/inbox.ts": async () => ({ generateAiReplyWorker: worker }),
  });
  threadId = f.threadId;
  await f.inbound("Hi");
  vi.setSystemTime(Date.now() + 2000);
  await f.inbound("I want to book");
  vi.setSystemTime(Date.now() + 2000);
  await f.inbound("Tomorrow");
  expect(generated).toHaveLength(0);
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(generated).toEqual([["Hi", "I want to book", "Tomorrow"]]);
  const state = await f.coordinator();
  expect(state).toMatchObject({ latestSequence: 3, answeredSequence: 3 });
  expect(state?.activeRunId).toBeUndefined();
  expect(state?.wakeWorkId).toBeUndefined();
  expect(state?.lastError).toBeUndefined();
});
