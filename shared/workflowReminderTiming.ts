const REMINDER_TIMING_MS: Record<string, number> = {
  oneWeekBeforeAppointment: 7 * 24 * 60 * 60 * 1000,
  threeDaysBeforeAppointment: 3 * 24 * 60 * 60 * 1000,
  twoDaysBeforeAppointment: 2 * 24 * 60 * 60 * 1000,
  oneDayBeforeAppointment: 24 * 60 * 60 * 1000,
  twelveHoursBeforeAppointment: 12 * 60 * 60 * 1000,
  sixHoursBeforeAppointment: 6 * 60 * 60 * 1000,
  threeHoursBeforeAppointment: 3 * 60 * 60 * 1000,
  twoHoursBeforeAppointment: 2 * 60 * 60 * 1000,
  oneHourBeforeAppointment: 60 * 60 * 1000,
  thirtyMinutesBeforeAppointment: 30 * 60 * 1000,
  fifteenMinutesBeforeAppointment: 15 * 60 * 1000,
};

const UNIT_MS = {
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  weeks: 7 * 24 * 60 * 60 * 1000,
} as const;

export function getWorkflowReminderTimingMs(optionId: string) {
  const preset = REMINDER_TIMING_MS[optionId];
  if (preset !== undefined) return preset;
  const match = /^customReminderTiming:(\d+):(minutes|hours|days|weeks)$/.exec(optionId);
  if (!match) throw new Error(`Unknown reminder timing: ${optionId}`);
  const amount = Number(match[1]);
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`Invalid reminder timing: ${optionId}`);
  }
  return amount * UNIT_MS[match[2] as keyof typeof UNIT_MS];
}
