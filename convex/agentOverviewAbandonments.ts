import type { Doc } from "./_generated/dataModel";

const ABANDONMENT_QUIET_WINDOW_MS = 24 * 60 * 60 * 1000;

function getBookedConversationIds(bookings: Doc<"calendarEvents">[]) {
  const ids = new Set<string>();
  for (const booking of bookings) {
    if (booking.conversationId !== undefined) {
      ids.add(booking.conversationId);
    }
  }
  return ids;
}

function isAbandonedConversation(
  conversation: Doc<"conversations">,
  bookedConversationIds: Set<string>,
  now: number,
) {
  const lastCustomerMessageAt = conversation.lastCustomerMessageAt;
  if (lastCustomerMessageAt === undefined) return false;
  if (conversation.status !== "open") return false;
  if (conversation.escalation !== undefined) return false;
  if (bookedConversationIds.has(conversation._id)) return false;
  if (lastCustomerMessageAt < conversation.lastMessageAt) return false;
  return now - lastCustomerMessageAt >= ABANDONMENT_QUIET_WINDOW_MS;
}

export function listAbandonedConversations(
  conversations: Doc<"conversations">[],
  bookings: Doc<"calendarEvents">[],
  now = Date.now(),
) {
  const bookedConversationIds = getBookedConversationIds(bookings);
  return conversations.filter((conversation) =>
    isAbandonedConversation(conversation, bookedConversationIds, now),
  );
}

export function countAbandonedConversations(
  conversations: Doc<"conversations">[],
  bookings: Doc<"calendarEvents">[],
  now = Date.now(),
) {
  return listAbandonedConversations(conversations, bookings, now).length;
}
