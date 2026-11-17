import { convexTest } from "convex-test";
import { vi } from "vitest";
import schema from "./schema";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { observeHumanReply } from "./autoDeescalationRuntime";

const modules = import.meta.glob("./**/*.ts");

export async function normalReplyFixture(enabled = true) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-18T01:00:00Z"));
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const agentId = await ctx.db.insert("agents", {
      name: "Normal reply agent",
      provider: "openrouter",
      model: "test",
      systemPrompt: "test",
      templateKey: "blank",
      fileSize: 0,
      userId: "owner",
      orgId: "org",
      createdAt: now,
      updatedAt: now,
      autoResume: {
        enabled,
        inactivityMinutes: 5,
        keywords: ["Done"],
        revision: 1,
        activationRevision: 1,
      },
      autoDeescalation: {
        enabled: false,
        inactivityMinutes: 30,
        keywords: ["Escalation resolved"],
        revision: 1,
        activationRevision: 1,
      },
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "org",
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "customer",
      status: "open",
      assignedAgentId: agentId,
      assignedUserId: "teammate",
      assignToAiAgent: false,
      threadId: "thread",
      lastMessageAt: now,
      unreadCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    return { agentId, conversationId };
  });
  const timer = () =>
    t.run((ctx) =>
      ctx.db
        .query("autoDeescalationTimers")
        .withIndex("by_conversationId", (q) =>
          q.eq("conversationId", ids.conversationId),
        )
        .unique(),
    );
  const conversation = () => t.run((ctx) => ctx.db.get(ids.conversationId));
  const reply = (patch: Partial<Doc<"messages">> = {}) =>
    t.run(async (ctx) => {
      const messageId = await ctx.db.insert("messages", {
        orgId: "org",
        conversationId: ids.conversationId,
        service: "whatsapp",
        orgAddress: "business",
        contactAddress: "customer",
        direction: "outgoing",
        contentType: "text",
        content: "Helping you",
        status: "sent",
        createdAt: Date.now(),
        ...patch,
      });
      const message = await ctx.db.get(messageId);
      if (!message) throw new Error("Missing reply");
      await observeHumanReply(ctx, null, message);
      return messageId;
    });
  const expire = async () => {
    const current = await timer();
    if (!current) throw new Error("Missing timer");
    await t.mutation(internal.autoDeescalation.expire, {
      timerId: current._id,
      revision: current.revision,
    });
  };
  const patchConversation = async (patch: Partial<Doc<"conversations">>) => {
    const { triggers } = await import("./triggers");
    await t.run(async (raw) => {
      await triggers.wrapDB(raw).db.patch(ids.conversationId, patch);
    });
  };
  return { t, ...ids, timer, conversation, reply, expire, patchConversation };
}
