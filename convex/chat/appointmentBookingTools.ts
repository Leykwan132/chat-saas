import { createTool } from "@convex-dev/agent";
import type { ToolSet } from "ai";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { parseAvailabilityIso } from "../appointmentBooking/availabilityDateTime";
import { queryActiveBookingSession } from "./bookingToolSession";

export function parseBatchAppointmentTimes(inputs: string[], timeZone: string) {
  if (inputs.length < 2 || inputs.length > 10) {
    return { success: false as const, message: "Provide between 2 and 10 appointment times." };
  }
  const startAts = inputs.map((value) => parseAvailabilityIso(value, timeZone));
  if (startAts.some((value) => value === null)) {
    return { success: false as const, message: "One or more appointment times are invalid." };
  }
  return { success: true as const, startAts: startAts as number[] };
}

export function registerBatchAppointmentBookingTools(args: {
  tools: ToolSet;
  conversationId: Id<"conversations">;
  defaultTimeZone: string;
}) {
  const { tools, conversationId, defaultTimeZone } = args;
  tools.bookAppointments = createTool({
    description:
      "Creates every appointment in the active confirmed booking batch. Pass the exact ordered list returned by checkAvailability. The operation reports success only when all appointments are created.",
    inputSchema: z.object({
      serviceId: z.string().describe("The selected Services service ID."),
      startTimesIso: z.array(z.string()).min(2).max(10).describe(
        "The exact ordered list of confirmed appointment start times from checkAvailability.",
      ),
      customerConfirmed: z.literal(true).describe(
        "Set only when the customer explicitly requested or confirmed every listed time.",
      ),
    }),
    execute: async (ctx, input) => {
      const parsed = parseBatchAppointmentTimes(input.startTimesIso, defaultTimeZone);
      if (!parsed.success) return parsed;
      const active = await queryActiveBookingSession(ctx, conversationId);
      if (!active.hasActiveSession) return active;
      return await ctx.runAction(
        internal.appointmentBooking.bookAppointments.bookAppointments,
        {
          conversationId,
          serviceId: input.serviceId as Id<"appointmentServices">,
          startAts: parsed.startAts,
        },
      );
    },
  });

  tools.sendBatchBookingConfirmation = createTool({
    description:
      "Builds one final confirmation message containing every appointment after bookAppointments succeeds. Send confirmationMessage exactly as written.",
    inputSchema: z.object({}),
    execute: async (ctx) => {
      return await ctx.runMutation(
        internal.appointmentBooking.confirmations.sendBatchBookingConfirmation,
        { conversationId },
      );
    },
  });
}
