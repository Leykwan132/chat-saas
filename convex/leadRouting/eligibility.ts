import type { Doc } from "../_generated/dataModel";

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getZonedDayAndMinutes(now: number, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(now)).map((p) => [p.type, p.value]),
  );
  const dayOfWeek = WEEKDAY_TO_INDEX[parts.weekday ?? "Sun"] ?? 0;
  const hour = Number.parseInt(parts.hour ?? "0", 10);
  const minute = Number.parseInt(parts.minute ?? "0", 10);
  return { dayOfWeek, minutes: hour * 60 + minute };
}

function isOnShift(
  now: number,
  timeZone: string,
  shifts: Doc<"userShifts">[],
): boolean {
  if (shifts.length === 0) return false;
  const { dayOfWeek, minutes } = getZonedDayAndMinutes(now, timeZone);
  return shifts.some(
    (shift) =>
      shift.dayOfWeek === dayOfWeek &&
      minutes >= shift.startMinutes &&
      minutes < shift.endMinutes,
  );
}

function hasActiveTimeOff(
  now: number,
  timeOffRows: Doc<"userTimeOff">[],
): boolean {
  return timeOffRows.some((row) => now >= row.startAt && now <= row.endAt);
}

export function isUserEligible(
  now: number,
  schedule: Doc<"userSchedules">,
  shifts: Doc<"userShifts">[],
  timeOffRows: Doc<"userTimeOff">[],
): boolean {
  if (!schedule.enabled) return false;
  if (hasActiveTimeOff(now, timeOffRows)) return false;
  if (schedule.mode === "manual") {
    return schedule.manualStatus === "available";
  }
  return isOnShift(now, schedule.timezone, shifts);
}
