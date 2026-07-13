export const AppointmentBookingSessionStatus = {
  Collecting: "collecting",
  Confirming: "confirming",
  Booked: "booked",
  Completed: "completed",
  Cancelled: "cancelled",
  NoShow: "no_show",
} as const;

export type AppointmentBookingSessionStatus =
  (typeof AppointmentBookingSessionStatus)[keyof typeof AppointmentBookingSessionStatus];

export type AppointmentBookingSessionStatusCounts = Record<AppointmentBookingSessionStatus, number>;

export const APPOINTMENT_BOOKING_SESSION_METRIC_STATUSES: readonly AppointmentBookingSessionStatus[] = [
  AppointmentBookingSessionStatus.Confirming,
  AppointmentBookingSessionStatus.Booked,
  AppointmentBookingSessionStatus.Completed,
  AppointmentBookingSessionStatus.Cancelled,
  AppointmentBookingSessionStatus.NoShow,
];

export const APPOINTMENT_BOOKING_SESSION_STATUS_LABELS: Record<AppointmentBookingSessionStatus, string> = {
  [AppointmentBookingSessionStatus.Collecting]: "Collecting details",
  [AppointmentBookingSessionStatus.Confirming]: "Confirming",
  [AppointmentBookingSessionStatus.Booked]: "Booked",
  [AppointmentBookingSessionStatus.Completed]: "Completed",
  [AppointmentBookingSessionStatus.Cancelled]: "Cancelled",
  [AppointmentBookingSessionStatus.NoShow]: "No-show",
};
