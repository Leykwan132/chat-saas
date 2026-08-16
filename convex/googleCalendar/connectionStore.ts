import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { GOOGLE_CALENDAR_PROVIDER } from "./constants";
import { googleCalendarConnectionStateValidator } from "./contracts";

export const reserve = internalMutation({
  args: {
    userId: v.id("users"),
    primaryCalendarId: v.literal("primary"),
    timeZone: v.string(),
    state: googleCalendarConnectionStateValidator,
  },
  returns: v.id("googleCalendarConnections"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("googleCalendarConnections")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (existing !== null) {
      return existing._id;
    }
    const user = await ctx.db.get(args.userId);
    if (user === null) {
      throw new Error("User not found");
    }
    const now = Date.now();
    return await ctx.db.insert("googleCalendarConnections", {
      userId: user._id,
      workosUserId: user.workosUserId,
      provider: GOOGLE_CALENDAR_PROVIDER,
      primaryCalendarId: args.primaryCalendarId,
      timeZone: args.timeZone,
      state: args.state,
      dirtyGeneration: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});
