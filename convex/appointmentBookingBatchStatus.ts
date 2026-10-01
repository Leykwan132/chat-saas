import { v } from "convex/values";

export const AppointmentBookingBatchStatus = {
  Collecting: "collecting",
  Confirming: "confirming",
  Creating: "creating",
  Booked: "booked",
  Failed: "failed",
} as const;

export type AppointmentBookingBatchStatus =
  (typeof AppointmentBookingBatchStatus)[keyof typeof AppointmentBookingBatchStatus];

export const appointmentBookingBatchStatusValidator = v.union(
  v.literal(AppointmentBookingBatchStatus.Collecting),
  v.literal(AppointmentBookingBatchStatus.Confirming),
  v.literal(AppointmentBookingBatchStatus.Creating),
  v.literal(AppointmentBookingBatchStatus.Booked),
  v.literal(AppointmentBookingBatchStatus.Failed),
);

export function isActiveAppointmentBookingBatchStatus(
  status: AppointmentBookingBatchStatus,
) {
  return status === AppointmentBookingBatchStatus.Collecting ||
    status === AppointmentBookingBatchStatus.Confirming ||
    status === AppointmentBookingBatchStatus.Creating;
}
