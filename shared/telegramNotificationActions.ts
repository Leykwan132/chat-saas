export type TelegramNotificationButton = { text: string; url: string };

export function notificationButtons(chatUrl: string, calendarUrl?: string): TelegramNotificationButton[] {
  return [
    { text: 'Open chat', url: chatUrl },
    ...(calendarUrl ? [{ text: 'Add to Google Calendar', url: calendarUrl }] : []),
  ];
}

function calendarDate(timestamp: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(timestamp);
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type)!.value).join('');
}

function calendarTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function googleCalendarBookingUrl(input: {
  title: string;
  startAt: number;
  endAt: number;
  timeZone: string;
  allDay?: boolean;
  location?: string;
  chatUrl: string;
}): string {
  const dates = input.allDay
    ? `${calendarDate(input.startAt, input.timeZone)}/${calendarDate(input.endAt, input.timeZone)}`
    : `${calendarTimestamp(input.startAt)}/${calendarTimestamp(input.endAt)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates,
    ctz: input.timeZone,
    details: `Open chat: ${input.chatUrl}`,
  });
  if (input.location) params.set('location', input.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function sampleBookingCalendarUrl(chatUrl: string): string {
  return googleCalendarBookingUrl({
    title: 'Consultation — Sample Customer',
    startAt: Date.parse('2026-10-02T02:00:00Z'),
    endAt: Date.parse('2026-10-02T02:30:00Z'),
    timeZone: 'Asia/Kuala_Lumpur',
    chatUrl,
  });
}
