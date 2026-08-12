export const GOOGLE_CALENDAR_PROVIDER = "google_calendar" as const;
export const GOOGLE_CALENDAR_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events";
export const CALENDAR_PAGE_FRESHNESS_MS = 5 * 60 * 1000;
export const AVAILABILITY_FRESHNESS_MS = 60 * 1000;
export const WATCH_RENEWAL_WINDOW_MS = 48 * 60 * 60 * 1000;
export const FULL_SYNC_PAST_DAYS = 90;
export const FULL_SYNC_FUTURE_MONTHS = 18;
export const SYNC_RUN_LEASE_MS = 5 * 60 * 1000;
