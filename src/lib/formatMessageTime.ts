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
  | { type: 'message'; message: InboxUIMessage }
  | { type: 'escalation'; key: string; escalation: InboxEscalationMarker };

export type InboxEscalationMarker = {
  id: string;
  sourceMessageId: string;
  question: string;
  context: string;
  escalatedAt: number;
};

// ponytail: a reply more than 2 minutes before the escalation log stays above the divider.
const ESCALATION_REPLY_WINDOW_MS = 2 * 60 * 1000;

function chronologicalMessages(messages: InboxUIMessage[]): InboxUIMessage[] {
  return messages
    .map((message, index) => ({ message, index }))
    .sort(
      (a, b) =>
        a.message._creationTime - b.message._creationTime || a.index - b.index,
    )
    .map((entry) => entry.message);
}

function escalationSlot(
  messages: InboxUIMessage[],
  marker: InboxEscalationMarker,
): number {
  const sourceIndex = messages.findIndex(
    (message) => message.ledgerMessageId === marker.sourceMessageId,
  );
  let slot = sourceIndex < 0 ? 0 : sourceIndex + 1;
  while (slot < messages.length) {
    const next = messages[slot];
    if (!next || next._creationTime > marker.escalatedAt) break;
    const sentWithEscalation =
      next.role === 'assistant' &&
      marker.escalatedAt - next._creationTime <= ESCALATION_REPLY_WINDOW_MS;
    if (sentWithEscalation) break;
    slot += 1;
  }
  return slot;
}

export function buildInboxThreadItems(
  messages: InboxUIMessage[],
  escalationMarkers: InboxEscalationMarker[] = [],
): InboxThreadItem[] {
  const ordered = chronologicalMessages(messages);
  const markersAtSlot = new Map<number, InboxEscalationMarker[]>();
  for (const marker of escalationMarkers) {
    const slot = escalationSlot(ordered, marker);
    const markers = markersAtSlot.get(slot) ?? [];
    markers.push(marker);
    markersAtSlot.set(slot, markers);
  }
  for (const markers of markersAtSlot.values()) {
    markers.sort((a, b) => a.escalatedAt - b.escalatedAt);
  }

  const items: InboxThreadItem[] = [];
  let lastDay: number | null = null;
  const pushDay = (timestamp: number) => {
    const day = startOfDayMs(timestamp);
    if (day === lastDay) return;
    items.push({
      type: 'day',
      key: `day-${day}`,
      label: formatMessageDayLabel(timestamp),
    });
    lastDay = day;
  };

  for (let index = 0; index <= ordered.length; index += 1) {
    for (const escalation of markersAtSlot.get(index) ?? []) {
      pushDay(escalation.escalatedAt);
      items.push({
        type: 'escalation',
        key: `escalation-${escalation.id}`,
        escalation,
      });
    }
    const message = ordered[index];
    if (!message) continue;
    pushDay(message._creationTime);
    items.push({ type: 'message', message });
  }

  return items;
}
