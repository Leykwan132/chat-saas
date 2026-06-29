import { v } from "convex/values";

export const AppointmentBookingSessionStatus = {
  Collecting: "collecting",
  Confirming: "confirming",
  Editing: "editing",
  Booked: "booked",
  Cancelled: "cancelled",
} as const;

export type AppointmentBookingSessionStatus =
  (typeof AppointmentBookingSessionStatus)[keyof typeof AppointmentBookingSessionStatus];

export const appointmentBookingSessionStatusValidator = v.union(
  v.literal(AppointmentBookingSessionStatus.Collecting),
  v.literal(AppointmentBookingSessionStatus.Confirming),
  v.literal(AppointmentBookingSessionStatus.Editing),
  v.literal(AppointmentBookingSessionStatus.Booked),
  v.literal(AppointmentBookingSessionStatus.Cancelled),
);

const ACTIVE_APPOINTMENT_BOOKING_SESSION_STATUSES: readonly AppointmentBookingSessionStatus[] = [
  AppointmentBookingSessionStatus.Collecting,
  AppointmentBookingSessionStatus.Confirming,
  AppointmentBookingSessionStatus.Editing,
];

export function isActiveAppointmentBookingSessionStatus(
  status: AppointmentBookingSessionStatus,
): boolean {
  return (ACTIVE_APPOINTMENT_BOOKING_SESSION_STATUSES as readonly string[]).includes(status);
}

export function createEmptyAppointmentBookingSessionStatusCounts(): Record<
  AppointmentBookingSessionStatus,
  number
> {
  return {
    [AppointmentBookingSessionStatus.Collecting]: 0,
    [AppointmentBookingSessionStatus.Confirming]: 0,
    [AppointmentBookingSessionStatus.Editing]: 0,
    [AppointmentBookingSessionStatus.Booked]: 0,
    [AppointmentBookingSessionStatus.Cancelled]: 0,
  };
}
