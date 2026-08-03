import type { Id } from "./_generated/dataModel";
import type {
  TokenExchangeResponse,
  WhatsAppMetaSignupAssets,
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
  displayUsername?: string;
  accessToken: string;
  tokenExpiresAt?: number;
  connectedByUserId: string;
};

export type ServerOwnedWhatsAppSignupDependencies = {
  exchangeAuthorizationCode(code: string): Promise<TokenExchangeResponse>;
  discoverAssets(accessToken: string): Promise<WhatsAppMetaSignupAssets>;
  updateAttempt(patch: AttemptPatch): Promise<void>;
  startPendingChannel(input: PendingChannelInput): Promise<Id<"channels">>;
  setChannelProgress(progressStep: "subscribing"): Promise<void>;
  subscribeWaba(wabaId: string, accessToken: string): Promise<void>;
  persistChannel(input: PersistChannelInput): Promise<Id<"channels">>;
  startSync(channelId: Id<"channels">): Promise<void>;
  recordFailure(error: string): Promise<void>;
  reportStage(stage: string, data?: Record<string, unknown>): void;
  now(): number;
};

export async function runServerOwnedWhatsAppSignup(
  input: CompletionInput,
  dependencies: ServerOwnedWhatsAppSignupDependencies,
): Promise<{ status: "syncing" }> {
  let failedStage = "initialization";
  try {
    failedStage = "code_exchange";
    dependencies.reportStage("code_exchange_started");
    const token = await dependencies.exchangeAuthorizationCode(input.code);
    dependencies.reportStage("code_exchange_completed", {
      tokenType: token.token_type,
      expiresIn: token.expires_in,
    });
    failedStage = "asset_discovery";
    dependencies.reportStage("asset_discovery_started");
    const assets = await dependencies.discoverAssets(token.access_token);
    const phoneNumberId = assets.phoneNumber.id;
    dependencies.reportStage("asset_discovery_completed", {
      wabaId: assets.wabaId,
      phoneNumberId,
      hasDisplayPhoneNumber:
        assets.phoneNumber.display_phone_number !== undefined,
      hasDisplayUsername: assets.phoneNumber.verified_name !== undefined,
    });
    failedStage = "attempt_signup_finished";
    await dependencies.updateAttempt({
      wabaId: assets.wabaId,
      phoneNumberId,
      status: "signup_finished",
    });
    dependencies.reportStage("attempt_signup_finished");
    failedStage = "pending_channel";
    const pendingChannelId = await dependencies.startPendingChannel({
      wabaId: assets.wabaId,
      phoneNumberId,
      ...(input.agentId !== undefined ? { agentId: input.agentId } : {}),
    });
    dependencies.reportStage("pending_channel_started", {
      channelId: pendingChannelId,
    });
    failedStage = "channel_progress";
    await dependencies.setChannelProgress("subscribing");
    dependencies.reportStage("channel_progress_subscribing");
    failedStage = "waba_subscription";
    dependencies.reportStage("waba_subscription_started");
    await dependencies.subscribeWaba(assets.wabaId, token.access_token);
    dependencies.reportStage("waba_subscription_completed");
    failedStage = "channel_persist";
    dependencies.reportStage("channel_persist_started");
    const channelId = await dependencies.persistChannel({
      orgId: input.orgId,
      wabaId: assets.wabaId,
      phoneNumberId,
      ...(assets.phoneNumber.display_phone_number !== undefined
        ? { displayPhoneNumber: assets.phoneNumber.display_phone_number }
        : {}),
      ...(assets.phoneNumber.verified_name !== undefined
        ? { displayUsername: assets.phoneNumber.verified_name }
        : {}),
      accessToken: token.access_token,
      ...(token.expires_in !== undefined
        ? { tokenExpiresAt: dependencies.now() + token.expires_in * 1000 }
        : {}),
      connectedByUserId: input.userId,
      ...(input.agentId !== undefined ? { agentId: input.agentId } : {}),
    });
    dependencies.reportStage("channel_persist_completed", { channelId });
    failedStage = "attempt_token_ready";
    await dependencies.updateAttempt({
      wabaId: assets.wabaId,
      phoneNumberId,
      channelId,
      status: "token_ready",
    });
    dependencies.reportStage("attempt_token_ready");
    failedStage = "sync_start";
    await dependencies.startSync(channelId);
    dependencies.reportStage("sync_started", { channelId });
    dependencies.reportStage("signup_completed", { channelId });
    return { status: "syncing" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dependencies.reportStage("signup_failed", {
      failedStage,
      error: message,
    });
    await dependencies.recordFailure(message);
    throw error;
  }
}
