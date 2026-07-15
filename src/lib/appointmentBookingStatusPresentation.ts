const STATUS_TAG_CLASS = 'bg-background text-foreground';

export const APPOINTMENT_BOOKING_STATUS_OPTIONS = [
  { value: 'booked', label: 'Scheduled', className: STATUS_TAG_CLASS, accentColor: '#eab308' },
  { value: 'completed', label: 'Completed', className: STATUS_TAG_CLASS, accentColor: '#15803d' },
  { value: 'cancelled', label: 'Cancelled', className: STATUS_TAG_CLASS, accentColor: '#dc2626' },
  { value: 'no_show', label: 'No-show', className: STATUS_TAG_CLASS, accentColor: '#f97316' },
] as const;

export type AppointmentBookingDisplayStatus =
  (typeof APPOINTMENT_BOOKING_STATUS_OPTIONS)[number]['value'];

const PRESENTATION_BY_STATUS = Object.fromEntries(
  APPOINTMENT_BOOKING_STATUS_OPTIONS.map((option) => [option.value, option]),
) as Record<
  AppointmentBookingDisplayStatus,
  (typeof APPOINTMENT_BOOKING_STATUS_OPTIONS)[number]
>;

export const appointmentBookingStatusLabel = (status: AppointmentBookingDisplayStatus) =>
  PRESENTATION_BY_STATUS[status].label;

export const appointmentBookingStatusClass = (status: AppointmentBookingDisplayStatus) =>
  PRESENTATION_BY_STATUS[status].className;

export const appointmentBookingStatusAccentColor = (status: AppointmentBookingDisplayStatus) =>
  PRESENTATION_BY_STATUS[status].accentColor;
