export function isCalendarEventHappening(
  event: { startAt: number; endAt: number },
  now: number,
) {
  return event.startAt <= now && now < event.endAt;
}
