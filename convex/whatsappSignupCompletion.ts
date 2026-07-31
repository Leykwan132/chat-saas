import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { getAuthContext, resolveChannelOrgId } from "./authUtils";
import { whatsappSyncPool } from "./channelSyncPools";
import { isOpenWhatsAppConnectionAttempt } from "./whatsappConnectionAttemptUtils";
import type {
  TokenExchangeResponse,
  WhatsAppMetaSignupAssets,
} from "./whatsappMetaSignup";
import {
  createWhatsAppMetaSignupClient,
  selectFirstMetaAppCredentials,
} from "./whatsappMetaSignup";

type CompletionInput = {
  code: string;
  orgId: string;
  userId: string;
  attemptId: Id<"whatsappConnectionAttempts">;
  agentId?: Id<"agents">;
};

type AttemptPatch = {
  wabaId?: string;
  phoneNumberId?: string;
  channelId?: Id<"channels">;
  status: "signup_finished" | "token_ready";
};

type PendingChannelInput = {
  wabaId: string;
  phoneNumberId: string;
  agentId?: Id<"agents">;
};

type PersistChannelInput = PendingChannelInput & {
  orgId: string;
  displayPhoneNumber?: string;
  accessToken: string;
  tokenExpiresAt?: number;
  connectedByUserId: string;
};

export type ServerOwnedWhatsAppSignupDependencies = {
  exchangeAuthorizationCode(code: string): Promise<TokenExchangeResponse>;
  discoverAssets(accessToken: string): Promise<WhatsAppMetaSignupAssets>;
  updateAttempt(patch: AttemptPatch): Promise<void>;
  startPendingChannel(input: PendingChannelInput): Promise<void>;
  setChannelProgress(progressStep: "subscribing"): Promise<void>;
  subscribeWaba(wabaId: string, accessToken: string): Promise<void>;
  persistChannel(input: PersistChannelInput): Promise<Id<"channels">>;
  startSync(channelId: Id<"channels">): Promise<void>;
  recordFailure(error: string): Promise<void>;
  now(): number;
};

export async function runServerOwnedWhatsAppSignup(
  input: CompletionInput,
  dependencies: ServerOwnedWhatsAppSignupDependencies,
): Promise<{ status: "syncing" }> {
  try {
    const token = await dependencies.exchangeAuthorizationCode(input.code);
    const assets = await dependencies.discoverAssets(token.access_token);
    const phoneNumberId = assets.phoneNumber.id;
    await dependencies.updateAttempt({
      wabaId: assets.wabaId,
      phoneNumberId,
      status: "signup_finished",
    });
    await dependencies.startPendingChannel({
      wabaId: assets.wabaId,
      phoneNumberId,
      ...(input.agentId !== undefined ? { agentId: input.agentId } : {}),
    });
    await dependencies.setChannelProgress("subscribing");
    await dependencies.subscribeWaba(assets.wabaId, token.access_token);
    const channelId = await dependencies.persistChannel({
      orgId: input.orgId,
      wabaId: assets.wabaId,
      phoneNumberId,
      ...(assets.phoneNumber.display_phone_number !== undefined
        ? { displayPhoneNumber: assets.phoneNumber.display_phone_number }
        : {}),
      accessToken: token.access_token,
      ...(token.expires_in !== undefined
        ? { tokenExpiresAt: dependencies.now() + token.expires_in * 1000 }
        : {}),
      connectedByUserId: input.userId,
      ...(input.agentId !== undefined ? { agentId: input.agentId } : {}),
    });
    await dependencies.updateAttempt({
      wabaId: assets.wabaId,
      phoneNumberId,
      channelId,
      status: "token_ready",
    });
    await dependencies.startSync(channelId);
    return { status: "syncing" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await dependencies.recordFailure(message);
    throw error;
  }
}

export async function completeWhatsAppSignup(
  ctx: ActionCtx,
  args: {
    code: string;
    attemptId: Id<"whatsappConnectionAttempts">;
  },
): Promise<{ status: "syncing" }> {
  const startedAt = Date.now();
  const { orgId, userId } = await getAuthContext(ctx);
  const channelOrgId = resolveChannelOrgId(orgId, userId);
  const attempt = await ctx.runQuery(
    internal.whatsappEmbeddedSignup.internalGetAttempt,
    { attemptId: args.attemptId },
  );
  if (attempt === null) {
    throw new Error("Connection attempt not found.");
  }
  if (attempt.connectedByUserId !== userId || attempt.orgId !== channelOrgId) {
    throw new Error("Not allowed to complete this connection attempt.");
  }
  if (!isOpenWhatsAppConnectionAttempt(attempt)) {
    throw new Error("This connection attempt is no longer active.");
  }

  const credentials = selectFirstMetaAppCredentials({
    appIds: process.env.META_APP_ID,
    appSecrets: process.env.META_APP_SECRET,
  });
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
        await ctx.runMutation(internal.channels.internalStartPending, {
          orgId: channelOrgId,
          wabaId: assets.wabaId,
          phoneNumberId: assets.phoneNumberId,
          connectedByUserId: userId,
          ...(assets.agentId !== undefined ? { agentId: assets.agentId } : {}),
        });
        pendingChannelStarted = true;
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
      now: Date.now,
    },
  );

  console.log("[whatsapp-connect]:completeSignup", "completed", {
    attemptId: args.attemptId,
    durationMs: Date.now() - startedAt,
  });
  return result;
}
