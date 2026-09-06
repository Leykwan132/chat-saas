import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import type { FunctionReference } from "convex/server";
import { resolveBookingReply } from "./bookingReplyGate";

type BookingReplyGateRefs = {
  appointmentBooking: {
    currentBooking: {
      getActiveBookingSession: FunctionReference<
        "query",
        "internal",
        { conversationId: Id<"conversations"> },
        {
          success: boolean;
          hasActiveSession: boolean;
          status?: string;
          message?: string;
        }
      >;
    };
  };
};

const bookingReplyGateRefs = internal as unknown as BookingReplyGateRefs;

export async function applyBookingReplyGate(
  ctx: Pick<ActionCtx, "runQuery" | "runMutation">,
  args: {
    conversationId: Id<"conversations">;
    generatedMessages: string[];
    hadBookingBefore: boolean;
  },
): Promise<string[]> {
  await ctx.runQuery(
    bookingReplyGateRefs.appointmentBooking.currentBooking.getActiveBookingSession,
    { conversationId: args.conversationId },
  );
  const bookingAfterReply = await ctx.runQuery(
    internal.appointmentBooking.currentBooking.getCurrentBooking,
    { conversationId: args.conversationId },
  );
  const confirmation = bookingAfterReply.success
    ? await ctx.runMutation(internal.appointmentBooking.confirmations.sendBookingConfirmation, {
        conversationId: args.conversationId,
      })
    : undefined;

  return resolveBookingReply({
    generatedMessages: args.generatedMessages,
    confirmationMessage: confirmation?.success ? confirmation.confirmationMessage : undefined,
    bookingExists: bookingAfterReply.success,
    hadBookingBefore: args.hadBookingBefore,
  });
}
