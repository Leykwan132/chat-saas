import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

export const bookAppointments = internalAction({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.id("appointmentServices"),
    startAts: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      internal.appointmentBooking.batchCreate.createLocalBatch,
      args,
    );
  },
});
