export type GoogleCalendarUiState =
  | "not_connected"
  | "connected"
  | "syncing"
  | "needs_reauthorization";

export type GoogleCalendarConnectionStatus = {
  state: GoogleCalendarUiState;
  lastSuccessfulSyncAt?: number;
  lastErrorKind?: string;
  lastErrorMessage?: string;
  timeZone?: string;
};
