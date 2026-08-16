import type { Id } from '../../../convex/_generated/dataModel';
import type { AppointmentDetails } from '@/components/calendar/CalendarEventDetailsBody';
import {
  buildCustomFieldResponses,
  combineDateTime,
  getAllDayBounds,
  type EventEditFormState,
} from '@/components/calendar/calendarEventEditModel';

export function calendarEventUpdateArgsFromForm(
  eventId: Id<'calendarEvents'>,
  form: EventEditFormState,
  details: AppointmentDetails,
) {
  const timeRange = form.allDay
    ? getAllDayBounds(form.date, form.timeZone)
    : {
        startAt: combineDateTime(form.date, form.startTime, form.timeZone),
        endAt: combineDateTime(form.date, form.endTime, form.timeZone),
      };
  if (timeRange.startAt === null || timeRange.endAt === null) {
    throw new Error('Enter a valid start and end time');
  }
  if (timeRange.endAt <= timeRange.startAt) {
    throw new Error('End time must be after start time');
  }
  const shared = {
    eventId,
    title: form.title,
    description: form.description || undefined,
    link: form.link || undefined,
    startAt: timeRange.startAt,
    endAt: timeRange.endAt,
    timeZone: form.timeZone,
    allDay: form.allDay,
    startDate: form.allDay ? form.date : undefined,
    endDate: form.allDay ? form.date : undefined,
  };
  if (details.externalOrigin === 'google') return shared;
  if (!form.customerId || !form.assignedUserId) {
    throw new Error('Customer and team member are required');
  }
  return {
    ...shared,
    customerId: form.customerId as Id<'customers'>,
    assignedUserId: form.assignedUserId as Id<'users'>,
    attendeeUserIds: form.attendeeUserIds as Id<'users'>[],
    customFieldResponses: buildCustomFieldResponses(form.collectedFields, details.serviceFields),
    remarks: form.remarks.trim(),
  };
}
