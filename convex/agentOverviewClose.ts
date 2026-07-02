import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { toTimeZoneDateKey } from "./timeZoneDateKeys";

const MAX_MESSAGES_PER_CLOSE = 500;

function isAiMessageForAgent(
  message: Doc<"messages">,
  agentId: Id<"agents">,
) {
  return (
    message.direction === "outgoing" &&
    message.agentId === agentId &&
    message.authorUserId === undefined
  );
}

export async function getMessagesToCloseStats(
  ctx: QueryCtx,
  agentId: Id<"agents">,
  bookings: Doc<"calendarEvents">[],
  timeZone: string,
) {
  let totalMessages = 0;
  let conversationsWithBookings = 0;
  const dailyCloseStatsByDate = new Map<
    string,
    { messagesToClose: number; conversationsClosed: number }
  >();

  for (const booking of bookings) {
    const conversationId = booking.conversationId;
    if (conversationId === undefined) {
      continue;
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) =>
        q.eq("conversationId", conversationId).lte("createdAt", booking.createdAt),
      )
      .take(MAX_MESSAGES_PER_CLOSE);
    const messagesToClose = messages.filter(
      (message) =>
        message.direction === "incoming" ||
        isAiMessageForAgent(message, agentId),
    ).length;
    const dateKey = toTimeZoneDateKey(booking.createdAt, timeZone);
    const dailyStats = dailyCloseStatsByDate.get(dateKey) ?? {
      messagesToClose: 0,
      conversationsClosed: 0,
    };

    totalMessages += messagesToClose;
    conversationsWithBookings += 1;
    dailyStats.messagesToClose += messagesToClose;
    dailyStats.conversationsClosed += 1;
    dailyCloseStatsByDate.set(dateKey, dailyStats);
  }

  return {
    avgMessagesToClose:
      conversationsWithBookings === 0
        ? null
        : totalMessages / conversationsWithBookings,
    dailyCloseStatsByDate,
  };
}
