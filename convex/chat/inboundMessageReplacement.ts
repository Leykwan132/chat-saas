import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const REVOKED_INBOUND_MESSAGE_TEXT = "This message was deleted";

type InboundMessageReplacement = {
  updated: boolean;
  aiSources: Array<{ conversationId: Id<"conversations">; agentMessageId: string }>;
};

export async function replaceIncomingMessage(
  ctx: MutationCtx,
  args: {
    channelId: Id<"channels">;
    originalExternalId: string;
    content: string;
    timestampMs: number;
    state: "edited" | "revoked";
    eventExternalId?: string;
  },
): Promise<InboundMessageReplacement> {
  const messages = (await ctx.db
    .query("messages")
    .withIndex("by_externalId", (q) => q.eq("externalId", args.originalExternalId))
    .take(20))
    .filter(
      (message) =>
        message.channelId === args.channelId &&
        message.direction === "incoming" &&
        message.contentType === "text" &&
        (args.state === "revoked" || message.revokedAt === undefined),
    );
  if (messages.length === 0) return { updated: false, aiSources: [] };
  if (
    args.state === "edited" &&
    args.eventExternalId !== undefined &&
    messages.every((message) => message.lastEditEventId === args.eventExternalId)
  ) {
    return { updated: false, aiSources: [] };
  }

  for (const message of messages) {
    await ctx.db.patch(message._id, {
      content: args.content,
      ...(args.state === "edited"
        ? { editedAt: args.timestampMs, lastEditEventId: args.eventExternalId }
        : { revokedAt: args.timestampMs }),
    });
  }

  const agentMessageIds = new Set(
    messages.flatMap((message) => message.agentMessageId ? [message.agentMessageId] : []),
  );
  for (const messageId of agentMessageIds) {
    await ctx.runMutation(components.agent.messages.updateMessage, {
      messageId,
      patch: {
        message: { role: "user", content: args.content },
        status: "success",
      },
    });
  }

  const conversationIds = new Set(messages.map((message) => message.conversationId));
  for (const conversationId of conversationIds) {
    const conversation = await ctx.db.get(conversationId);
    const latestMessage = messages.find(
      (message) => message.conversationId === conversationId && message.createdAt === conversation?.lastMessageAt,
    );
    if (conversation !== null && latestMessage !== undefined) {
      await ctx.db.patch(conversation._id, {
        lastMessagePreview: args.content.slice(0, 140),
        lastMessageSentByAi: false,
        updatedAt: args.timestampMs,
      });
    }
  }
  return {
    updated: true,
    aiSources:
      args.state === "edited"
        ? [...agentMessageIds].map((agentMessageId) => {
            const message = messages.find((item) => item.agentMessageId === agentMessageId)!;
            return { conversationId: message.conversationId, agentMessageId };
          })
        : [],
  };
}
