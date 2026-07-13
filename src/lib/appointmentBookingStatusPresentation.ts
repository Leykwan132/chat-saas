export const APPOINTMENT_BOOKING_STATUS_OPTIONS = [
  { value: 'booked', label: 'Scheduled', className: 'bg-emerald-700 text-white' },
  { value: 'completed', label: 'Completed', className: 'bg-green-800 text-white' },
  { value: 'cancelled', label: 'Cancelled', className: 'bg-red-700 text-white' },
  { value: 'no_show', label: 'No-show', className: 'bg-amber-700 text-white' },
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
