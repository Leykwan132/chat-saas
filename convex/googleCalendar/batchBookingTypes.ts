import type { Id } from "../_generated/dataModel";
import type { GoogleCalendarWriteInput } from "./writeTypes";
import type { BookingToolResult } from "./bookingTypes";

export type BatchBookingResult = BookingToolResult & {
  batchId?: Id<"appointmentBookingBatches">;
  bookings?: Array<{
    bookingId: Id<"calendarEvents">;
    sessionId: Id<"appointmentBookingSessions">;
    startAt: number;
    endAt: number;
    assignedTo: string;
  }>;
};

export type PreparedBatchWrite = {
  kind: "local" | "google";
  connectionId?: Id<"googleCalendarConnections">;
  calendarEventId: Id<"calendarEvents">;
  sessionId: Id<"appointmentBookingSessions">;
  operationKey: string;
  event: GoogleCalendarWriteInput;
  now: number;
};

export type PrepareBatchBookResult =
  | { kind: "failed"; result: BatchBookingResult }
  | { kind: "needs_refresh"; connectionIds: Id<"googleCalendarConnections">[] }
  | {
      kind: "prepared";
      batchId: Id<"appointmentBookingBatches">;
      writes: PreparedBatchWrite[];
    };
