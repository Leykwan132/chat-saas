import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { TelegramNotificationKind } from "../../shared/telegramNotificationKinds";
import {
  formatBookingNotificationMessage,
  formatHumanEscalationMessage,
} from "../../shared/telegramNotificationMessages";
import {
  formatCalendarAllDayDate,
  formatCalendarDateTime,
} from "../calendarFormatUtils";
import { bookingCalendarUrl } from "./bookingMessage";
import { dashboardOrigin } from "./dashboardOrigin";
import { enqueueTelegramAgentNotification } from "./dispatch";
import { escalationChannelLabel, escalationInboxUrl } from "./escalationMessage";
import { isNotificationKindEnabled } from "./kinds";

async function hasEnabledRecipient(ctx: MutationCtx, agentId: Id<"agents">): Promise<boolean> {
  return (await ctx.db
    .query("agentTelegramNotificationSubscriptions")
    .withIndex("by_agentId_and_status", (q) => q.eq("agentId", agentId).eq("status", "enabled"))
    .take(1)).length > 0;
}

async function canSendNotification(
  ctx: MutationCtx,
  agentId: Id<"agents">,
  kind: TelegramNotificationKind,
): Promise<boolean> {
  const agent = await ctx.db.get(agentId);
  return Boolean(agent && isNotificationKindEnabled(agent.telegramNotificationKinds, kind))
    && await hasEnabledRecipient(ctx, agentId);
}

function latestMessageText(content: string | undefined, contentType: string | undefined, preview: string | undefined): string {
  const text = content?.trim();
  if (text) return text;
  if (contentType && contentType !== "text") return contentType;
  return preview?.trim() ?? "";
}

export async function notifyHumanEscalation(ctx: MutationCtx, agentId: Id<"agents">, conversationId: Id<"conversations">, agentName: string) {
  if (!(await canSendNotification(ctx, agentId, "humanEscalation"))) return 0;
  const conversation = await ctx.db.get(conversationId);
  if (!conversation) return 0;
  const customer = conversation.customerId ? await ctx.db.get(conversation.customerId) : null;
  const sourceMessage = conversation.escalation?.sourceMessageId
    ? await ctx.db.get(conversation.escalation.sourceMessageId)
    : null;
  const contact = customer?.email?.trim() || customer?.phone?.trim() || conversation.contactAddress;
  const customerName = customer?.name?.trim() || conversation.contactName?.trim() || contact;
  const origin = await dashboardOrigin(ctx, conversation.orgId);
  return await enqueueTelegramAgentNotification(
    ctx,
    agentId,
    formatHumanEscalationMessage({
      agentName,
      customerName,
      contact,
      channel: escalationChannelLabel(conversation.service),
      latestMessage: latestMessageText(sourceMessage?.content, sourceMessage?.contentType, conversation.lastMessagePreview),
      question: conversation.escalation?.question ?? "",
      context: conversation.escalation?.context ?? "",
      openUrl: escalationInboxUrl(origin, agentId, conversationId),
    }),
  );
}

function appointmentWhen(event: Doc<"calendarEvents">) {
  if (event.allDay) {
    return {
      date: formatCalendarAllDayDate(event.startAt, event.timeZone),
      time: "All day",
    };
  }
  const formatted = formatCalendarDateTime(event.startAt, event.endAt, event.timeZone);
  return { date: formatted.date, time: formatted.timeRange };
}

export async function notifyAppointmentEvent(ctx: MutationCtx, agentId: Id<"agents">, appointmentId: Id<"calendarEvents">, agentName: string, event: "booked" | "updated" | "cancelled") {
  const kind = event === "booked" ? "bookingCreated" : event === "updated" ? "bookingUpdated" : "bookingCancelled";
  if (!(await canSendNotification(ctx, agentId, kind))) return 0;
  const appointment = await ctx.db.get(appointmentId);
  if (!appointment) return 0;
  const [agent, service, participants] = await Promise.all([
    ctx.db.get(agentId),
    appointment.appointmentServiceId ? ctx.db.get(appointment.appointmentServiceId) : null,
    ctx.db
      .query("calendarEventParticipants")
      .withIndex("by_eventId", (q) => q.eq("eventId", appointment._id))
      .take(20),
  ]);
  const customer = participants.find((participant) => participant.role === "customer");
  const when = appointmentWhen(appointment);
  const label = event === "booked" ? "New booking" : event === "updated" ? "Booking updated" : "Booking cancelled";
  const origin = await dashboardOrigin(ctx, agent?.orgId ?? "");
  return await enqueueTelegramAgentNotification(
    ctx,
    agentId,
    formatBookingNotificationMessage({
      label,
      agentName,
      customerName: customer?.displayName?.trim() || customer?.email?.trim() || "Customer",
      serviceName: service?.name?.trim() || appointment.title,
      date: when.date,
      time: when.time,
      openUrl: bookingCalendarUrl(origin, agentId, appointmentId),
    }),
  );
}
