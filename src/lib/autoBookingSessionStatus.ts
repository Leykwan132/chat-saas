/** Auto Booking session lifecycle statuses — mirrors backend values for API responses. */
export const AutoBookingSessionStatus = {
  Collecting: "collecting",
  Confirming: "confirming",
  Booked: "booked",
  Cancelled: "cancelled",
} as const;

export type AutoBookingSessionStatus =
  (typeof AutoBookingSessionStatus)[keyof typeof AutoBookingSessionStatus];

export type AutoBookingSessionStatusCounts = Record<AutoBookingSessionStatus, number>;

/** Detail-page metric cards, in display order. */
export const AUTO_BOOKING_SESSION_METRIC_STATUSES: readonly AutoBookingSessionStatus[] = [
  AutoBookingSessionStatus.Confirming,
  AutoBookingSessionStatus.Booked,
  AutoBookingSessionStatus.Cancelled,
];

export const AUTO_BOOKING_SESSION_STATUS_LABELS: Record<AutoBookingSessionStatus, string> = {
  [AutoBookingSessionStatus.Collecting]: "Collecting details",
  [AutoBookingSessionStatus.Confirming]: "Confirming",
  [AutoBookingSessionStatus.Booked]: "Booked",
  [AutoBookingSessionStatus.Cancelled]: "Cancelled",
};
