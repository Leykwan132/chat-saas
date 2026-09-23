import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { AppointmentBookingSessionStatus } from "./appointmentBookingSessionStatus";

type SummaryCtx = Pick<MutationCtx, "db">;

async function hasCurrentBooking(
  ctx: SummaryCtx,
  conversationId: Id<"conversations">,
) {
  const sessions = await ctx.db
    .query("appointmentBookingSessions")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .collect();
  const currentSession = sessions
    .filter(
      (session) =>
        session.calendarEventId !== undefined &&
        (session.status === AppointmentBookingSessionStatus.Booked ||
          session.status === AppointmentBookingSessionStatus.Editing),
    )
    .sort((left, right) => right.updatedAt - left.updatedAt)[0];
  if (currentSession?.calendarEventId === undefined) {
    return false;
  }
  const event = await ctx.db.get(currentSession.calendarEventId);
  return event !== null && event.status !== "cancelled";
}

export async function removeInboxConversationSummary(
  ctx: SummaryCtx,
  conversationId: Id<"conversations">,
) {
  const existing = await ctx.db
    .query("inboxConversationSummaries")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .unique();
  if (existing !== null) {
    await ctx.db.delete(existing._id);
  }
}

export async function upsertInboxConversationSummary(
  ctx: SummaryCtx,
  conversationId: Id<"conversations">,
) {
  const conversation = await ctx.db.get(conversationId);
  if (
    conversation === null ||
    conversation.service === "playground" ||
    conversation.channelId === undefined
  ) {
    await removeInboxConversationSummary(ctx, conversationId);
    return;
  }
  const [channel, customer, hasBooking] = await Promise.all([
    ctx.db.get(conversation.channelId),
    conversation.customerId === undefined ? null : ctx.db.get(conversation.customerId),
    hasCurrentBooking(ctx, conversationId),
  ]);
  if (channel === null) {
    await removeInboxConversationSummary(ctx, conversationId);
    return;
  }
  const summary = {
    conversationId,
    ...(conversation.customerId === undefined
      ? {}
      : { customerId: conversation.customerId }),
    channelId: conversation.channelId,
    orgId: conversation.orgId,
    ...(conversation.userId === undefined ? {} : { userId: conversation.userId }),
    ...(conversation.assignedAgentId === undefined
      ? {}
      : { assignedAgentId: conversation.assignedAgentId }),
    contactName: customer?.name ?? conversation.contactName,
    service: conversation.service,
    ...(conversation.lastMessagePreview === undefined
      ? {}
      : { lastMessagePreview: conversation.lastMessagePreview }),
    lastMessageAt: conversation.lastMessageAt,
    unreadCount: conversation.unreadCount,
    status: conversation.status,
    ...(conversation.assignedUserId === undefined
      ? {}
      : { assignedUserId: conversation.assignedUserId }),
    tags: customer?.tags ?? [],
    ...(customer?.leadTemperature === undefined
      ? {}
      : { leadTemperature: customer.leadTemperature }),
    isEscalated: conversation.escalation !== undefined,
    hasBooking,
    isChannelConnected: channel.status === "connected",
    updatedAt: conversation.updatedAt,
  };
  const existing = await ctx.db
    .query("inboxConversationSummaries")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .unique();
  if (existing === null) {
    await ctx.db.insert("inboxConversationSummaries", summary);
    return;
  }
  await ctx.db.replace(existing._id, summary);
}

export async function refreshInboxSummariesForCustomer(
  ctx: SummaryCtx,
  customerId: Id<"customers">,
) {
  const summaries = await ctx.db
    .query("inboxConversationSummaries")
    .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
    .collect();
  for (const summary of summaries) {
    await upsertInboxConversationSummary(ctx, summary.conversationId);
  }
}

export async function refreshInboxSummariesForChannel(
  ctx: SummaryCtx,
  channelId: Id<"channels">,
) {
  const summaries = await ctx.db
    .query("inboxConversationSummaries")
    .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
    .collect();
  for (const summary of summaries) {
    await upsertInboxConversationSummary(ctx, summary.conversationId);
  }
}

export async function refreshInboxSummariesForCalendarEvent(
  ctx: SummaryCtx,
  calendarEventId: Id<"calendarEvents">,
) {
  const sessions = await ctx.db
    .query("appointmentBookingSessions")
    .withIndex("by_calendarEventId", (q) => q.eq("calendarEventId", calendarEventId))
    .collect();
  const conversationIds = new Set<Id<"conversations">>();
  for (const session of sessions) {
    if (session.conversationId !== undefined) {
      conversationIds.add(session.conversationId);
    }
  }
  for (const conversationId of conversationIds) {
    await upsertInboxConversationSummary(ctx, conversationId);
  }
}
