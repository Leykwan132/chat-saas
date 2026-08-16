import type { FunctionReference } from "convex/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction, type ActionCtx } from "../_generated/server";
import { WATCH_RENEWAL_WINDOW_MS } from "./constants";
import { createGoogleCalendarChannelToken } from "./channelToken";
import { googleCalendarRequest } from "./googleClient";
import {
  compensateActivationFailure,
  settleSupersededWatch,
  type WatchResponse,
} from "./watchCompensation";
import {
  activeGoogleCalendarCredential,
  googleCalendarWebhookAddress,
  stopExternalGoogleCalendarWatch,
  validatedGoogleCalendarWatchResponse,
} from "./watchProvider";
type ConnectionState = "connected" | "syncing" | "needs_reauthorization" | "disconnected";
type WatchableConnectionState = "connected" | "syncing";
type ConnectionForWatch = { connectionId: Id<"googleCalendarConnections">; workosUserId: string; state: WatchableConnectionState };
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
  connectionState: ConnectionState;
};
type PaginationResult = { page: Id<"googleCalendarConnections">[]; isDone: boolean; continueCursor: string };
type Reservation =
  | { kind: "reserved"; channelId: Id<"googleCalendarWatchChannels"> }
  | { kind: "existing"; channelId: Id<"googleCalendarWatchChannels"> }
  | { kind: "superseded" };
type Activation =
  | { kind: "activated"; retiringChannelId?: Id<"googleCalendarWatchChannels"> }
  | { kind: "superseded" };
type CreateWatchResult =
  | { kind: "active"; channelId: Id<"googleCalendarWatchChannels"> }
  | { kind: "existing"; channelId?: Id<"googleCalendarWatchChannels"> }
  | { kind: "superseded"; channelId?: Id<"googleCalendarWatchChannels"> };
type GoogleWatchRefs = {
  watchActivation: {
    activatePendingWatch: FunctionReference<"mutation", "internal", { pendingChannelId: Id<"googleCalendarWatchChannels">; expectedChannelId: string; resourceId: string; resourceUri: string; expirationAt: number; replacingChannelId?: Id<"googleCalendarWatchChannels">; now: number }, Activation>;
  };
  watchStore: {
    getConnectionForWatch: FunctionReference<"query", "internal", { connectionId: Id<"googleCalendarConnections"> }, ConnectionForWatch>;
    reservePendingWatch: FunctionReference<"mutation", "internal", { connectionId: Id<"googleCalendarConnections">; channelId: string; tokenHash: string; pendingExpirationAt: number; replacingChannelId?: Id<"googleCalendarWatchChannels">; now: number }, Reservation>;
    getChannelForStop: FunctionReference<"query", "internal", { channelId: Id<"googleCalendarWatchChannels"> }, StopChannel>;
    markWatchStopped: FunctionReference<"mutation", "internal", { channelId: Id<"googleCalendarWatchChannels">; state: "retired" | "expired"; now: number }, null>;
  };
  watchMaintenance: {
    listMaintenanceConnectionIds: FunctionReference<"query", "internal", { state: ConnectionState; paginationOpts: { numItems: number; cursor: string | null } }, PaginationResult>;
    getWatchMaintenance: FunctionReference<"query", "internal", { connectionId: Id<"googleCalendarConnections">; now: number }, Maintenance>;
  };
  watchActions: {
    continueWatchRenewal: FunctionReference<"action", "internal", { state: ConnectionState; cursor: string | null }, null>;
    renewConnectionWatch: FunctionReference<"action", "internal", { connectionId: Id<"googleCalendarConnections"> }, null>;
    renewExpiringGoogleCalendarWatches: FunctionReference<"action", "internal", Record<string, never>, null>;
    cleanupRetiringWatch: FunctionReference<"action", "internal", { channelId: Id<"googleCalendarWatchChannels"> }, null>;
  };
};
const refs: GoogleWatchRefs = (internal as unknown as { googleCalendar: GoogleWatchRefs }).googleCalendar;
function isWatchableConnectionState(state: ConnectionState): state is WatchableConnectionState {
  return state === "connected" || state === "syncing";
}
async function createWatch(
  ctx: ActionCtx,
  connectionId: Id<"googleCalendarConnections">,
  replacingChannelId?: Id<"googleCalendarWatchChannels">,
): Promise<CreateWatchResult> {
  const connection: ConnectionForWatch = await ctx.runQuery(refs.watchStore.getConnectionForWatch, { connectionId });
  const credential = await activeGoogleCalendarCredential(connection.workosUserId);
  const generated = await createGoogleCalendarChannelToken();
  const externalChannelId = crypto.randomUUID();
  const reservedAt = Date.now();
  const reservation: Reservation = await ctx.runMutation(refs.watchStore.reservePendingWatch, {
    connectionId,
    channelId: externalChannelId,
    tokenHash: generated.tokenHash,
    pendingExpirationAt: reservedAt + 5 * 60 * 1000,
    replacingChannelId,
    now: reservedAt,
  });
  if (reservation.kind !== "reserved") return reservation;
  const requestedExpirationAt = reservedAt + 7 * 24 * 60 * 60 * 1000;
  let response: WatchResponse;
  try {
    response = validatedGoogleCalendarWatchResponse(await googleCalendarRequest(credential, {
      method: "POST",
      path: "calendars/primary/events/watch",
      body: {
        id: externalChannelId,
        type: "web_hook",
        address: googleCalendarWebhookAddress(),
        token: generated.token,
        expiration: String(requestedExpirationAt),
      },
    }), externalChannelId, Date.now());
  } catch (error) {
    await ctx.runMutation(refs.watchStore.markWatchStopped, { channelId: reservation.channelId, state: "expired", now: Date.now() });
    throw error;
  }
  let activated: Activation;
  try {
    activated = await ctx.runMutation(refs.watchActivation.activatePendingWatch, {
      pendingChannelId: reservation.channelId,
      expectedChannelId: externalChannelId,
      ...response,
      replacingChannelId,
      now: Date.now(),
    });
  } catch (activationError) {
    return await compensateActivationFailure({
      ctx,
      pendingChannelId: reservation.channelId,
      externalChannelId,
      response,
      credential,
      activationError,
    });
  }
  if (activated.kind === "superseded") {
    await settleSupersededWatch({
      ctx,
      channelId: reservation.channelId,
      externalChannelId,
      resourceId: response.resourceId,
      credential,
    });
    return { kind: "superseded" as const };
  }
  if (activated.retiringChannelId !== undefined) {
    await ctx.scheduler.runAfter(0, refs.watchActions.cleanupRetiringWatch, {
      channelId: activated.retiringChannelId,
    });
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
  const credential = await activeGoogleCalendarCredential(channel.workosUserId);
  await stopExternalGoogleCalendarWatch(credential, channel.externalChannelId, channel.resourceId);
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
  handler: async (ctx, args): Promise<CreateWatchResult> => await createWatch(ctx, args.connectionId),
});

export const stopGoogleCalendarWatch = internalAction({
  args: { channelId: v.id("googleCalendarWatchChannels") },
  returns: v.object({ kind: v.union(v.literal("stopped"), v.literal("expired"), v.literal("already_stopped")) }),
  handler: async (ctx, args) => await stopWatch(ctx, args.channelId),
});

export const cleanupRetiringWatch = internalAction({
  args: { channelId: v.id("googleCalendarWatchChannels") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const channel: StopChannel = await ctx.runQuery(refs.watchStore.getChannelForStop, args);
    if (channel.state !== "retiring") return null;
    try {
      await stopWatch(ctx, channel.channelId);
    } catch {
      return null;
    }
    return null;
  },
});

export const renewConnectionWatch = internalAction({
  args: { connectionId: v.id("googleCalendarConnections") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const maintenance: Maintenance = await ctx.runQuery(refs.watchMaintenance.getWatchMaintenance, { connectionId: args.connectionId, now: Date.now() });
    if (isWatchableConnectionState(maintenance.connectionState) && !maintenance.hasPending && (maintenance.activeExpirationAt === undefined || maintenance.activeExpirationAt <= Date.now() + WATCH_RENEWAL_WINDOW_MS)) {
      await createWatch(ctx, args.connectionId, maintenance.currentChannelId);
    }
    for (const channelId of maintenance.retiringChannelIds) {
      await ctx.scheduler.runAfter(0, refs.watchActions.cleanupRetiringWatch, {
        channelId,
      });
    }
    return null;
  },
});

export const continueWatchRenewal = internalAction({
  args: { state: v.union(v.literal("connected"), v.literal("syncing"), v.literal("needs_reauthorization"), v.literal("disconnected")), cursor: v.union(v.string(), v.null()) },
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
    for (const state of ["connected", "syncing", "needs_reauthorization", "disconnected"] as const) await ctx.scheduler.runAfter(0, refs.watchActions.continueWatchRenewal, { state, cursor: null });
    return null;
  },
});

export const runDailyGoogleCalendarMaintenance = internalAction({
  args: {}, returns: v.null(),
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, refs.watchActions.renewExpiringGoogleCalendarWatches, {});
    return null;
  },
});
