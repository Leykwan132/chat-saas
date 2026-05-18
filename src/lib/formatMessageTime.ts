import type { InboxUIMessage } from '@/lib/inboxOptimistic';

function dayDiffFromToday(timestamp: number, now = Date.now()): number {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dayStart = new Date(timestamp);
  dayStart.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - dayStart.getTime()) / (24 * 60 * 60 * 1000));
}

/** e.g. "March 23 at 5:34 PM" */
export function formatMessageDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const monthDay = date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  });
  const time = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${monthDay} at ${time}`;
}

/** Calendar-day label for thread date dividers. */
export function formatMessageDayLabel(timestamp: number, now = Date.now()): string {
  const diffDays = dayDiffFromToday(timestamp, now);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return formatMessageDateTime(timestamp);
}

/** Time only under each bubble — date is shown in day dividers. */
export function formatMessageTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function startOfDayMs(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export type InboxThreadItem =
  | { type: 'day'; key: string; label: string }
  | { type: 'message'; message: InboxUIMessage };

export function buildInboxThreadItems(messages: InboxUIMessage[]): InboxThreadItem[] {
  const items: InboxThreadItem[] = [];
  let lastDay: number | null = null;

  for (const message of messages) {
    const day = startOfDayMs(message._creationTime);
    if (day !== lastDay) {
      items.push({
        type: 'day',
        key: `day-${day}`,
        label: formatMessageDayLabel(message._creationTime),
      });
      lastDay = day;
    }
    items.push({ type: 'message', message });
  }

  return items;
}
