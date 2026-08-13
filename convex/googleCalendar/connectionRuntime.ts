import type { FunctionReference } from "convex/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { getAuthContext } from "../authUtils";
import { CALENDAR_PAGE_FRESHNESS_MS } from "./constants";
import { getPrimaryCalendarTimeZone } from "./calendarTimezone";
import {
  googleCalendarConnectionStatus,
  type GoogleCalendarConnectionStatus,
} from "./connectionStatus";
import { deleteWorkosGoogleCalendarAccount } from "./connectionWorkos";
import { getGoogleCalendarCredential, type GoogleCalendarCredentialResult } from "./workosToken";

type ConnectionSnapshot = {
  _id: Id<"googleCalendarConnections">;
  userId: Id<"users">;
  workosUserId: string;
  state: "connected" | "syncing" | "needs_reauthorization" | "disconnected";
  lastSuccessfulSyncAt?: number;
  lastErrorKind?: GoogleCalendarConnectionStatus["lastErrorKind"];
  timeZone: string;
  activeWatchChannelId?: Id<"googleCalendarWatchChannels">;
};

type SyncResult = { kind: "completed" | "coalesced"; passes: number; dirty: boolean };
type WatchResult = { kind: string };
type StopWatchResult = { kind: "stopped" | "expired" | "already_stopped" };

export type GoogleCalendarConnectionDependencies = {
  getCredential: (workosUserId: string) => Promise<GoogleCalendarCredentialResult>;
  getPrimaryTimeZone: (actor: { workosUserId: string }, fallbackTimeZone: string) => Promise<string>;
  runSync: (connectionId: Id<"googleCalendarConnections">) => Promise<SyncResult>;
  createWatch: (connectionId: Id<"googleCalendarConnections">) => Promise<WatchResult>;
  stopWatch: (channelId: Id<"googleCalendarWatchChannels">) => Promise<StopWatchResult>;
  deleteConnectedAccount: (workosUserId: string) => Promise<void>;
};

type GoogleConnectionRefs = {
  connectionLifecycle: {
    getForUser: FunctionReference<"query", "internal", { userId: Id<"users"> }, ConnectionSnapshot | null>;
    getFallbackTimeZone: FunctionReference<"query", "internal", { teamId: Id<"teams"> }, string>;
    ensureSyncing: FunctionReference<"mutation", "internal", { userId: Id<"users">; timeZone: string; now: number }, Id<"googleCalendarConnections">>;
    markNeedsReauthorization: FunctionReference<"mutation", "internal", { userId: Id<"users">; now: number }, null>;
    markReconcileFailed: FunctionReference<"mutation", "internal", { connectionId: Id<"googleCalendarConnections">; errorKind: "failed"; now: number }, null>;
    markDisconnected: FunctionReference<"mutation", "internal", { connectionId: Id<"googleCalendarConnections">; now: number }, null>;
    purgeImportedGoogleEvents: FunctionReference<"mutation", "internal", { userId: Id<"users">; now: number }, null>;
  };
  syncWorker: {
    run: FunctionReference<"action", "internal", { connectionId: Id<"googleCalendarConnections"> }, SyncResult>;
  };
  watchActions: {
    createGoogleCalendarWatch: FunctionReference<"action", "internal", { connectionId: Id<"googleCalendarConnections"> }, WatchResult>;
    stopGoogleCalendarWatch: FunctionReference<"action", "internal", { channelId: Id<"googleCalendarWatchChannels"> }, StopWatchResult>;
  };
};

const refs: GoogleConnectionRefs = (internal as unknown as { googleCalendar: GoogleConnectionRefs }).googleCalendar;

export function googleCalendarConnectionDependencies(
  ctx: ActionCtx,
): GoogleCalendarConnectionDependencies {
  return {
    getCredential: (workosUserId) => getGoogleCalendarCredential(workosUserId),
    getPrimaryTimeZone: (credential, fallbackTimeZone) =>
      getPrimaryCalendarTimeZone(credential, fallbackTimeZone),
    runSync: (connectionId) => ctx.runAction(refs.syncWorker.run, { connectionId }),
    createWatch: (connectionId) =>
      ctx.runAction(refs.watchActions.createGoogleCalendarWatch, { connectionId }),
    stopWatch: (channelId) =>
      ctx.runAction(refs.watchActions.stopGoogleCalendarWatch, { channelId }),
    deleteConnectedAccount: (workosUserId) => deleteWorkosGoogleCalendarAccount(workosUserId),
  };
}

async function currentStatus(
  ctx: ActionCtx,
  userId: Id<"users">,
): Promise<GoogleCalendarConnectionStatus> {
  const connection = await ctx.runQuery(refs.connectionLifecycle.getForUser, { userId });
  return googleCalendarConnectionStatus(connection);
}

export async function reconcileGoogleCalendarConnection(
  ctx: ActionCtx,
  dependencies: GoogleCalendarConnectionDependencies,
): Promise<GoogleCalendarConnectionStatus> {
  const auth = await getAuthContext(ctx);
  const credential = await dependencies.getCredential(auth.userId);
  if (credential.kind === "not_connected") return await currentStatus(ctx, auth.userDbId);
  if (credential.kind === "needs_reauthorization") {
    await ctx.runMutation(refs.connectionLifecycle.markNeedsReauthorization, {
      userId: auth.userDbId,
      now: Date.now(),
    });
    return await currentStatus(ctx, auth.userDbId);
  }
  if (credential.kind !== "active") {
    throw new Error("Google Calendar is temporarily unavailable.");
  }
  const fallbackTimeZone: string = await ctx.runQuery(
    refs.connectionLifecycle.getFallbackTimeZone,
    { teamId: auth.activeTeamId },
  );
  let timeZone = fallbackTimeZone;
  try {
    timeZone = await dependencies.getPrimaryTimeZone(credential, fallbackTimeZone);
  } catch {
    timeZone = fallbackTimeZone;
  }
  const connectionId = await ctx.runMutation(refs.connectionLifecycle.ensureSyncing, {
    userId: auth.userDbId,
    timeZone,
    now: Date.now(),
  });
  await dependencies.runSync(connectionId);
  try {
    await dependencies.createWatch(connectionId);
  } catch (error) {
    await ctx.runMutation(refs.connectionLifecycle.markReconcileFailed, {
      connectionId,
      errorKind: "failed",
      now: Date.now(),
    });
    throw error instanceof Error ? error : new Error("Google Calendar watch setup failed.");
  }
  return await currentStatus(ctx, auth.userDbId);
}

export async function refreshGoogleCalendarConnection(
  ctx: ActionCtx,
  dependencies: GoogleCalendarConnectionDependencies,
  now = Date.now(),
): Promise<GoogleCalendarConnectionStatus> {
  const auth = await getAuthContext(ctx);
  const connection = await ctx.runQuery(refs.connectionLifecycle.getForUser, {
    userId: auth.userDbId,
  });
  if (connection === null || connection.state === "disconnected") {
    return await currentStatus(ctx, auth.userDbId);
  }
  if (connection.state === "needs_reauthorization") {
    return await currentStatus(ctx, auth.userDbId);
  }
  if (
    connection.lastSuccessfulSyncAt !== undefined &&
    now - connection.lastSuccessfulSyncAt < CALENDAR_PAGE_FRESHNESS_MS
  ) {
    return await currentStatus(ctx, auth.userDbId);
  }
  await dependencies.runSync(connection._id);
  return await currentStatus(ctx, auth.userDbId);
}

export async function disconnectGoogleCalendarConnection(
  ctx: ActionCtx,
  dependencies: GoogleCalendarConnectionDependencies,
): Promise<GoogleCalendarConnectionStatus> {
  const auth = await getAuthContext(ctx);
  const connection = await ctx.runQuery(refs.connectionLifecycle.getForUser, {
    userId: auth.userDbId,
  });
  if (connection !== null && connection.activeWatchChannelId !== undefined) {
    try {
      await dependencies.stopWatch(connection.activeWatchChannelId);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
    }
  }
  await dependencies.deleteConnectedAccount(auth.userId);
  await ctx.runMutation(refs.connectionLifecycle.purgeImportedGoogleEvents, {
    userId: auth.userDbId,
    now: Date.now(),
  });
  if (connection !== null) {
    await ctx.runMutation(refs.connectionLifecycle.markDisconnected, {
      connectionId: connection._id,
      now: Date.now(),
    });
  }
  return await currentStatus(ctx, auth.userDbId);
}
