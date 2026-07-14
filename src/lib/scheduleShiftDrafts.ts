import {
  DEFAULT_SCHEDULE_SHIFTS,
  MINUTES_PER_DAY,
  SCHEDULE_DAYS,
  type ScheduleShift,
} from './scheduleUtils';

export type ShiftDraft = ScheduleShift & { key: string };

export function shiftsToDrafts(
  shifts: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>,
): ShiftDraft[] {
  return shifts.map((shift, index) => ({
    ...shift,
    key: `shift-${shift.dayOfWeek}-${shift.startMinutes}-${shift.endMinutes}-${index}`,
  }));
}

export function createAllDayShiftDrafts(): ShiftDraft[] {
  return shiftsToDrafts(SCHEDULE_DAYS.map(({ dayOfWeek }) => ({
    dayOfWeek,
    startMinutes: 0,
    endMinutes: MINUTES_PER_DAY,
  })));
}

export function createStandardShiftDrafts(): ShiftDraft[] {
  return shiftsToDrafts(DEFAULT_SCHEDULE_SHIFTS);
}

export function isFullWeekAllDay(shifts: ScheduleShift[]): boolean {
  if (shifts.length !== SCHEDULE_DAYS.length) return false;
  return SCHEDULE_DAYS.every(({ dayOfWeek }) => {
    const dayShifts = shifts.filter((shift) => shift.dayOfWeek === dayOfWeek);
    return dayShifts.length === 1
      && dayShifts[0]!.startMinutes === 0
      && dayShifts[0]!.endMinutes === MINUTES_PER_DAY;
  });
}

export function draftsToShifts(drafts: ShiftDraft[]) {
  return drafts.map(({ dayOfWeek, startMinutes, endMinutes }) => ({
    dayOfWeek,
    startMinutes,
    endMinutes,
  }));
}

function normalizeShifts(
  shifts: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>,
) {
  return [...shifts].sort(
    (a, b) =>
      a.dayOfWeek - b.dayOfWeek
      || a.startMinutes - b.startMinutes
      || a.endMinutes - b.endMinutes,
  );
}

export function getInitialShiftsFromDetail(detail: {
  shifts: ScheduleShift[];
  schedule: unknown | null;
}): ScheduleShift[] {
  if (detail.shifts.length > 0) return detail.shifts;
  if (detail.schedule === null) return DEFAULT_SCHEDULE_SHIFTS;
  return [];
}

export function areScheduleShiftsEqual(
  left: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>,
  right: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>,
) {
  const normalizedLeft = normalizeShifts(left);
  const normalizedRight = normalizeShifts(right);
  if (normalizedLeft.length !== normalizedRight.length) return false;
  return normalizedLeft.every(
    (shift, index) =>
      shift.dayOfWeek === normalizedRight[index]!.dayOfWeek
      && shift.startMinutes === normalizedRight[index]!.startMinutes
      && shift.endMinutes === normalizedRight[index]!.endMinutes,
  );
}
