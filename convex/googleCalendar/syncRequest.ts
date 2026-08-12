import { FULL_SYNC_FUTURE_MONTHS, FULL_SYNC_PAST_DAYS } from "./constants";
import type { GoogleCalendarConnectionSnapshot, GoogleCalendarSyncRequest } from "./syncTypes";

const DAY_MS = 86_400_000;
const PAGE_SIZE = 20;

function addUtcMonths(timestamp: number, months: number) {
  const source = new Date(timestamp);
  const target = new Date(timestamp);
  const sourceDay = source.getUTCDate();
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(sourceDay, lastDay));
  return target.getTime();
}

function requiresMonthlyRebase(
  connection: GoogleCalendarConnectionSnapshot,
  now: number,
) {
  if (connection.syncToken === undefined) return true;
  if (connection.fullSyncStartAt === undefined || connection.fullSyncEndAt === undefined) {
    return false;
  }
  const previousAnchor = connection.fullSyncStartAt + FULL_SYNC_PAST_DAYS * DAY_MS;
  return now >= addUtcMonths(previousAnchor, 1);
}

export function googleCalendarSyncRequest(
  connection: GoogleCalendarConnectionSnapshot,
  now: number,
): GoogleCalendarSyncRequest {
  if (requiresMonthlyRebase(connection, now)) {
    return {
      kind: "full",
      singleEvents: true,
      showDeleted: true,
      pageSize: PAGE_SIZE,
      timeMin: now - FULL_SYNC_PAST_DAYS * DAY_MS,
      timeMax: addUtcMonths(now, FULL_SYNC_FUTURE_MONTHS),
    };
  }
  if (connection.syncToken === undefined) {
    throw new Error("Google Calendar incremental sync token is missing");
  }
  return {
    kind: "incremental",
    singleEvents: true,
    showDeleted: true,
    pageSize: PAGE_SIZE,
    syncToken: connection.syncToken,
  };
}

export const GOOGLE_CALENDAR_SYNC_PAGE_SIZE = PAGE_SIZE;
