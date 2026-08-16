import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  EventDetailsBody,
  type AppointmentDetails,
} from './CalendarEventDetailsBody';

const details: AppointmentDetails = {
  eventId: 'calendar-event' as Id<'calendarEvents'>,
  title: 'Property viewing',
  status: 'confirmed',
  isAppointmentBooking: true,
  serviceName: 'Viewing',
  serviceFields: [],
  collectedFields: {},
  date: 'Sunday, 16 August 2026',
  timeRange: '9:00 AM – 10:00 AM',
  teamMember: 'Kwan Kwan',
  attendeeNames: ['Aina Agent'],
  description: 'Customer interest and property details shared.',
  remarks: 'Bring the property brochure.',
};

test('renders summary beside internal notes in neutral content surfaces', () => {
  const markup = renderToStaticMarkup(<EventDetailsBody details={details} />);

  expect(markup).toContain('sm:grid-cols-2');
  expect(markup.match(/flex items-center gap-2/g)).toHaveLength(2);
  expect(markup.match(/size-4 shrink-0 text-muted-foreground/g)).toHaveLength(2);
  expect(markup.match(/flex flex-col gap-1.5/g)).toHaveLength(2);
  expect(markup).toContain('rounded-lg bg-muted px-4 py-3');
  expect(markup.indexOf('Internal notes')).toBeLessThan(markup.indexOf('Summary'));
});
