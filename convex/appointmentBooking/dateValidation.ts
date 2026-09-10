import { startOfTimeZoneDay, toTimeZoneDateKey } from "../timeZoneDateKeys";

export function validateAvailabilityDates(args: {
  now: number;
  timeZone: string;
  preferredStartAt?: number;
  rangeStartAt?: number;
  rangeEndAt?: number;
}) {
  const todayStartAt = startOfTimeZoneDay(args.now, args.timeZone);
  const todayDate = toTimeZoneDateKey(args.now, args.timeZone);
  const requestedDates = [
    args.preferredStartAt,
    args.rangeStartAt,
    args.rangeEndAt,
  ].filter((value): value is number => value !== undefined);
  if (requestedDates.some((value) => value < todayStartAt)) {
    return { code: "past_date" as const, todayDate };
  }
  return null;
}
