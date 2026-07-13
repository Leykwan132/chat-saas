import { getWorkflowReminderTimingMs } from '../shared/workflowReminderTiming';

export function getReminderScheduleCandidates({
  appointmentId,
  appointmentStartAt,
  now,
  timingOptionIds,
}: {
  appointmentId: string;
  appointmentStartAt: number;
  now: number;
  timingOptionIds: string[];
}) {
  return timingOptionIds.flatMap((timingOptionId) => {
    const scheduledAt = appointmentStartAt - getWorkflowReminderTimingMs(timingOptionId);
    if (scheduledAt <= now) return [];
    return [{
      deduplicationKey: `reminder:${appointmentId}:${timingOptionId}`,
      scheduledAt,
      timingOptionId,
    }];
  });
}
