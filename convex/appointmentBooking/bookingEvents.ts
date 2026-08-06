import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { scheduleWorkflowRemindersForAppointment } from '../workflowReminderRuntime';
import { notifyAppointmentEvent } from '../telegramNotifications/events';

export async function handleBookingCreated(
  ctx: MutationCtx,
  appointmentId: Id<'calendarEvents'>,
) {
  console.log('booking_created', { appointmentId });
  const reminders = await scheduleWorkflowRemindersForAppointment(ctx, appointmentId);
  const appointment = await ctx.db.get(appointmentId);
  if (appointment?.agentId) {
    const agent = await ctx.db.get(appointment.agentId);
    if (agent) await notifyAppointmentEvent(ctx, agent._id, appointmentId, agent.name, 'booked');
  }
  return reminders;
}
