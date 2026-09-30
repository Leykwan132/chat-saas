import type { Id } from "../_generated/dataModel";
import type { BookingToolResult } from "./bookingTypes";
import type { GoogleCalendarWriteInput } from "./writeTypes";

export type BatchBookingUpdateInput = {
  bookingId: Id<"calendarEvents">;
  startTimeIso: string;
};

export type BatchBookingUpdate = {
  bookingId: Id<"calendarEvents">;
  startAt: number;
};

export type BatchBookingUpdateInputResult =
  | { success: true; updates: BatchBookingUpdate[] }
  | { success: false; message: string };

export type BatchBookingUpdateResult = BookingToolResult & {
  batchId?: Id<"appointmentBookingUpdateBatches">;
  bookings?: Array<{
    bookingId: Id<"calendarEvents">;
    serviceName: string;
    startAt: number;
    endAt: number;
    date: string;
    timeRange: string;
    assignedTo: string;
  }>;
  failures?: Array<{ bookingId: Id<"calendarEvents">; message: string }>;
};

export type PreparedBatchUpdateWrite = {
  calendarEventId: Id<"calendarEvents">;
  connectionId: Id<"googleCalendarConnections">;
  event: GoogleCalendarWriteInput;
  original: GoogleCalendarWriteInput;
  now: number;
};

export type PrepareBatchUpdateResult =
  | { kind: "failed"; result: BatchBookingUpdateResult }
  | { kind: "completed"; result: BatchBookingUpdateResult }
  | { kind: "needs_refresh"; connectionIds: Id<"googleCalendarConnections">[] }
  | {
      kind: "prepared";
      batchId: Id<"appointmentBookingUpdateBatches">;
      writes: PreparedBatchUpdateWrite[];
    };

export function batchUpdateOperationKey(
  batchId: Id<"appointmentBookingUpdateBatches">,
  calendarEventId: Id<"calendarEvents">,
  action: "update" | "restore",
) {
  return `bookingUpdateBatch:${batchId}:${calendarEventId}:${action}`;
}
