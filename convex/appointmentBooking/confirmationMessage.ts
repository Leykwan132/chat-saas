import type { Doc, Id } from "../_generated/dataModel";
import { DEFAULT_TEAM_TIME_ZONE } from "../teamHelpers";
import type { CollectedFields } from "./types";
import {
  buildBookingConfirmationMessage,
  formatBookingDateTime,
  formatCollectedFieldValue,
} from "./fields";

export type BookingConfirmationAppointment = {
  startAt: number;
  endAt: number;
  bookingId: Id<"calendarEvents">;
  assignedTo?: string;
  meetingLink?: string;
};

export function buildBookingsConfirmationMessage(args: {
  service: Pick<Doc<"appointmentServices">, "name" | "fields" | "locationMode" | "timeZone">;
  collectedFields: CollectedFields;
  timeZone?: string;
  appointments: BookingConfirmationAppointment[];
}) {
  const timeZone = args.timeZone ?? args.service.timeZone ?? DEFAULT_TEAM_TIME_ZONE;
  const appointments = [...args.appointments].sort((left, right) => left.startAt - right.startAt);
  const first = appointments[0];
  if (first === undefined) {
    throw new Error("Booking details could not be found.");
  }
  if (appointments.length === 1) {
    return buildBookingConfirmationMessage({
      service: args.service,
      collectedFields: args.collectedFields,
      startAt: first.startAt,
      endAt: first.endAt,
      timeZone,
      assignedTo: first.assignedTo,
      bookingId: first.bookingId,
      meetingLink: first.meetingLink,
    });
  }

  const customerDetailLines = args.service.fields
    .filter((field) => field.key !== "date" && field.key !== "time")
    .map((field) => {
      const value = formatCollectedFieldValue(args.collectedFields[field.key]);
      return value ? `${field.label}: ${value}` : undefined;
    })
    .filter((line): line is string => line !== undefined);
  const appointmentLines = appointments.map((appointment) => {
    const { date, timeRange } = formatBookingDateTime(
      appointment.startAt,
      appointment.endAt,
      timeZone,
    );
    return [
      `Date: ${date}`,
      `Time: ${timeRange}`,
      appointment.assignedTo ? `Team Member: ${appointment.assignedTo}` : undefined,
      args.service.locationMode === "remote" && appointment.meetingLink?.trim()
        ? `Meeting link: ${appointment.meetingLink.trim()}`
        : undefined,
      `Booking reference: ${appointment.bookingId}`,
    ]
      .filter((line): line is string => line !== undefined)
      .join("\n");
  });
  return [
    "Your bookings are confirmed!",
    `Service: ${args.service.name}`,
    appointmentLines.join("\n\n"),
    customerDetailLines.length > 0 ? customerDetailLines.join("\n") : undefined,
    "Thank you — we look forward to seeing you!",
  ]
    .filter((section): section is string => section !== undefined)
    .join("\n\n");
}
