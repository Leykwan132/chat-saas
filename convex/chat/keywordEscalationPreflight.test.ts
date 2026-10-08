import { expect, test, vi } from "vitest";
import { getFunctionName } from "convex/server";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { generateAiReplyWorker } from "./inbox";

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
      if (name === "chat/keywordEscalation:match") return { keyword: "human", question: "HUMAN please", sourceAgentMessageId: "customer" };
      throw new Error(`Unexpected query: ${name}`);
    }),
    runMutation: vi.fn(),
    runAction: vi.fn(),
  } as unknown as ActionCtx;
  await generateAiReplyWorker._handler(ctx, { conversationId, promptMessageId: "customer" });
  expect(queries).toEqual(["chat/inbox:internalGetConversation", "teamDeletion/access:canProcess", "chat/keywordEscalation:match"]);
});
