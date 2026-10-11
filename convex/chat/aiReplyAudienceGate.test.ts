import { expect, test, vi } from "vitest";
import { getFunctionName } from "convex/server";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { generateAiReplyWorker } from "./inbox";

test("excluded customers stop before agent generation or channel actions", async () => {
  const conversationId = "conversation" as Id<"conversations">;
  const ctx = {
    runQuery: vi.fn(async (reference) => {
      const name = getFunctionName(reference);
      if (name === "chat/inbox:internalGetConversation") return { _id: conversationId,
        status: "open", assignToAiAgent: true, assignedAgentId: "agent", orgId: "org" };
      if (name === "leadRouting/audience:canReplyToConversation") return false;
      if (name === "teamDeletion/access:canProcess") return true;
      throw new Error(`Excluded customer reached processing: ${name}`);
    }),
    runMutation: vi.fn(), runAction: vi.fn(),
  } as unknown as ActionCtx;
  await expect(generateAiReplyWorker._handler(ctx, { conversationId, promptMessageId: "customer" }))
    .resolves.toBeUndefined();
});
