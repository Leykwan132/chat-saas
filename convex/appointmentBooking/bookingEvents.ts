import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { scheduleWorkflowRemindersForAppointment } from '../workflowReminderRuntime';

export async function handleBookingCreated(
  ctx: MutationCtx,
  appointmentId: Id<'calendarEvents'>,
) {
  console.log('booking_created', { appointmentId });
  return await scheduleWorkflowRemindersForAppointment(ctx, appointmentId);
}
