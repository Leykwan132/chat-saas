import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { toTimeZoneDateKey } from "./timeZoneDateKeys";

const MAX_MESSAGES_PER_OVERVIEW_CONVERSATION = 500;
const MAX_OVERVIEW_MESSAGE_ROWS = 5000;

function isAiMessageForAgent(message: Doc<"messages">, agentId: Id<"agents">) {
  return (
    message.direction === "outgoing" &&
    message.agentId === agentId &&
    message.authorUserId === undefined
  );
}

export async function listAiMessagesForAgent(
  ctx: QueryCtx,
  agentId: Id<"agents">,
  periodStartMs: number,
  periodEndMs: number,
) {
  const rows = await ctx.db
    .query("messages")
    .withIndex("by_agentId_and_createdAt", (q) =>
      q
        .eq("agentId", agentId)
        .gte("createdAt", periodStartMs)
        .lt("createdAt", periodEndMs),
    )
    .take(MAX_OVERVIEW_MESSAGE_ROWS);

  return rows.filter((message) => isAiMessageForAgent(message, agentId));
}

export async function getOutgoingMessageCountsForConversations(
  ctx: QueryCtx,
  conversations: Doc<"conversations">[],
  rangeStartMs: number,
  rangeEndMs: number,
  timeZone: string,
) {
  let totalMessagesSent = 0;
  const dailyMessageCountsByDate = new Map<string, number>();

  for (const conversation of conversations) {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) =>
        q
          .eq("conversationId", conversation._id)
          .gte("createdAt", rangeStartMs)
          .lt("createdAt", rangeEndMs),
      )
      .take(MAX_MESSAGES_PER_OVERVIEW_CONVERSATION);

    for (const message of messages) {
      if (message.direction !== "outgoing") {
        continue;
      }

      const dateKey = toTimeZoneDateKey(message.createdAt, timeZone);
      totalMessagesSent += 1;
      dailyMessageCountsByDate.set(
        dateKey,
        (dailyMessageCountsByDate.get(dateKey) ?? 0) + 1,
      );
    }
  }

  return { totalMessagesSent, dailyMessageCountsByDate };
}

export function getAiAssistedConversationStats(
  aiMessages: Doc<"messages">[],
  timeZone: string,
) {
  const firstAiMessageByConversation = new Map<
    Doc<"messages">["conversationId"],
    Doc<"messages">
  >();
  const dailyAiAssistedConversationCountsByDate = new Map<string, number>();

  for (const message of aiMessages) {
    const existing = firstAiMessageByConversation.get(message.conversationId);
    if (existing === undefined || message.createdAt < existing.createdAt) {
      firstAiMessageByConversation.set(message.conversationId, message);
    }
  }

  firstAiMessageByConversation.forEach((message) => {
    const dateKey = toTimeZoneDateKey(message.createdAt, timeZone);
    dailyAiAssistedConversationCountsByDate.set(
      dateKey,
      (dailyAiAssistedConversationCountsByDate.get(dateKey) ?? 0) + 1,
    );
  });

  return {
    aiAssistedConversationCount: firstAiMessageByConversation.size,
    dailyAiAssistedConversationCountsByDate,
  };
}
