export function bookingCalendarUrl(origin: string, agentId: string, eventId: string): string {
  const base = origin.replace(/\/$/, "");
  const params = new URLSearchParams({ eventId });
  return `${base}/dashboard/${agentId}/calendar?${params.toString()}`;
}
