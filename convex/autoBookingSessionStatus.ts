import { v } from "convex/values";

/** Auto Booking session lifecycle statuses (one session per booking attempt). */
export const AutoBookingSessionStatus = {
  Collecting: "collecting",
  Confirming: "confirming",
  Editing: "editing",
  Booked: "booked",
  Cancelled: "cancelled",
} as const;

export type AutoBookingSessionStatus =
  (typeof AutoBookingSessionStatus)[keyof typeof AutoBookingSessionStatus];

export const autoBookingSessionStatusValidator = v.union(
  v.literal(AutoBookingSessionStatus.Collecting),
  v.literal(AutoBookingSessionStatus.Confirming),
  v.literal(AutoBookingSessionStatus.Editing),
  v.literal(AutoBookingSessionStatus.Booked),
  v.literal(AutoBookingSessionStatus.Cancelled),
);

const ACTIVE_AUTO_BOOKING_SESSION_STATUSES: readonly AutoBookingSessionStatus[] = [
  AutoBookingSessionStatus.Collecting,
  AutoBookingSessionStatus.Confirming,
  AutoBookingSessionStatus.Editing,
];

export function isActiveAutoBookingSessionStatus(
  status: AutoBookingSessionStatus,
): boolean {
  return (ACTIVE_AUTO_BOOKING_SESSION_STATUSES as readonly string[]).includes(status);
}

export function createEmptyAutoBookingSessionStatusCounts(): Record<
  AutoBookingSessionStatus,
  number
> {
  return {
    [AutoBookingSessionStatus.Collecting]: 0,
    [AutoBookingSessionStatus.Confirming]: 0,
    [AutoBookingSessionStatus.Editing]: 0,
    [AutoBookingSessionStatus.Booked]: 0,
    [AutoBookingSessionStatus.Cancelled]: 0,
  };
}
