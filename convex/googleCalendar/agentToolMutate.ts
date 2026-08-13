import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { guardKilobotConversationEvent } from "./agentToolGuard";

export const guardEvent = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    eventId: v.id("calendarEvents"),
  },
  returns: v.union(
    v.object({
      kind: v.literal("ok"),
      serviceId: v.optional(v.id("appointmentServices")),
      startAt: v.number(),
    }),
    v.object({
      kind: v.literal("not_found"),
      success: v.literal(false),
      message: v.string(),
    }),
    v.object({
      kind: v.literal("forbidden"),
      success: v.literal(false),
      message: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    const guard = guardKilobotConversationEvent(event, args.conversationId);
    if (guard.kind === "ok") {
      return {
        kind: "ok" as const,
        serviceId: guard.event.appointmentServiceId,
        startAt: guard.event.startAt,
      };
    }
    if (guard.kind !== "not_found" && guard.kind !== "forbidden") {
      throw new Error(guard.message);
    }
    return { kind: guard.kind, success: false as const, message: guard.message };
  },
});
