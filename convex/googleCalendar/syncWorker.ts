import { v } from "convex/values";
import type { FunctionReference } from "convex/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { FULL_SYNC_FUTURE_MONTHS, FULL_SYNC_PAST_DAYS } from "./constants";
import { mapGoogleEvent, type GoogleCalendarEvent } from "./eventMapping";
import { GoogleCalendarProviderError, googleCalendarRequest } from "./googleClient";
import { getGoogleCalendarCredential } from "./workosToken";

const DAY_MS = 86_400_000;
const MAX_PASSES_PER_WORKER = 20;
const PAGE_SIZE = 20;

type SyncErrorKind = "not_connected" | "needs_reauthorization" | "retryable" | "conflict" | "not_found" | "forbidden" | "invalid_request" | "failed";
type ConnectionSnapshot = {
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
  getConnection: (args: { connectionId: Id<"googleCalendarConnections"> }) => Promise<ConnectionSnapshot>;
  beginRun: (args: {
    connectionId: Id<"googleCalendarConnections">;
    requestKind: "full" | "incremental";
    fullSyncStartAt?: number;
    fullSyncEndAt?: number;
    now: number;
  }) => Promise<{ kind: "already_running" } | { kind: "started"; runId: Id<"googleCalendarSyncRuns"> }>;
  applyPage: (args: {
    connectionId: Id<"googleCalendarConnections">;
    runId: Id<"googleCalendarSyncRuns">;
    events: ReturnType<typeof mapGoogleEvent>[];
    membershipCursor?: string;
    nextPageToken?: string;
    candidateSyncToken?: string;
    now: number;
  }) => Promise<{ nextMembershipCursor?: string }>;
  finalizeRun: (args: {
    connectionId: Id<"googleCalendarConnections">;
    runId: Id<"googleCalendarSyncRuns">;
    syncToken: string;
    now: number;
  }) => Promise<{ dirty: boolean }>;
  failRun: (args: {
    connectionId: Id<"googleCalendarConnections">;
    runId: Id<"googleCalendarSyncRuns">;
    errorKind: SyncErrorKind;
    now: number;
  }) => Promise<unknown>;
  recoverInvalidToken: (args: {
    connectionId: Id<"googleCalendarConnections">;
    runId: Id<"googleCalendarSyncRuns">;
    cursor?: string;
    now: number;
  }) => Promise<{ complete: boolean; cursor?: string; deletedCount: number }>;
};
type DependencyArgs<T extends keyof GoogleCalendarSyncDependencies> = Parameters<GoogleCalendarSyncDependencies[T]>[0];
type DependencyResult<T extends keyof GoogleCalendarSyncDependencies> = Awaited<ReturnType<GoogleCalendarSyncDependencies[T]>>;
type SyncWorkerResult = { kind: "completed" | "coalesced"; passes: number; dirty: boolean };
const googleCalendarInternal = (internal as unknown as {
  googleCalendar: {
    syncState: {
      getConnectionForSync: FunctionReference<"query", "internal", DependencyArgs<"getConnection">, DependencyResult<"getConnection">>;
      beginSyncRun: FunctionReference<"mutation", "internal", DependencyArgs<"beginRun">, DependencyResult<"beginRun">>;
      finalizeSyncRun: FunctionReference<"mutation", "internal", DependencyArgs<"finalizeRun">, DependencyResult<"finalizeRun">>;
      failSyncRun: FunctionReference<"mutation", "internal", DependencyArgs<"failRun">, DependencyResult<"failRun">>;
    };
    eventStore: {
      applyPage: FunctionReference<"mutation", "internal", DependencyArgs<"applyPage">, DependencyResult<"applyPage">>;
    };
    syncRecovery: {
      recoverInvalidSyncToken: FunctionReference<"mutation", "internal", DependencyArgs<"recoverInvalidToken">, DependencyResult<"recoverInvalidToken">>;
    };
    syncWorker: {
      run: FunctionReference<"action", "internal", { connectionId: Id<"googleCalendarConnections"> }, SyncWorkerResult>;
    };
  };
}).googleCalendar;
class GoogleCalendarCredentialStateError extends Error {
  readonly kind: "not_connected" | "needs_reauthorization" | "retryable";
  constructor(kind: "not_connected" | "needs_reauthorization" | "retryable") {
    super("Google Calendar credential is unavailable");
    this.kind = kind;
  }
}
function addUtcMonths(timestamp: number, months: number) {
  const source = new Date(timestamp);
  const target = new Date(timestamp);
  const sourceDay = source.getUTCDate();
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(sourceDay, lastDay));
  return target.getTime();
}
function fullSyncBounds(now: number) {
  return {
    timeMin: now - FULL_SYNC_PAST_DAYS * DAY_MS,
    timeMax: addUtcMonths(now, FULL_SYNC_FUTURE_MONTHS),
  };
}
function requiresMonthlyRebase(connection: ConnectionSnapshot, now: number) {
  if (connection.syncToken === undefined) return true;
  if (connection.fullSyncStartAt === undefined || connection.fullSyncEndAt === undefined) return false;
  const previousAnchor = connection.fullSyncStartAt + FULL_SYNC_PAST_DAYS * DAY_MS;
  return now >= addUtcMonths(previousAnchor, 1);
}
function baseRequest(connection: ConnectionSnapshot, now: number): GoogleCalendarSyncRequest {
  if (requiresMonthlyRebase(connection, now)) {
    const bounds = fullSyncBounds(now);
    return { kind: "full", singleEvents: true, showDeleted: true, pageSize: PAGE_SIZE, ...bounds };
  }
  if (connection.syncToken === undefined) throw new Error("Google Calendar incremental sync token is missing");
  return {
    kind: "incremental",
    singleEvents: true,
    showDeleted: true,
    pageSize: PAGE_SIZE,
    syncToken: connection.syncToken,
  };
}
function classifiedError(error: unknown): SyncErrorKind {
  if (typeof error !== "object" || error === null || !("kind" in error)) return "failed";
  const kind = error.kind;
  if (
    kind === "not_connected" || kind === "needs_reauthorization" || kind === "retryable" ||
    kind === "conflict" || kind === "not_found" || kind === "forbidden" ||
    kind === "invalid_request" || kind === "failed"
  ) return kind;
  return "failed";
}
function invalidSyncToken(error: unknown) {
  return typeof error === "object" && error !== null && "kind" in error && error.kind === "invalid_sync_token";
}
async function recoverInvalidToken(
  dependencies: GoogleCalendarSyncDependencies,
  connectionId: Id<"googleCalendarConnections">,
  runId: Id<"googleCalendarSyncRuns">,
  now: number,
) {
  let cursor: string | undefined;
  let batch = await dependencies.recoverInvalidToken({ connectionId, runId, cursor, now });
  while (!batch.complete) {
    if (batch.cursor === undefined) throw new Error("Google Calendar recovery did not return a cursor");
    cursor = batch.cursor;
    batch = await dependencies.recoverInvalidToken({ connectionId, runId, cursor, now });
  }
}
export async function runGoogleCalendarSync(args: {
  connectionId: Id<"googleCalendarConnections">;
  now: number;
  dependencies: GoogleCalendarSyncDependencies;
  listPage: (request: GoogleCalendarSyncRequest) => Promise<GoogleCalendarSyncPage>;
}) {
  for (let pass = 0; pass < MAX_PASSES_PER_WORKER; pass += 1) {
    const connection = await args.dependencies.getConnection({ connectionId: args.connectionId });
    const request = baseRequest(connection, args.now);
    const started = await args.dependencies.beginRun({
      connectionId: args.connectionId,
      requestKind: request.kind,
      fullSyncStartAt: request.timeMin,
      fullSyncEndAt: request.timeMax,
      now: args.now,
    });
    if (started.kind === "already_running") return { kind: "coalesced" as const, passes: pass, dirty: true };
    let pageToken: string | undefined;
    let finalSyncToken: string | undefined;
    try {
      do {
        const page = await args.listPage({ ...request, pageToken });
        if (page.items.length > PAGE_SIZE) throw new Error("Google Calendar page exceeds the requested page size");
        if (page.nextPageToken !== undefined && page.nextSyncToken !== undefined) {
          throw new Error("Google Calendar page cannot contain both continuation tokens");
        }
        const events = page.items.map((event) => mapGoogleEvent(event, connection.timeZone));
        let membershipCursor: string | undefined;
        do {
          const applied = await args.dependencies.applyPage({
            connectionId: args.connectionId,
            runId: started.runId,
            events,
            membershipCursor,
            nextPageToken: page.nextPageToken,
            candidateSyncToken: page.nextSyncToken,
            now: args.now,
          });
          membershipCursor = applied.nextMembershipCursor;
        } while (membershipCursor !== undefined);
        pageToken = page.nextPageToken;
        finalSyncToken = page.nextSyncToken ?? finalSyncToken;
      } while (pageToken !== undefined);
      if (finalSyncToken === undefined) throw new Error("Google Calendar final page omitted its sync token");
      const finalized = await args.dependencies.finalizeRun({
        connectionId: args.connectionId,
        runId: started.runId,
        syncToken: finalSyncToken,
        now: args.now,
      });
      if (!finalized.dirty) return { kind: "completed" as const, passes: pass + 1, dirty: false };
    } catch (error) {
      if (request.kind === "incremental" && invalidSyncToken(error)) {
        await recoverInvalidToken(args.dependencies, args.connectionId, started.runId, args.now);
        continue;
      }
      await args.dependencies.failRun({
        connectionId: args.connectionId,
        runId: started.runId,
        errorKind: classifiedError(error),
        now: args.now,
      });
      throw error;
    }
  }
  return { kind: "completed" as const, passes: MAX_PASSES_PER_WORKER, dirty: true };
}

function listEventsPath(request: GoogleCalendarSyncRequest) {
  const params = new URLSearchParams({
    singleEvents: String(request.singleEvents),
    showDeleted: String(request.showDeleted),
    maxResults: String(request.pageSize),
  });
  if (request.syncToken !== undefined) params.set("syncToken", request.syncToken);
  if (request.timeMin !== undefined) params.set("timeMin", new Date(request.timeMin).toISOString());
  if (request.timeMax !== undefined) params.set("timeMax", new Date(request.timeMax).toISOString());
  if (request.pageToken !== undefined) params.set("pageToken", request.pageToken);
  return `calendars/primary/events?${params.toString()}`;
}

function validatedPage(value: unknown): GoogleCalendarSyncPage {
  if (typeof value !== "object" || value === null) throw new GoogleCalendarProviderError("failed");
  const page = value as { items?: unknown; nextPageToken?: unknown; nextSyncToken?: unknown };
  if (page.items !== undefined && !Array.isArray(page.items)) throw new GoogleCalendarProviderError("failed");
  if (page.nextPageToken !== undefined && typeof page.nextPageToken !== "string") throw new GoogleCalendarProviderError("failed");
  if (page.nextSyncToken !== undefined && typeof page.nextSyncToken !== "string") throw new GoogleCalendarProviderError("failed");
  return {
    items: (page.items ?? []) as GoogleCalendarEvent[],
    nextPageToken: page.nextPageToken,
    nextSyncToken: page.nextSyncToken,
  };
}

export const run = internalAction({
  args: { connectionId: v.id("googleCalendarConnections") },
  returns: v.object({
    kind: v.union(v.literal("completed"), v.literal("coalesced")),
    passes: v.number(),
    dirty: v.boolean(),
  }),
  handler: async (ctx, args): Promise<SyncWorkerResult> => {
    let credential: Awaited<ReturnType<typeof getGoogleCalendarCredential>> | undefined;
    const result = await runGoogleCalendarSync({
      connectionId: args.connectionId,
      now: Date.now(),
      dependencies: {
        getConnection: (value) => ctx.runQuery(googleCalendarInternal.syncState.getConnectionForSync, value),
        beginRun: (value) => ctx.runMutation(googleCalendarInternal.syncState.beginSyncRun, value),
        applyPage: (value) => ctx.runMutation(googleCalendarInternal.eventStore.applyPage, value),
        finalizeRun: (value) => ctx.runMutation(googleCalendarInternal.syncState.finalizeSyncRun, value),
        failRun: (value) => ctx.runMutation(googleCalendarInternal.syncState.failSyncRun, value),
        recoverInvalidToken: (value) => ctx.runMutation(googleCalendarInternal.syncRecovery.recoverInvalidSyncToken, value),
      },
      listPage: async (request) => {
        if (credential === undefined) {
          const connection = await ctx.runQuery(googleCalendarInternal.syncState.getConnectionForSync, { connectionId: args.connectionId });
          credential = await getGoogleCalendarCredential(connection.workosUserId);
        }
        if (credential.kind !== "active") throw new GoogleCalendarCredentialStateError(credential.kind);
        const page = await googleCalendarRequest<unknown>(credential, { method: "GET", path: listEventsPath(request) });
        return validatedPage(page);
      },
    });
    if (result.dirty) await ctx.scheduler.runAfter(0, googleCalendarInternal.syncWorker.run, args);
    return result;
  },
});
