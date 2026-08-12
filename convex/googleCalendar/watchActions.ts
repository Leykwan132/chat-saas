import type { FunctionReference } from "convex/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction, type ActionCtx } from "../_generated/server";
import { CALENDAR_PAGE_FRESHNESS_MS, WATCH_RENEWAL_WINDOW_MS } from "./constants";
import { createGoogleCalendarChannelToken } from "./channelToken";
import { googleCalendarRequest } from "./googleClient";
import { getGoogleCalendarCredential } from "./workosToken";

type ConnectionState = "connected" | "syncing";
type ConnectionForWatch = { connectionId: Id<"googleCalendarConnections">; workosUserId: string; state: ConnectionState };
type StopChannel = {
  channelId: Id<"googleCalendarWatchChannels">;
  connectionId: Id<"googleCalendarConnections">;
  externalChannelId: string;
  resourceId: string;
  expirationAt: number;
  state: "active" | "retiring" | "retired" | "expired" | "pending";
  workosUserId: string;
};
type Maintenance = {
  currentChannelId?: Id<"googleCalendarWatchChannels">;
  activeExpirationAt?: number;
  hasPending: boolean;
  retiringChannelIds: Id<"googleCalendarWatchChannels">[];
};
type Credential = { token: string };
type PaginationResult = { page: Id<"googleCalendarConnections">[]; isDone: boolean; continueCursor: string };
type Reservation =
  | { kind: "reserved"; channelId: Id<"googleCalendarWatchChannels"> }
  | { kind: "existing"; channelId: Id<"googleCalendarWatchChannels"> }
  | { kind: "superseded" };
type Activation =
  | { kind: "activated"; retiringChannelId?: Id<"googleCalendarWatchChannels"> }
  | { kind: "superseded" };

const refs = (internal as unknown as {
  googleCalendar: {
    watchStore: {
      getConnectionForWatch: FunctionReference<"query", "internal", { connectionId: Id<"googleCalendarConnections"> }, ConnectionForWatch>;
      reservePendingWatch: FunctionReference<"mutation", "internal", { connectionId: Id<"googleCalendarConnections">; channelId: string; tokenHash: string; pendingExpirationAt: number; replacingChannelId?: Id<"googleCalendarWatchChannels">; now: number }, Reservation>;
      activatePendingWatch: FunctionReference<"mutation", "internal", { pendingChannelId: Id<"googleCalendarWatchChannels">; expectedChannelId: string; resourceId: string; resourceUri: string; expirationAt: number; replacingChannelId?: Id<"googleCalendarWatchChannels">; now: number }, Activation>;
      getChannelForStop: FunctionReference<"query", "internal", { channelId: Id<"googleCalendarWatchChannels"> }, StopChannel>;
      markWatchStopped: FunctionReference<"mutation", "internal", { channelId: Id<"googleCalendarWatchChannels">; state: "retired" | "expired"; now: number }, null>;
    };
    watchMaintenance: {
      listMaintenanceConnectionIds: FunctionReference<"query", "internal", { state: ConnectionState; paginationOpts: { numItems: number; cursor: string | null } }, PaginationResult>;
      getWatchMaintenance: FunctionReference<"query", "internal", { connectionId: Id<"googleCalendarConnections">; now: number }, Maintenance>;
      scheduleStaleSyncBatch: FunctionReference<"mutation", "internal", { state: ConnectionState; paginationOpts: { numItems: number; cursor: string | null }; staleBefore: number; now: number }, { isDone: boolean; continueCursor: string }>;
    };
    watchActions: {
      continueWatchRenewal: FunctionReference<"action", "internal", { state: ConnectionState; cursor: string | null }, null>;
      renewConnectionWatch: FunctionReference<"action", "internal", { connectionId: Id<"googleCalendarConnections"> }, null>;
      runStaleSyncSweepPage: FunctionReference<"action", "internal", { state: ConnectionState; cursor: string | null }, null>;
      renewExpiringGoogleCalendarWatches: FunctionReference<"action", "internal", Record<string, never>, null>;
      sweepStaleGoogleCalendarSyncs: FunctionReference<"action", "internal", Record<string, never>, null>;
    };
  };
}).googleCalendar;

function webhookAddress() {
  const siteUrl = process.env.CONVEX_SITE_URL;
  if (siteUrl === undefined) throw new Error("CONVEX_SITE_URL is not configured");
  const base = new URL(siteUrl);
  if (base.protocol !== "https:" || base.username !== "" || base.password !== "") {
    throw new Error("CONVEX_SITE_URL must be a public HTTPS origin");
  }
  return new URL("/webhook/google-calendar", base.origin).toString();
}

async function activeCredential(workosUserId: string): Promise<Credential> {
  const credential = await getGoogleCalendarCredential(workosUserId);
  if (credential.kind !== "active") {
    throw new Error(`Google Calendar credential unavailable: ${credential.kind}`);
  }
  return credential;
}

function isNotFound(error: unknown) {
  return typeof error === "object" && error !== null && "kind" in error && error.kind === "not_found";
}

async function stopExternalWatch(credential: Credential, channelId: string, resourceId: string) {
  try {
    await googleCalendarRequest(credential, {
      method: "POST",
      path: "channels/stop",
      body: { id: channelId, resourceId },
    });
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}

function validatedWatchResponse(value: unknown, channelId: string, now: number) {
  if (typeof value !== "object" || value === null) throw new Error("Google Calendar returned an invalid watch response");
  const response = value as Record<string, unknown>;
  const expirationAt = typeof response.expiration === "string" ? Number(response.expiration) : Number.NaN;
  if (
    response.id !== channelId || typeof response.resourceId !== "string" || response.resourceId.length === 0 ||
    typeof response.resourceUri !== "string" || response.resourceUri.length === 0 ||
    !Number.isSafeInteger(expirationAt) || expirationAt <= now
  ) {
    throw new Error("Google Calendar returned an invalid watch response");
  }
  return { resourceId: response.resourceId, resourceUri: response.resourceUri, expirationAt };
}

async function createWatch(
  ctx: ActionCtx,
  connectionId: Id<"googleCalendarConnections">,
  replacingChannelId?: Id<"googleCalendarWatchChannels">,
) {
  const connection: ConnectionForWatch = await ctx.runQuery(refs.watchStore.getConnectionForWatch, { connectionId });
  const credential = await activeCredential(connection.workosUserId);
  const generated = await createGoogleCalendarChannelToken();
  const externalChannelId = crypto.randomUUID();
  const reservedAt = Date.now();
  const reservation = await ctx.runMutation(refs.watchStore.reservePendingWatch, {
    connectionId,
    channelId: externalChannelId,
    tokenHash: generated.tokenHash,
    pendingExpirationAt: reservedAt + 5 * 60 * 1000,
    replacingChannelId,
    now: reservedAt,
  });
  if (reservation.kind !== "reserved") return reservation;
  const requestedExpirationAt = reservedAt + 7 * 24 * 60 * 60 * 1000;
  let response: { resourceId: string; resourceUri: string; expirationAt: number };
  try {
    response = validatedWatchResponse(await googleCalendarRequest(credential, {
      method: "POST",
      path: "calendars/primary/events/watch",
      body: {
        id: externalChannelId,
        type: "web_hook",
        address: webhookAddress(),
        token: generated.token,
        expiration: String(requestedExpirationAt),
      },
    }), externalChannelId, Date.now());
  } catch (error) {
    await ctx.runMutation(refs.watchStore.markWatchStopped, { channelId: reservation.channelId, state: "expired", now: Date.now() });
    throw error;
  }
  const activated = await ctx.runMutation(refs.watchStore.activatePendingWatch, {
    pendingChannelId: reservation.channelId,
    expectedChannelId: externalChannelId,
    ...response,
    replacingChannelId,
    now: Date.now(),
  });
  if (activated.kind === "superseded") {
    await stopExternalWatch(credential, externalChannelId, response.resourceId);
    await ctx.runMutation(refs.watchStore.markWatchStopped, { channelId: reservation.channelId, state: "retired", now: Date.now() });
    return { kind: "superseded" as const };
  }
  if (activated.retiringChannelId !== undefined) {
    const retiring: StopChannel = await ctx.runQuery(refs.watchStore.getChannelForStop, { channelId: activated.retiringChannelId });
    await stopExternalWatch(credential, retiring.externalChannelId, retiring.resourceId);
    await ctx.runMutation(refs.watchStore.markWatchStopped, { channelId: retiring.channelId, state: "retired", now: Date.now() });
  }
  return { kind: "active" as const, channelId: reservation.channelId };
}

async function stopWatch(ctx: ActionCtx, channelId: Id<"googleCalendarWatchChannels">) {
  const channel: StopChannel = await ctx.runQuery(refs.watchStore.getChannelForStop, { channelId });
  if (channel.state === "retired" || channel.state === "expired") return { kind: "already_stopped" as const };
  if (channel.state === "pending" || channel.expirationAt <= Date.now()) {
    await ctx.runMutation(refs.watchStore.markWatchStopped, { channelId, state: "expired", now: Date.now() });
    return { kind: "expired" as const };
  }
  const credential = await activeCredential(channel.workosUserId);
  await stopExternalWatch(credential, channel.externalChannelId, channel.resourceId);
  await ctx.runMutation(refs.watchStore.markWatchStopped, { channelId, state: "retired", now: Date.now() });
  return { kind: "stopped" as const };
}

export const createGoogleCalendarWatch = internalAction({
  args: { connectionId: v.id("googleCalendarConnections") },
  returns: v.union(
    v.object({ kind: v.literal("active"), channelId: v.id("googleCalendarWatchChannels") }),
    v.object({ kind: v.literal("existing"), channelId: v.optional(v.id("googleCalendarWatchChannels")) }),
    v.object({ kind: v.literal("superseded"), channelId: v.optional(v.id("googleCalendarWatchChannels")) }),
  ),
  handler: async (ctx, args) => await createWatch(ctx, args.connectionId),
});

export const stopGoogleCalendarWatch = internalAction({
  args: { channelId: v.id("googleCalendarWatchChannels") },
  returns: v.object({ kind: v.union(v.literal("stopped"), v.literal("expired"), v.literal("already_stopped")) }),
  handler: async (ctx, args) => await stopWatch(ctx, args.channelId),
});

export const renewConnectionWatch = internalAction({
  args: { connectionId: v.id("googleCalendarConnections") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const maintenance: Maintenance = await ctx.runQuery(refs.watchMaintenance.getWatchMaintenance, { connectionId: args.connectionId, now: Date.now() });
    for (const channelId of maintenance.retiringChannelIds) await stopWatch(ctx, channelId);
    if (!maintenance.hasPending && (maintenance.activeExpirationAt === undefined || maintenance.activeExpirationAt <= Date.now() + WATCH_RENEWAL_WINDOW_MS)) {
      await createWatch(ctx, args.connectionId, maintenance.currentChannelId);
    }
    return null;
  },
});

export const continueWatchRenewal = internalAction({
  args: { state: v.union(v.literal("connected"), v.literal("syncing")), cursor: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const page: PaginationResult = await ctx.runQuery(refs.watchMaintenance.listMaintenanceConnectionIds, { state: args.state, paginationOpts: { numItems: 20, cursor: args.cursor } });
    for (const connectionId of page.page) await ctx.scheduler.runAfter(0, refs.watchActions.renewConnectionWatch, { connectionId });
    if (!page.isDone) await ctx.scheduler.runAfter(0, refs.watchActions.continueWatchRenewal, { state: args.state, cursor: page.continueCursor });
    return null;
  },
});

export const renewExpiringGoogleCalendarWatches = internalAction({
  args: {}, returns: v.null(),
  handler: async (ctx) => {
    for (const state of ["connected", "syncing"] as const) await ctx.scheduler.runAfter(0, refs.watchActions.continueWatchRenewal, { state, cursor: null });
    return null;
  },
});

export const runStaleSyncSweepPage = internalAction({
  args: { state: v.union(v.literal("connected"), v.literal("syncing")), cursor: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await ctx.runMutation(refs.watchMaintenance.scheduleStaleSyncBatch, { state: args.state, paginationOpts: { numItems: 20, cursor: args.cursor }, staleBefore: Date.now() - CALENDAR_PAGE_FRESHNESS_MS, now: Date.now() });
    if (!result.isDone) await ctx.scheduler.runAfter(0, refs.watchActions.runStaleSyncSweepPage, { state: args.state, cursor: result.continueCursor });
    return null;
  },
});

export const sweepStaleGoogleCalendarSyncs = internalAction({
  args: {}, returns: v.null(),
  handler: async (ctx) => {
    for (const state of ["connected", "syncing"] as const) await ctx.scheduler.runAfter(0, refs.watchActions.runStaleSyncSweepPage, { state, cursor: null });
    return null;
  },
});

export const runDailyGoogleCalendarMaintenance = internalAction({
  args: {}, returns: v.null(),
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, refs.watchActions.renewExpiringGoogleCalendarWatches, {});
    await ctx.scheduler.runAfter(0, refs.watchActions.sweepStaleGoogleCalendarSyncs, {});
    return null;
  },
});
