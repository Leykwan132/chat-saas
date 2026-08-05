import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { enqueueTelegramAgentNotification } from "./dispatch";

function dashboardUrl(path: string): string {
  const baseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("APP_BASE_URL is not configured");
  return `${baseUrl}${path}`;
}

async function hasEnabledRecipient(ctx: MutationCtx, agentId: Id<"agents">): Promise<boolean> {
  return (await ctx.db
    .query("agentTelegramNotificationSubscriptions")
    .withIndex("by_agentId_and_status", (q) => q.eq("agentId", agentId).eq("status", "enabled"))
    .take(1)).length > 0;
}

export async function notifyHumanEscalation(ctx: MutationCtx, agentId: Id<"agents">, conversationId: Id<"conversations">, agentName: string) {
  if (!(await hasEnabledRecipient(ctx, agentId))) return 0;
  return await enqueueTelegramAgentNotification(
    ctx,
    agentId,
    `🚨 Human escalation\n\n${agentName} needs attention.\n\nOpen: ${dashboardUrl(`/inbox/${conversationId}`)}`,
  );
}

export async function notifyAppointmentEvent(ctx: MutationCtx, agentId: Id<"agents">, appointmentId: Id<"calendarEvents">, agentName: string, event: "booked" | "updated" | "cancelled") {
  if (!(await hasEnabledRecipient(ctx, agentId))) return 0;
  const label = event === "booked" ? "New booking" : event === "updated" ? "Booking updated" : "Booking cancelled";
  return await enqueueTelegramAgentNotification(
    ctx,
    agentId,
    `📅 ${label}\n\n${agentName}\n\nOpen: ${dashboardUrl(`/calendar?eventId=${appointmentId}`)}`,
  );
}
