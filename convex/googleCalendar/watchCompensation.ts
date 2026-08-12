import type { FunctionReference } from "convex/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import {
  stopExternalGoogleCalendarWatch,
  type GoogleCalendarWatchCredential,
} from "./watchProvider";

type Recovery = { kind: "active" | "recoverable" };
export type WatchResponse = { resourceId: string; resourceUri: string; expirationAt: number };

const refs = (internal as unknown as {
  googleCalendar: {
    watchRecovery: {
      recordUnactivatedWatch: FunctionReference<"mutation", "internal", { pendingChannelId: Id<"googleCalendarWatchChannels">; expectedChannelId: string; resourceId: string; resourceUri: string; expirationAt: number; now: number }, Recovery>;
    };
    watchStore: {
      markWatchStopped: FunctionReference<"mutation", "internal", { channelId: Id<"googleCalendarWatchChannels">; state: "retired" | "expired"; now: number }, null>;
    };
    watchActions: {
      cleanupRetiringWatch: FunctionReference<"action", "internal", { channelId: Id<"googleCalendarWatchChannels"> }, null>;
    };
  };
}).googleCalendar;

export async function compensateActivationFailure(args: {
  ctx: ActionCtx;
  pendingChannelId: Id<"googleCalendarWatchChannels">;
  externalChannelId: string;
  response: WatchResponse;
  credential: GoogleCalendarWatchCredential;
  activationError: unknown;
}) {
  const recoveryArgs = {
    pendingChannelId: args.pendingChannelId,
    expectedChannelId: args.externalChannelId,
    ...args.response,
    now: Date.now(),
  };
  let recovery: Recovery;
  try {
    recovery = await args.ctx.runMutation(refs.watchRecovery.recordUnactivatedWatch, recoveryArgs);
  } catch {
    try {
      await stopExternalGoogleCalendarWatch(args.credential, args.externalChannelId, args.response.resourceId);
      await args.ctx.runMutation(refs.watchStore.markWatchStopped, { channelId: args.pendingChannelId, state: "retired", now: Date.now() });
    } catch {
      await args.ctx.runMutation(refs.watchRecovery.recordUnactivatedWatch, recoveryArgs);
    }
    throw args.activationError;
  }
  if (recovery.kind === "active") {
    return { kind: "active" as const, channelId: args.pendingChannelId };
  }
  try {
    await stopExternalGoogleCalendarWatch(args.credential, args.externalChannelId, args.response.resourceId);
    await args.ctx.runMutation(refs.watchStore.markWatchStopped, { channelId: args.pendingChannelId, state: "retired", now: Date.now() });
  } catch {
    throw args.activationError;
  }
  throw args.activationError;
}

export async function settleSupersededWatch(args: {
  ctx: ActionCtx;
  channelId: Id<"googleCalendarWatchChannels">;
  externalChannelId: string;
  resourceId: string;
  credential: GoogleCalendarWatchCredential;
}) {
  try {
    await stopExternalGoogleCalendarWatch(args.credential, args.externalChannelId, args.resourceId);
    await args.ctx.runMutation(refs.watchStore.markWatchStopped, { channelId: args.channelId, state: "retired", now: Date.now() });
  } catch {
    await args.ctx.scheduler.runAfter(0, refs.watchActions.cleanupRetiringWatch, { channelId: args.channelId });
  }
}
