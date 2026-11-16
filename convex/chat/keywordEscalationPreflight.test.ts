import { beforeEach, expect, test, vi } from "vitest";
import { getFunctionName } from "convex/server";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { generateAiReplyWorker } from "./inbox";
import { escalateKeywordMatch, execute } from "./keywordEscalationPreflight";
import { sendEscalationMessageThenEscalate } from "./threads";
import { inboxAiReplyPool } from "../inboxPools";

vi.mock("./threads", async (original) => ({
  ...await original<typeof import("./threads")>(),
  sendEscalationMessageThenEscalate: vi.fn(async () => true),
  buildAgent: vi.fn(() => { throw new Error("Agent must not be invoked"); }),
}));

test("matching customer messages exit before credits, typing or agent generation", async () => {
  const queries: string[] = [];
  const conversationId = "conversation" as Id<"conversations">;
  const ctx = {
    runQuery: vi.fn(async (reference) => {
      const name = getFunctionName(reference);
      queries.push(name);
      if (name === "chat/inbox:internalGetConversation") return { _id: conversationId, status: "open", assignToAiAgent: true, assignedAgentId: "agent", orgId: "org" };
      if (name === "teamDeletion/access:canProcess") return true;
      if (name === "leadRouting/audience:canReplyToConversation") return true;
      if (name === "chat/keywordEscalation:match") return { keyword: "human", question: "HUMAN please", sourceAgentMessageId: "customer" };
      throw new Error(`Unexpected query: ${name}`);
    }),
    runMutation: vi.fn(),
    runAction: vi.fn(),
  } as unknown as ActionCtx;
  await generateAiReplyWorker._handler(ctx, { conversationId, promptMessageId: "customer" });
  expect(queries).toEqual(["chat/inbox:internalGetConversation", "teamDeletion/access:canProcess", "leadRouting/audience:canReplyToConversation", "chat/keywordEscalation:match"]);
});


vi.mock("../inboxPools", async (original) => ({
  ...await original<typeof import("../inboxPools")>(),
  inboxAiReplyPool: { enqueueAction: vi.fn() },
}));

beforeEach(() => {
  vi.mocked(sendEscalationMessageThenEscalate).mockResolvedValue(true);
  vi.mocked(inboxAiReplyPool.enqueueAction).mockClear();
});

test("a disabled handoff does not consume the normal AI reply", async () => {
  vi.mocked(sendEscalationMessageThenEscalate).mockResolvedValue(false);
  const ctx = { runQuery: async () => ({ keyword: "human", question: "human please", sourceAgentMessageId: "source" }) } as unknown as ActionCtx;
  expect(await escalateKeywordMatch(ctx, { conversationId: "conversation" as Id<"conversations">, promptMessageId: "source" })).toBe(false);
});

test("a scheduled handoff rejected after disabling queues the normal AI reply", async () => {
  vi.mocked(sendEscalationMessageThenEscalate).mockResolvedValue(false);
  const ctx = {} as ActionCtx;
  const conversationId = "conversation" as Id<"conversations">;
  await execute._handler(ctx, { conversationId, keyword: "human", question: "human please", sourceAgentMessageId: "source" });
  expect(inboxAiReplyPool.enqueueAction).toHaveBeenCalledWith(ctx, expect.anything(), { conversationId, promptMessageId: "source" });
});
