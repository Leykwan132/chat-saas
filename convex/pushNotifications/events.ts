import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { dispatchPushEvent } from "./dispatch";

export async function notifyPushEscalation(
  ctx: MutationCtx,
  agentId: Id<"agents">,
  conversationId: Id<"conversations">,
) {
  const conversation = await ctx.db.get(conversationId);
  if (!conversation?.escalation) return;
  await dispatchPushEvent(ctx, agentId, {
    kind: "humanEscalation",
    eventKey: `escalation:${conversationId}:${conversation.escalation.escalatedAt}`,
    title: "A conversation needs your attention",
    body: "Open your inbox to respond.",
    path: `/dashboard/${agentId}/inbox?conversation=${conversationId}`,
  });
}

export async function notifyPushBooking(
  ctx: MutationCtx,
  agentId: Id<"agents">,
  appointmentId: Id<"calendarEvents">,
  event: "booked" | "updated" | "cancelled",
) {
  const appointment = await ctx.db.get(appointmentId);
  if (!appointment) return;
  const kind =
    event === "booked"
      ? "bookingCreated"
      : event === "updated"
        ? "bookingUpdated"
        : "bookingCancelled";
  await dispatchPushEvent(ctx, agentId, {
    kind,
    eventKey: `booking:${appointmentId}:${kind}:${appointment.updatedAt}`,
    title:
      event === "booked"
        ? "New booking"
        : event === "updated"
          ? "Booking updated"
          : "Booking cancelled",
    body: "Open your calendar for details.",
    path: `/dashboard/${agentId}/calendar`,
  });
}
