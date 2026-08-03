import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { getAuthContext, resolveChannelOrgId } from "./authUtils";
import { whatsappSyncPool } from "./channelSyncPools";
import { isOpenWhatsAppConnectionAttempt } from "./whatsappConnectionAttemptUtils";
import {
  createWhatsAppMetaSignupClient,
  selectFirstMetaAppCredentials,
} from "./whatsappMetaSignup";
import { runServerOwnedWhatsAppSignup } from "./whatsappSignupOrchestration";
export {
  runServerOwnedWhatsAppSignup,
  type ServerOwnedWhatsAppSignupDependencies,
} from "./whatsappSignupOrchestration";

export async function completeWhatsAppSignup(
  ctx: ActionCtx,
  args: {
    code: string;
    attemptId: Id<"whatsappConnectionAttempts">;
  },
): Promise<{ status: "syncing" }> {
  const startedAt = Date.now();
  console.log("[whatsapp-connect]:completeSignup", "received", {
    attemptId: args.attemptId,
    hasCode: args.code.length > 0,
    codeLength: args.code.length,
  });
  const { orgId, userId } = await getAuthContext(ctx);
  const channelOrgId = resolveChannelOrgId(orgId, userId);
  console.log("[whatsapp-connect]:completeSignup", "auth_resolved", {
    attemptId: args.attemptId,
    orgId: channelOrgId,
    userId,
  });
  const attempt = await ctx.runQuery(
    internal.whatsappEmbeddedSignup.internalGetAttempt,
    { attemptId: args.attemptId },
  );
  if (attempt === null) {
    console.error("[whatsapp-connect]:completeSignup", "attempt_not_found", {
      attemptId: args.attemptId,
    });
    throw new Error("Connection attempt not found.");
  }
  if (attempt.connectedByUserId !== userId || attempt.orgId !== channelOrgId) {
    console.error("[whatsapp-connect]:completeSignup", "attempt_not_owned", {
      attemptId: args.attemptId,
      attemptOrgId: attempt.orgId,
      requestOrgId: channelOrgId,
    });
    throw new Error("Not allowed to complete this connection attempt.");
  }
  if (!isOpenWhatsAppConnectionAttempt(attempt)) {
    console.error("[whatsapp-connect]:completeSignup", "attempt_not_open", {
      attemptId: args.attemptId,
      status: attempt.status,
    });
    throw new Error("This connection attempt is no longer active.");
  }
  console.log("[whatsapp-connect]:completeSignup", "attempt_validated", {
    attemptId: args.attemptId,
    status: attempt.status,
    agentId: attempt.agentId,
  });

  let credentials: { appId: string; appSecret: string };
  try {
    credentials = selectFirstMetaAppCredentials({
      appIds: process.env.META_APP_ID,
      appSecrets: process.env.META_APP_SECRET,
    });
  } catch (error) {
    console.error("[whatsapp-connect]:completeSignup", "credentials_invalid", {
      attemptId: args.attemptId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
  const client = createWhatsAppMetaSignupClient({
    ...credentials,
    graphVersion: process.env.META_GRAPH_API_VERSION || "v22.0",
  });
  let discoveredPhoneNumberId: string | undefined;
  let pendingChannelStarted = false;

  console.log("[whatsapp-connect]:completeSignup", "started", {
    attemptId: args.attemptId,
    orgId: channelOrgId,
    userId,
  });

  const result = await runServerOwnedWhatsAppSignup(
    {
      code: args.code,
      orgId: channelOrgId,
      userId,
      attemptId: args.attemptId,
      ...(attempt.agentId !== undefined ? { agentId: attempt.agentId } : {}),
    },
    {
      exchangeAuthorizationCode: client.exchangeAuthorizationCode,
      discoverAssets: async (accessToken) => {
        const assets = await client.discoverAssets(accessToken);
        discoveredPhoneNumberId = assets.phoneNumber.id;
        return assets;
      },
      updateAttempt: async (patch) => {
        await ctx.runMutation(
          internal.whatsappEmbeddedSignup.internalUpdateConnectionAttempt,
          { attemptId: args.attemptId, ...patch },
        );
      },
      startPendingChannel: async (assets) => {
        const channelId = await ctx.runMutation(
          internal.channels.internalStartPending,
          {
            orgId: channelOrgId,
            wabaId: assets.wabaId,
            phoneNumberId: assets.phoneNumberId,
            connectedByUserId: userId,
            ...(assets.agentId !== undefined
              ? { agentId: assets.agentId }
              : {}),
          },
        );
        pendingChannelStarted = true;
        return channelId;
      },
      setChannelProgress: async (progressStep) => {
        if (discoveredPhoneNumberId === undefined) {
          throw new Error("WhatsApp phone number discovery did not complete.");
        }
        await ctx.runMutation(internal.channels.internalSetProgress, {
          orgId: channelOrgId,
          service: "whatsapp",
          progressStep,
          phoneNumberId: discoveredPhoneNumberId,
        });
      },
      subscribeWaba: client.subscribeWaba,
      persistChannel: async (channel) => {
        return await ctx.runMutation(internal.channels.internalUpsertWhatsApp, {
          ...channel,
          ...(channel.displayPhoneNumber !== undefined
            ? { displayPhoneNumber: channel.displayPhoneNumber }
            : {}),
          ...(channel.displayUsername !== undefined
            ? { displayUsername: channel.displayUsername }
            : {}),
          ...(channel.tokenExpiresAt !== undefined
            ? { tokenExpiresAt: channel.tokenExpiresAt }
            : {}),
          ...(channel.agentId !== undefined ? { agentId: channel.agentId } : {}),
        });
      },
      startSync: async (channelId) => {
        await ctx.runMutation(
          internal.whatsappEmbeddedSignup.internalStartCoexistenceSyncForChannel,
          { channelId, attemptId: args.attemptId },
        );
        await whatsappSyncPool.enqueueAction(
          ctx,
          internal.whatsappSync.initiateCoexistenceSync,
          { channelId },
        );
      },
      recordFailure: async (error) => {
        if (pendingChannelStarted && discoveredPhoneNumberId !== undefined) {
          await ctx.runMutation(internal.channels.internalRecordError, {
            orgId: channelOrgId,
            service: "whatsapp",
            error,
            connectedByUserId: userId,
            phoneNumberId: discoveredPhoneNumberId,
          });
        }
        await ctx.runMutation(
          internal.whatsappEmbeddedSignup.internalUpdateConnectionAttempt,
          { attemptId: args.attemptId, status: "error", lastError: error },
        );
      },
      reportStage: (stage, data) => {
        const details = { attemptId: args.attemptId, ...data };
        if (stage === "signup_failed") {
          console.error("[whatsapp-connect]:completeSignup", stage, details);
          return;
        }
        console.log("[whatsapp-connect]:completeSignup", stage, details);
      },
      now: Date.now,
    },
  );

  console.log("[whatsapp-connect]:completeSignup", "completed", {
    attemptId: args.attemptId,
    durationMs: Date.now() - startedAt,
  });
  return result;
}
