import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

type SearchProjectionCtx = Pick<MutationCtx, "db">;

async function getSummary(
  ctx: SearchProjectionCtx,
  conversationId: Id<"conversations">,
) {
  return ctx.db
    .query("inboxConversationSummaries")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .unique();
}

function searchableText(values: Array<string | undefined>) {
  return values.filter((value): value is string => value !== undefined && value.trim() !== "").join(" ");
}

async function removeByConversation(
  ctx: SearchProjectionCtx,
  conversationId: Id<"conversations">,
) {
  const existing = await ctx.db
    .query("inboxChatSearchDocuments")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .unique();
  if (existing !== null) {
    await ctx.db.delete(existing._id);
  }
}

export async function upsertInboxChatSearchDocument(
  ctx: SearchProjectionCtx,
  conversationId: Id<"conversations">,
) {
  const document = await buildInboxChatSearchDocument(ctx, conversationId);
  if (document === null) {
    await removeByConversation(ctx, conversationId);
    return;
  }
  const existing = await ctx.db
    .query("inboxChatSearchDocuments")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .unique();
  if (existing === null) {
    await ctx.db.insert("inboxChatSearchDocuments", document);
    return;
  }
  await ctx.db.replace(existing._id, document);
}

export async function buildInboxChatSearchDocument(
  ctx: SearchProjectionCtx,
  conversationId: Id<"conversations">,
) {
  const summary = await getSummary(ctx, conversationId);
  if (summary === null) {
    return null;
  }
  const [customer, conversation] = await Promise.all([
    summary.customerId === undefined ? null : ctx.db.get(summary.customerId),
    ctx.db.get(conversationId),
  ]);
  return {
    conversationId,
    orgId: summary.orgId,
    ...(summary.userId === undefined ? {} : { userId: summary.userId }),
    ...(summary.assignedAgentId === undefined
      ? {}
      : { assignedAgentId: summary.assignedAgentId }),
    isChannelConnected: summary.isChannelConnected,
    searchText: searchableText([
      summary.contactName,
      customer?.name,
      customer?.phone,
      customer?.email,
      customer?.contactAddress,
      conversation?.contactAddress,
    ]),
  };
}

export async function removeInboxChatSearchDocument(
  ctx: SearchProjectionCtx,
  conversationId: Id<"conversations">,
) {
  await removeByConversation(ctx, conversationId);
}

export async function removeInboxMessageSearchDocument(
  ctx: SearchProjectionCtx,
  messageId: Id<"messages">,
) {
  const existing = await ctx.db
    .query("inboxMessageSearchDocuments")
    .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
    .unique();
  if (existing !== null) {
    await ctx.db.delete(existing._id);
  }
}

export async function upsertInboxMessageSearchDocument(
  ctx: SearchProjectionCtx,
  messageId: Id<"messages">,
) {
  const document = await buildInboxMessageSearchDocument(ctx, messageId);
  if (document === null) {
    await removeInboxMessageSearchDocument(ctx, messageId);
    return;
  }
  const existing = await ctx.db
    .query("inboxMessageSearchDocuments")
    .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
    .unique();
  if (existing === null) {
    await ctx.db.insert("inboxMessageSearchDocuments", document);
    return;
  }
  await ctx.db.replace(existing._id, document);
}

export async function buildInboxMessageSearchDocument(
  ctx: SearchProjectionCtx,
  messageId: Id<"messages">,
) {
  const message = await ctx.db.get(messageId);
  if (
    message === null ||
    message.contentType !== "text" ||
    message.content.trim() === ""
  ) {
    return null;
  }
  const summary = await getSummary(ctx, message.conversationId);
  if (summary === null) {
    return null;
  }
  return {
    messageId,
    conversationId: message.conversationId,
    orgId: summary.orgId,
    ...(summary.userId === undefined ? {} : { userId: summary.userId }),
    ...(summary.assignedAgentId === undefined
      ? {}
      : { assignedAgentId: summary.assignedAgentId }),
    isChannelConnected: summary.isChannelConnected,
    content: message.content,
    createdAt: message.createdAt,
  };
}

export async function refreshInboxMessageSearchDocumentsForConversation(
  ctx: SearchProjectionCtx,
  conversationId: Id<"conversations">,
) {
  const messages = ctx.db
    .query("messages")
    .withIndex("by_conversationId_and_createdAt", (q) =>
      q.eq("conversationId", conversationId),
    );
  for await (const message of messages) {
    await upsertInboxMessageSearchDocument(ctx, message._id);
  }
}
