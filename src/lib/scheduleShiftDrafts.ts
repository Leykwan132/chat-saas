import {
  DEFAULT_SCHEDULE_SHIFTS,
  normalizeScheduleShifts,
  type ScheduleShift,
} from '@/lib/scheduleUtils';

export type ShiftDraft = ScheduleShift & { key: string };

export function shiftsToDrafts(
  shifts: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>,
): ShiftDraft[] {
  return shifts.map((shift, index) => ({
    ...shift,
    key: `shift-${shift.dayOfWeek}-${shift.startMinutes}-${shift.endMinutes}-${index}`,
  }));
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
      a.dayOfWeek - b.dayOfWeek ||
      a.startMinutes - b.startMinutes ||
      a.endMinutes - b.endMinutes,
  );
}

export function getInitialShiftsFromDetail(detail: {
  shifts: ScheduleShift[];
  schedule: unknown | null;
}): ScheduleShift[] {
  if (detail.shifts.length > 0) return normalizeScheduleShifts(detail.shifts);
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
      shift.dayOfWeek === normalizedRight[index]!.dayOfWeek &&
      shift.startMinutes === normalizedRight[index]!.startMinutes &&
      shift.endMinutes === normalizedRight[index]!.endMinutes,
  );
}
