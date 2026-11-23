import { afterEach, expect, test, vi } from "vitest";
import { v } from "convex/values";
import { saveMessage } from "@convex-dev/agent";
import type { ModelMessage } from "ai";
import { loadPlaygroundReplyInput } from "./playgroundReplyInput";
import { replyFixture } from "../inboundReply.testUtils";
import { internalAction } from "../_generated/server";
import { components, internal } from "../_generated/api";
import {
  cancelPlaygroundReply,
  schedulePlaygroundReply,
} from "./playgroundReplyScheduling";

afterEach(() => vi.useRealTimers());

async function playgroundFixture(waitSeconds = 5) {
  const replies: string[][] = [];
  const modelInputs: ModelMessage[][] = [];
  const worker = internalAction({
    args: {
      threadId: v.string(),
      agentId: v.id("agents"),
      promptMessageId: v.string(),
      firstPromptMessageId: v.string(),
      billingUserId: v.string(),
      deductCredits: v.boolean(),
    },
    handler: async (ctx, args) => {
      const messages = await ctx.runQuery(
        components.agent.messages.listMessagesByThreadId,
        {
          threadId: args.threadId,
          order: "asc",
          paginationOpts: { numItems: 100, cursor: null },
        },
      );
      replies.push(messages.page.map((message) => message.text ?? ""));
      const input = await loadPlaygroundReplyInput(ctx, args);
      modelInputs.push(
        await input.contextHandler(ctx, {
          allMessages: [],
          search: [],
          recent: [],
          inputMessages: [{ role: "system", content: "Workflow guidance" }],
          inputPrompt: [{ role: "user", content: "Only the last message" }],
          existingResponses: [],
          threadId: args.threadId,
          userId: "owner",
        }),
      );
    },
  });
  const f = await replyFixture({
    "./chat/streaming.ts": async () => ({
      generatePlaygroundResponseAsync: worker,
    }),
  });
  await f.t.run((ctx) =>
    ctx.db.patch(f.conversationId, { service: "playground" }),
  );
  const send = (prompt: string) =>
    f.t.run(async (ctx) => {
      const conversation = await ctx.db.get(f.conversationId);
      if (!conversation) throw new Error("Conversation missing");
      const { messageId } = await saveMessage(ctx, components.agent, {
        threadId: f.threadId,
        prompt,
      });
      await schedulePlaygroundReply(
        ctx,
        conversation,
        {
          threadId: f.threadId,
          agentId: f.agentId,
          promptMessageId: messageId,
          billingUserId: "owner",
          deductCredits: false,
        },
        waitSeconds,
      );
      return messageId;
    });
  return { ...f, send, replies, modelInputs };
}

test("the model gets the refund question and closing thanks as one unanswered turn", async () => {
  const f = await playgroundFixture();
  await f.send("again");
  await f.send("tell me more about refund policy");
  await f.send("tq");
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(f.modelInputs).toHaveLength(1);
  const users = f.modelInputs[0].filter((message) => message.role === "user");
  expect(users).toHaveLength(1);
  expect(users[0].content).toContain("1. again");
  expect(users[0].content).toContain("2. tell me more about refund policy");
  expect(users[0].content).toContain("3. tq");
  expect(users[0].content).toContain("Answer every unanswered question");
  expect(users[0].content).not.toContain("Only the last message");
  expect(f.modelInputs[0][0]).toEqual({
    role: "system",
    content: "Workflow guidance",
  });
});

test("waits five seconds after the latest message and generates one reply for the burst", async () => {
  const f = await playgroundFixture();
  await f.send("Hi");
  await vi.advanceTimersByTimeAsync(2000);
  await f.send("I want to book");
  await vi.advanceTimersByTimeAsync(2000);
  await f.send("Tomorrow");
  await vi.advanceTimersByTimeAsync(4999);
  await f.t.finishInProgressScheduledFunctions();
  expect(f.replies).toEqual([]);
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(f.replies).toEqual([["Hi", "I want to book", "Tomorrow"]]);
  expect(
    (await f.t.run((ctx) => ctx.db.get(f.conversationId)))
      ?.playgroundReplyJobId,
  ).toBeUndefined();
});

test("honors a custom wait and ignores superseded callbacks", async () => {
  const f = await playgroundFixture(12);
  const oldMessage = await f.send("First");
  await vi.advanceTimersByTimeAsync(1000);
  await f.send("Second");
  await f.t.mutation(internal.chat.playgroundReplyScheduling.wake, {
    conversationId: f.conversationId,
    threadId: f.threadId,
    agentId: f.agentId,
    promptMessageId: oldMessage,
    firstPromptMessageId: oldMessage,
    billingUserId: "owner",
    deductCredits: false,
  });
  await vi.advanceTimersByTimeAsync(11999);
  await f.t.finishInProgressScheduledFunctions();
  expect(f.replies).toEqual([]);
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(f.replies).toEqual([["First", "Second"]]);
});

test("reset cancels the waiting reply", async () => {
  const f = await playgroundFixture();
  await f.send("Hello");
  await f.t.run(async (ctx) => {
    const conversation = await ctx.db.get(f.conversationId);
    if (!conversation) throw new Error("Conversation missing");
    await cancelPlaygroundReply(ctx, conversation);
    await ctx.db.delete(f.conversationId);
  });
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(f.replies).toEqual([]);
});

test("zero-second setting replies immediately", async () => {
  const f = await playgroundFixture(0);
  await f.send("Hello");
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(f.replies).toEqual([["Hello"]]);
});
