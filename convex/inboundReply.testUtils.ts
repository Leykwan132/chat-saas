import { convexTest } from "convex-test";
import workpool from "@convex-dev/workpool/test";
import agent from "@convex-dev/agent/test";
import { vi } from "vitest";
import { saveMessage, createThread } from "@convex-dev/agent";
import schema from "./schema";
import { components } from "./_generated/api";
import { queueInboundReply } from "./inboundReplyQueue";

const modules = import.meta.glob("./**/*.ts");

export async function replyFixture(
  overrides: Record<string, () => Promise<unknown>> = {},
) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-18T02:00:00Z"));
  const t = convexTest(schema, { ...modules, ...overrides });
  workpool.register(t, "inboxAiReplyWorkpool");
  agent.register(t);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const agentId = await ctx.db.insert("agents", {
      name: "Grouping",
      provider: "openrouter",
      model: "test",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: "owner",
      orgId: "",
      messageWaitSeconds: 5,
      createdAt: now,
      updatedAt: now,
    });
    const threadId = await createThread(ctx, components.agent, {
      userId: "owner",
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "",
      userId: "owner",
      service: "web",
      orgAddress: "web",
      contactAddress: "customer",
      status: "open",
      assignToAiAgent: true,
      assignedAgentId: agentId,
      threadId,
      lastMessageAt: now,
      unreadCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    return { agentId, conversationId, threadId };
  });
  const coordinator = () =>
    t.run((ctx) =>
      ctx.db
        .query("inboundReplyCoordinators")
        .withIndex("by_conversationId", (q) =>
          q.eq("conversationId", ids.conversationId),
        )
        .unique(),
    );
  const inbound = (content = "Hello", waitingForMedia = false) =>
    t.run(async (ctx) => {
      const saved = await saveMessage(ctx, components.agent, {
        threadId: ids.threadId,
        message: { role: "user", content },
      });
      await queueInboundReply(ctx, {
        conversationId: ids.conversationId,
        promptMessageId: saved.messageId,
        waitingForMedia,
      });
      return saved.messageId;
    });
  return { t, ...ids, coordinator, inbound };
}
