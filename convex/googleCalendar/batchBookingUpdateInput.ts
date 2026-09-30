import { parseAvailabilityIso } from "../appointmentBooking/availabilityDateTime";
import type {
  BatchBookingUpdateInput,
  BatchBookingUpdateInputResult,
} from "./batchBookingUpdateTypes";

export function parseBatchBookingUpdates(
  inputs: BatchBookingUpdateInput[],
  timeZone: string,
): BatchBookingUpdateInputResult {
  if (inputs.length < 1 || inputs.length > 10) {
    return { success: false, message: "Provide between 1 and 10 booking updates." };
  }
  if (new Set(inputs.map((input) => input.bookingId)).size !== inputs.length) {
    return { success: false, message: "Each booking can be updated only once." };
  }
  const updates = inputs.map((input) => ({
    bookingId: input.bookingId,
    startAt: parseAvailabilityIso(input.startTimeIso, timeZone),
  }));
  if (updates.some((update) => update.startAt === null)) {
    return { success: false, message: "One or more booking times are invalid." };
  }
  return {
    success: true,
    updates: updates.map((update) => ({
      bookingId: update.bookingId,
      startAt: update.startAt as number,
    })),
  };
}
