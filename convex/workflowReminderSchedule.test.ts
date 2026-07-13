import { describe, expect, test } from 'vitest';
import { getReminderScheduleCandidates } from './workflowReminderSchedule';

describe('reminder scheduling', () => {
  test('keeps only reminder times that remain in the future', () => {
    expect(getReminderScheduleCandidates({
      appointmentId: 'appointment',
      appointmentStartAt: 10 * 60 * 60 * 1000,
      now: 8 * 60 * 60 * 1000,
      timingOptionIds: ['threeHoursBeforeAppointment', 'oneHourBeforeAppointment'],
    })).toEqual([{
      deduplicationKey: 'reminder:appointment:oneHourBeforeAppointment',
      scheduledAt: 9 * 60 * 60 * 1000,
      timingOptionId: 'oneHourBeforeAppointment',
    }]);
  });

  test('uses deterministic keys for custom reminder times', () => {
    expect(getReminderScheduleCandidates({
      appointmentId: 'appointment',
      appointmentStartAt: 2 * 24 * 60 * 60 * 1000,
      now: 0,
      timingOptionIds: ['customReminderTiming:30:minutes'],
    })[0]).toEqual({
      deduplicationKey: 'reminder:appointment:customReminderTiming:30:minutes',
      scheduledAt: 2 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000,
      timingOptionId: 'customReminderTiming:30:minutes',
    });
  });
});
