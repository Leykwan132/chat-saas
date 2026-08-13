import type { FunctionReference } from "convex/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { getAuthContext } from "../authUtils";
import { CALENDAR_PAGE_FRESHNESS_MS } from "./constants";
import { getPrimaryCalendar } from "./calendarTimezone";
import { googleCalendarAccountEmail } from "./connectedAccountEmail";
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
  connectedAccountEmail?: string;
  activeWatchChannelId?: Id<"googleCalendarWatchChannels">;
};

type SyncResult = { kind: "completed" | "coalesced"; passes: number; dirty: boolean };
type WatchResult = { kind: string };
type StopWatchResult = { kind: "stopped" | "expired" | "already_stopped" };

export type GoogleCalendarConnectionDependencies = {
  getCredential: (
    workosUserId: string,
    options?: { retryMissing?: boolean },
  ) => Promise<GoogleCalendarCredentialResult>;
  getPrimaryCalendar: (
    actor: { workosUserId: string },
    fallbackTimeZone: string,
  ) => Promise<{ timeZone: string; calendarId?: string }>;
  runSync: (connectionId: Id<"googleCalendarConnections">) => Promise<SyncResult>;
  createWatch: (connectionId: Id<"googleCalendarConnections">) => Promise<WatchResult>;
  stopWatch: (channelId: Id<"googleCalendarWatchChannels">) => Promise<StopWatchResult>;
  deleteConnectedAccount: (workosUserId: string) => Promise<void>;
};

type GoogleConnectionRefs = {
  connectionLifecycle: {
    getForUser: FunctionReference<"query", "internal", { userId: Id<"users"> }, ConnectionSnapshot | null>;
    getFallbackTimeZone: FunctionReference<"query", "internal", { teamId: Id<"teams"> }, string>;
    ensureSyncing: FunctionReference<"mutation", "internal", { userId: Id<"users">; timeZone: string; now: number; connectedAccountEmail?: string }, Id<"googleCalendarConnections">>;
    markNeedsReauthorization: FunctionReference<"mutation", "internal", { userId: Id<"users">; now: number }, null>;
    markReconcileFailed: FunctionReference<"mutation", "internal", { connectionId: Id<"googleCalendarConnections">; errorKind: "failed"; now: number }, null>;
    markDisconnected: FunctionReference<"mutation", "internal", { connectionId: Id<"googleCalendarConnections">; now: number }, null>;
    setConnectedAccountEmail: FunctionReference<"mutation", "internal", { connectionId: Id<"googleCalendarConnections">; connectedAccountEmail: string; now: number }, null>;
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
    getCredential: (workosUserId, options) =>
      getGoogleCalendarCredential(workosUserId, fetch, options),
    getPrimaryCalendar: (credential, fallbackTimeZone) =>
      getPrimaryCalendar(credential, fallbackTimeZone),
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
  credential?: GoogleCalendarCredentialResult,
): Promise<GoogleCalendarConnectionStatus> {
  const connection = await ctx.runQuery(refs.connectionLifecycle.getForUser, { userId });
  const status = googleCalendarConnectionStatus(connection);
  if (credential?.workosHttpStatus !== undefined) {
    status.workosHttpStatus = credential.workosHttpStatus;
  }
  if (credential?.workosConnectedAccount !== undefined) {
    status.workosConnectedAccount = credential.workosConnectedAccount;
  }
  return status;
}

export async function reconcileGoogleCalendarConnection(
  ctx: ActionCtx,
  dependencies: GoogleCalendarConnectionDependencies,
  options: { requireWorkosAccount?: boolean } = {},
): Promise<GoogleCalendarConnectionStatus> {
  const auth = await getAuthContext(ctx);
  const credential = await dependencies.getCredential(auth.userId, {
    retryMissing: options.requireWorkosAccount === true,
  });
  if (credential.kind === "not_connected") {
    if (options.requireWorkosAccount === true) {
      throw new Error(
        "Google Calendar is not connected in WorkOS yet. Finish the Google prompt, then try Connect again.",
      );
    }
    return await currentStatus(ctx, auth.userDbId, credential);
  }
  if (credential.kind === "needs_reauthorization") {
    await ctx.runMutation(refs.connectionLifecycle.markNeedsReauthorization, {
      userId: auth.userDbId,
      now: Date.now(),
    });
    return await currentStatus(ctx, auth.userDbId, credential);
  }
  if (credential.kind !== "active") {
    throw new Error("Google Calendar is temporarily unavailable.");
  }
  const fallbackTimeZone: string = await ctx.runQuery(
    refs.connectionLifecycle.getFallbackTimeZone,
    { teamId: auth.activeTeamId },
  );
  let timeZone = fallbackTimeZone;
  let calendarId: string | undefined;
  try {
    const calendar = await dependencies.getPrimaryCalendar(credential, fallbackTimeZone);
    timeZone = calendar.timeZone;
    calendarId = calendar.calendarId;
  } catch {
    timeZone = fallbackTimeZone;
  }
  const connectedAccountEmail = googleCalendarAccountEmail(
    credential.workosConnectedAccount,
    calendarId,
  );
  const connectionId = await ctx.runMutation(refs.connectionLifecycle.ensureSyncing, {
    userId: auth.userDbId,
    timeZone,
    now: Date.now(),
    ...(connectedAccountEmail === undefined ? {} : { connectedAccountEmail }),
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
  return await currentStatus(ctx, auth.userDbId, credential);
}

async function persistMissingConnectedAccountEmail(
  ctx: ActionCtx,
  dependencies: GoogleCalendarConnectionDependencies,
  connection: ConnectionSnapshot,
  workosUserId: string,
  now: number,
) {
  if (connection.connectedAccountEmail !== undefined) return;
  const credential = await dependencies.getCredential(workosUserId);
  if (credential.kind !== "active") return;
  const calendar = await dependencies.getPrimaryCalendar(credential, connection.timeZone);
  const connectedAccountEmail = googleCalendarAccountEmail(
    credential.workosConnectedAccount,
    calendar.calendarId,
  );
  if (connectedAccountEmail === undefined) return;
  await ctx.runMutation(refs.connectionLifecycle.setConnectedAccountEmail, {
    connectionId: connection._id,
    connectedAccountEmail,
    now,
  });
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
  await persistMissingConnectedAccountEmail(
    ctx,
    dependencies,
    connection,
    auth.userId,
    now,
  );
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
