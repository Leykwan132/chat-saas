import { toTimeZoneDateKey } from "./timeZoneDateKeys";

export type DailyOverviewRow = {
  date: string;
  messages: number;
  aiMessages: number;
  bookings: number;
  conversations: number;
  aiAssistedConversations: number;
  escalations: number;
  abandonedConversations: number;
  messagesToClose: number;
  conversationsClosed: number;
};

export function blankDailyRows(dateKeys: string[]): DailyOverviewRow[] {
  return dateKeys.map((date) => ({
    date,
    messages: 0,
    aiMessages: 0,
    bookings: 0,
    conversations: 0,
    aiAssistedConversations: 0,
    escalations: 0,
    abandonedConversations: 0,
    messagesToClose: 0,
    conversationsClosed: 0,
  }));
}

export type DailyOverviewValueKey = Exclude<keyof DailyOverviewRow, "date">;

export function addDailyValue(
  rowsByDate: Map<string, DailyOverviewRow>,
  date: string,
  key: DailyOverviewValueKey,
  value: number,
) {
  const row = rowsByDate.get(date);
  if (row !== undefined) {
    row[key] += value;
  }
}

export function incrementDaily(
  rowsByDate: Map<string, DailyOverviewRow>,
  timestamp: number,
  timeZone: string,
  key: DailyOverviewValueKey,
) {
  const row = rowsByDate.get(toTimeZoneDateKey(timestamp, timeZone));
  if (row !== undefined) {
    row[key] += 1;
  }
}
