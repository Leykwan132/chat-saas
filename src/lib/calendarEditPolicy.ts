export function canEditCalendarEvent({
  canManageCalendar,
}: {
  canManageCalendar: boolean;
  endAt: number;
}) {
  return canManageCalendar;
}
