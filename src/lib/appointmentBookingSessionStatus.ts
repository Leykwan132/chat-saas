export const AppointmentBookingSessionStatus = {
  Collecting: "collecting",
  Confirming: "confirming",
  Booked: "booked",
  Cancelled: "cancelled",
} as const;

export type AppointmentBookingSessionStatus =
  (typeof AppointmentBookingSessionStatus)[keyof typeof AppointmentBookingSessionStatus];

export type AppointmentBookingSessionStatusCounts = Record<AppointmentBookingSessionStatus, number>;

export const APPOINTMENT_BOOKING_SESSION_METRIC_STATUSES: readonly AppointmentBookingSessionStatus[] = [
  AppointmentBookingSessionStatus.Confirming,
  AppointmentBookingSessionStatus.Booked,
  AppointmentBookingSessionStatus.Cancelled,
];

export const APPOINTMENT_BOOKING_SESSION_STATUS_LABELS: Record<AppointmentBookingSessionStatus, string> = {
  [AppointmentBookingSessionStatus.Collecting]: "Collecting details",
  [AppointmentBookingSessionStatus.Confirming]: "Confirming",
  [AppointmentBookingSessionStatus.Booked]: "Booked",
  [AppointmentBookingSessionStatus.Cancelled]: "Cancelled",
};
