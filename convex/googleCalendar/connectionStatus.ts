import { v } from "convex/values";
import {
  googleCalendarErrorKindValidator,
  googleCalendarOperationError,
  type GoogleCalendarConnectionState,
  type GoogleCalendarOperationFailure,
} from "./contracts";

export const googleCalendarUiStateValidator = v.union(
  v.literal("not_connected"),
  v.literal("connected"),
  v.literal("syncing"),
  v.literal("needs_reauthorization"),
);

export const googleCalendarConnectionStatusValidator = v.object({
  state: googleCalendarUiStateValidator,
  lastSuccessfulSyncAt: v.optional(v.number()),
  lastErrorKind: v.optional(googleCalendarErrorKindValidator),
  lastErrorMessage: v.optional(v.string()),
  timeZone: v.optional(v.string()),
  workosHttpStatus: v.optional(v.number()),
  workosConnectedAccount: v.optional(v.any()),
});

export type GoogleCalendarUiState =
  | "not_connected"
  | "connected"
  | "syncing"
  | "needs_reauthorization";

export type GoogleCalendarConnectionStatus = {
  state: GoogleCalendarUiState;
  lastSuccessfulSyncAt?: number;
  lastErrorKind?: GoogleCalendarOperationFailure["kind"];
  lastErrorMessage?: string;
  timeZone?: string;
  workosHttpStatus?: number;
  workosConnectedAccount?: unknown;
};

function uiState(state: GoogleCalendarConnectionState | undefined): GoogleCalendarUiState {
  if (state === undefined || state === "disconnected") return "not_connected";
  return state;
}

export function googleCalendarConnectionStatus(
  connection: {
    state: GoogleCalendarConnectionState;
    lastSuccessfulSyncAt?: number;
    lastErrorKind?: GoogleCalendarOperationFailure["kind"];
    timeZone: string;
  } | null,
): GoogleCalendarConnectionStatus {
  if (connection === null) return { state: "not_connected" };
  const state = uiState(connection.state);
  const status: GoogleCalendarConnectionStatus = { state, timeZone: connection.timeZone };
  if (connection.lastSuccessfulSyncAt !== undefined) {
    status.lastSuccessfulSyncAt = connection.lastSuccessfulSyncAt;
  }
  if (connection.lastErrorKind !== undefined) {
    status.lastErrorKind = connection.lastErrorKind;
    status.lastErrorMessage = googleCalendarOperationError(connection.lastErrorKind).message;
  }
  return status;
}
