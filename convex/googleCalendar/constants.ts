export const GOOGLE_CALENDAR_PROVIDER = "google-calendar" as const;
export const GOOGLE_CALENDAR_EXTERNAL_EVENT_INDEX = "by_googleExternalEventIdentity" as const;
export const GOOGLE_CALENDAR_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events";
export const WORKOS_GOOGLE_CALENDAR_TOKEN_URL =
  `https://api.workos.com/data-integrations/${GOOGLE_CALENDAR_PROVIDER}/token` as const;
export const CALENDAR_PAGE_FRESHNESS_MS = 5 * 60 * 1000;
export const WATCH_RENEWAL_WINDOW_MS = 48 * 60 * 60 * 1000;
export const FULL_SYNC_PAST_DAYS = 90;
export const FULL_SYNC_FUTURE_MONTHS = 18;
export const SYNC_RUN_LEASE_MS = 5 * 60 * 1000;
