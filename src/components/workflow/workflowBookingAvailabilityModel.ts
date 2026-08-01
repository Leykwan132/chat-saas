import type { Doc } from '../../../convex/_generated/dataModel';
import { formatTimeZoneDisplayLabel } from '@/lib/calendarTimeUtils';
import {
  formatMinutesAmPm,
  resolveScheduleTimezone,
  type ScheduleShift,
} from '@/lib/scheduleUtils';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export type WorkflowAvailabilityRosterEntry = {
  schedule: Doc<'userSchedules'>;
  shifts: ScheduleShift[];
};

export type WorkflowAvailabilityTeammate = Doc<'users'> & {
  isAdmin: boolean;
  role: Doc<'teamMemberships'>['role'];
};

type DaySchedule = {
  dayOfWeek: number;
  shifts: ScheduleShift[];
  key: string;
};

function formatShiftPeriods(shifts: ScheduleShift[]) {
  return shifts
    .map(
      ({ startMinutes, endMinutes }) =>
        `${formatMinutesAmPm(startMinutes)}–${formatMinutesAmPm(endMinutes)}`,
    )
    .join(', ');
}

function buildDaySchedules(shifts: ScheduleShift[]): DaySchedule[] {
  return DAY_LABELS.map((_, dayOfWeek) => {
    const dayShifts = shifts
      .filter((shift) => shift.dayOfWeek === dayOfWeek)
      .sort((first, second) => first.startMinutes - second.startMinutes);
    return {
      dayOfWeek,
      shifts: dayShifts,
      key: dayShifts
        .map(({ startMinutes, endMinutes }) => `${startMinutes}-${endMinutes}`)
        .join('|'),
    };
  }).filter(({ shifts: dayShifts }) => dayShifts.length > 0);
}

function formatDayRange(startDay: number, endDay: number) {
  const startLabel = DAY_LABELS[startDay];
  const endLabel = DAY_LABELS[endDay];
  return startDay === endDay ? startLabel : `${startLabel}–${endLabel}`;
}

function groupConsecutiveDaysByHours(shifts: ScheduleShift[]) {
  const groups: Array<{
    startDay: number;
    endDay: number;
    key: string;
    shifts: ScheduleShift[];
  }> = [];

  for (const day of buildDaySchedules(shifts)) {
    const previous = groups.at(-1);
    if (
      previous &&
      previous.key === day.key &&
      previous.endDay === day.dayOfWeek - 1
    ) {
      previous.endDay = day.dayOfWeek;
      continue;
    }
    groups.push({
      startDay: day.dayOfWeek,
      endDay: day.dayOfWeek,
      key: day.key,
      shifts: day.shifts,
    });
  }

  return groups.map(
    ({ startDay, endDay, shifts: groupedShifts }) =>
      `${formatDayRange(startDay, endDay)} · ${formatShiftPeriods(groupedShifts)}`,
  );
}

export function formatWorkflowWeeklyAvailability(
  shifts: ScheduleShift[],
  timezone: string | undefined,
) {
  const timezoneLabel = formatTimeZoneDisplayLabel(
    resolveScheduleTimezone(timezone),
  );
  if (shifts.length === 0) {
    return { lines: ['No hours set'], timezoneLabel };
  }
  return { lines: groupConsecutiveDaysByHours(shifts), timezoneLabel };
}

export function hasAcceptingLeadMember(
  entries: Array<{
    schedule: { enabled: boolean; workosUserId?: string };
  }>,
  teammateUserIds?: Set<string>,
) {
  return entries.some(
    ({ schedule }) =>
      schedule.enabled &&
      (teammateUserIds === undefined ||
        (schedule.workosUserId !== undefined &&
          teammateUserIds.has(schedule.workosUserId))),
  );
}
