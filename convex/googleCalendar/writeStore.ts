import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { googleCalendarWriteActionValidator } from "./contracts";

export const reserve = internalMutation({
  args: {
    connectionId: v.id("googleCalendarConnections"),
    calendarEventId: v.optional(v.id("calendarEvents")),
    operationKey: v.string(),
    action: googleCalendarWriteActionValidator,
  },
  returns: v.id("googleCalendarWriteOperations"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("googleCalendarWriteOperations")
      .withIndex("by_operationKey", (q) => q.eq("operationKey", args.operationKey))
      .unique();
    if (existing !== null) {
      return existing._id;
    }
    const connection = await ctx.db.get(args.connectionId);
    if (connection === null) {
      throw new Error("Google Calendar connection not found");
    }
    const now = Date.now();
    return await ctx.db.insert("googleCalendarWriteOperations", {
      connectionId: connection._id,
      calendarEventId: args.calendarEventId,
      operationKey: args.operationKey,
      action: args.action,
      state: "pending",
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});
