import type { Id } from "../_generated/dataModel";
import type { GoogleCalendarEvent, MappedGoogleCalendarEvent } from "./eventMapping";

export type GoogleCalendarSyncErrorKind =
  | "not_connected"
  | "needs_reauthorization"
  | "retryable"
  | "conflict"
  | "not_found"
  | "forbidden"
  | "invalid_request"
  | "failed";

export type GoogleCalendarConnectionSnapshot = {
  connectionId: Id<"googleCalendarConnections">;
  userId: Id<"users">;
  workosUserId: string;
  primaryCalendarId: "primary";
  timeZone: string;
  state: "connected" | "syncing";
  syncToken?: string;
  fullSyncStartAt?: number;
  fullSyncEndAt?: number;
  dirtyGeneration: number;
};

export type GoogleCalendarSyncRequest = {
  kind: "full" | "incremental";
  singleEvents: true;
  showDeleted: true;
  pageSize: number;
  pageToken?: string;
  syncToken?: string;
  timeMin?: number;
  timeMax?: number;
};

export type GoogleCalendarSyncPage = {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

export type GoogleCalendarSyncDependencies = {
  getConnection: (args: {
    connectionId: Id<"googleCalendarConnections">;
  }) => Promise<GoogleCalendarConnectionSnapshot>;
  beginRun: (args: {
    connectionId: Id<"googleCalendarConnections">;
    requestKind: "full" | "incremental";
    fullSyncStartAt?: number;
    fullSyncEndAt?: number;
    now: number;
  }) => Promise<
    | { kind: "already_running" }
    | { kind: "started"; runId: Id<"googleCalendarSyncRuns"> }
  >;
  renewRun: (args: {
    connectionId: Id<"googleCalendarConnections">;
    runId: Id<"googleCalendarSyncRuns">;
    now: number;
  }) => Promise<{ kind: "renewed" } | { kind: "lost" }>;
  applyPage: (args: {
    connectionId: Id<"googleCalendarConnections">;
    runId: Id<"googleCalendarSyncRuns">;
    events: MappedGoogleCalendarEvent[];
    membershipCursor?: string;
    nextPageToken?: string;
    candidateSyncToken?: string;
    now: number;
  }) => Promise<
    | { kind: "lost" }
    | {
        kind: "applied";
        importedCount: number;
        updatedCount: number;
        cancelledCount: number;
        conflictCount: number;
        nextMembershipCursor?: string;
      }
  >;
  finalizeRun: (args: {
    connectionId: Id<"googleCalendarConnections">;
    runId: Id<"googleCalendarSyncRuns">;
    syncToken: string;
    now: number;
  }) => Promise<{ kind: "finalized"; dirty: boolean } | { kind: "lost" }>;
  failRun: (args: {
    connectionId: Id<"googleCalendarConnections">;
    runId: Id<"googleCalendarSyncRuns">;
    errorKind: GoogleCalendarSyncErrorKind;
    now: number;
  }) => Promise<{ kind: "failed" } | { kind: "lost" }>;
  recoverInvalidToken: (args: {
    connectionId: Id<"googleCalendarConnections">;
    runId: Id<"googleCalendarSyncRuns">;
    cursor?: string;
    now: number;
  }) => Promise<
    | { kind: "lost" }
    | { kind: "progress"; complete: boolean; cursor?: string; deletedCount: number }
  >;
  reconcileFullRun: (args: {
    connectionId: Id<"googleCalendarConnections">;
    runId: Id<"googleCalendarSyncRuns">;
    cursor?: string;
    now: number;
  }) => Promise<
    | { kind: "lost" }
    | { kind: "progress"; complete: boolean; cursor?: string; deletedCount: number }
  >;
};

export type GoogleCalendarSyncResult = {
  kind: "completed" | "coalesced";
  passes: number;
  dirty: boolean;
};
