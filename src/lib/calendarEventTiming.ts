export function isCalendarEventNotPast(event: { endAt: number }, now: number) {
  return event.endAt >= now;
}
