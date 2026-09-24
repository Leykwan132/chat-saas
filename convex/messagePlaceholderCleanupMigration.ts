import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { upsertInboxConversationSummary } from "./inboxConversationSummary";

const migrations = new Migrations<DataModel>(components.migrations);
const placeholders = new Set(["<edit>", "<revoke>"]);

async function refreshConversationAfterMessageRemoval(
  ctx: Parameters<typeof upsertInboxConversationSummary>[0],
  conversationId: DataModel["conversations"]["document"]["_id"],
  removedMessageCreatedAt: number,
) {
  const conversation = await ctx.db.get(conversationId);
  if (conversation === null) return;
  const [latestMessage, latestIncomingMessage] = await Promise.all([
    ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) =>
        q.eq("conversationId", conversationId),
      )
      .order("desc")
      .first(),
    ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) =>
        q.eq("conversationId", conversationId),
      )
      .filter((q) => q.eq(q.field("direction"), "incoming"))
      .order("desc")
      .first(),
  ]);
  const wasLatest = conversation.lastMessageAt === removedMessageCreatedAt;
  await ctx.db.patch(conversation._id, {
    unreadCount: Math.max(0, conversation.unreadCount - 1),
    ...(wasLatest
      ? latestMessage === null
        ? {
            lastMessageAt: conversation.createdAt,
            lastMessagePreview: undefined,
            lastMessageSentByAi: undefined,
          }
        : {
            lastMessageAt: latestMessage.createdAt,
            lastMessagePreview: latestMessage.content.slice(0, 140),
            lastMessageSentByAi: latestMessage.agentId !== undefined,
          }
      : {}),
    ...(latestIncomingMessage === null
      ? { lastCustomerMessageAt: undefined }
      : { lastCustomerMessageAt: latestIncomingMessage.createdAt }),
    updatedAt: Date.now(),
  });
  await upsertInboxConversationSummary(ctx, conversationId);
}

export const removeInboundPlaceholderMessages = migrations.define({
  table: "messages",
  batchSize: 50,
  migrateOne: async (ctx, message) => {
    if (message.direction !== "incoming" || !placeholders.has(message.content)) {
      return;
    }
    if (message.agentMessageId !== undefined) {
      await ctx.runMutation(components.agent.messages.deleteMessages, {
        messageIds: [message.agentMessageId],
      });
    }
    const searchDocument = await ctx.db
      .query("inboxMessageSearchDocuments")
      .withIndex("by_messageId", (q) => q.eq("messageId", message._id))
      .unique();
    if (searchDocument !== null) {
      await ctx.db.delete(searchDocument._id);
    }
    await ctx.db.delete(message._id);
    await refreshConversationAfterMessageRemoval(
      ctx,
      message.conversationId,
      message.createdAt,
    );
  },
});

export const runRemoveInboundPlaceholderMessages = migrations.runner(
  internal.messagePlaceholderCleanupMigration.removeInboundPlaceholderMessages,
);
