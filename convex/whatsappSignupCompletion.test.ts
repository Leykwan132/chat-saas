import { expect, test } from "vitest";
import type { Id } from "./_generated/dataModel";
import {
  runServerOwnedWhatsAppSignup,
  type ServerOwnedWhatsAppSignupDependencies,
} from "./whatsappSignupCompletion";

function createCompletionFixture() {
  const state: {
    events: string[];
    diagnostics: Array<{
      stage: string;
      data?: Record<string, unknown>;
    }>;
    attempt?: Record<string, unknown>;
    channel?: Record<string, unknown>;
    error?: string;
  } = { events: [], diagnostics: [] };
  const dependencies: ServerOwnedWhatsAppSignupDependencies = {
    exchangeAuthorizationCode: async (code) => {
      state.events.push(`exchange:${code}`);
      return {
        access_token: "business-token",
        expires_in: 3600,
      };
    },
    discoverAssets: async (accessToken) => {
      state.events.push(`discover:${accessToken}`);
      return {
        wabaId: "waba-123",
        phoneNumber: {
          id: "phone-123",
          display_phone_number: "+1 555 078 3881",
        },
      };
    },
    updateAttempt: async (patch) => {
      state.events.push(`attempt:${String(patch.status)}`);
      state.attempt = { ...state.attempt, ...patch };
    },
    startPendingChannel: async (assets) => {
      state.events.push(`pending:${assets.phoneNumberId}`);
      return "pending-channel-123" as Id<"channels">;
    },
    setChannelProgress: async (progressStep) => {
      state.events.push(`progress:${progressStep}`);
    },
    subscribeWaba: async (wabaId, accessToken) => {
      state.events.push(`subscribe:${wabaId}:${accessToken}`);
    },
    persistChannel: async (channel) => {
      state.events.push(`persist:${channel.phoneNumberId}`);
      state.channel = channel;
      return "channel-123" as Id<"channels">;
    },
    startSync: async (channelId) => {
      state.events.push(`sync:${channelId}`);
    },
    recordFailure: async (error) => {
      state.events.push("failure");
      state.error = error;
    },
    reportStage: (stage, data) => {
      state.diagnostics.push({ stage, data });
    },
    now: () => 1_700_000_000_000,
  };
  return { state, dependencies };
}

test("discovers Meta assets before persisting the backend token and returns status only", async () => {
  const { state, dependencies } = createCompletionFixture();

  const result = await runServerOwnedWhatsAppSignup(
    {
      code: "oauth-code",
      orgId: "org-123",
      userId: "user-123",
      attemptId: "attempt-123" as Id<"whatsappConnectionAttempts">,
    },
    dependencies,
  );

  expect(result).toEqual({ status: "syncing" });
  expect(state.channel).toEqual({
    orgId: "org-123",
    wabaId: "waba-123",
    phoneNumberId: "phone-123",
    displayPhoneNumber: "+1 555 078 3881",
    accessToken: "business-token",
    tokenExpiresAt: 1_700_003_600_000,
    connectedByUserId: "user-123",
  });
  expect(state.events).toEqual([
    "exchange:oauth-code",
    "discover:business-token",
    "attempt:signup_finished",
    "pending:phone-123",
    "progress:subscribing",
    "subscribe:waba-123:business-token",
    "persist:phone-123",
    "attempt:token_ready",
    "sync:channel-123",
  ]);
  expect(state.diagnostics.map(({ stage }) => stage)).toEqual([
    "code_exchange_started",
    "code_exchange_completed",
    "asset_discovery_started",
    "asset_discovery_completed",
    "attempt_signup_finished",
    "pending_channel_started",
    "channel_progress_subscribing",
    "waba_subscription_started",
    "waba_subscription_completed",
    "channel_persist_started",
    "channel_persist_completed",
    "attempt_token_ready",
    "sync_started",
    "signup_completed",
  ]);
  expect(state.diagnostics[1]?.data).toEqual({
    tokenType: undefined,
    expiresIn: 3600,
  });
  expect(state.diagnostics[5]?.data).toEqual({
    channelId: "pending-channel-123",
  });
  expect(state.diagnostics[10]?.data).toEqual({
    channelId: "channel-123",
  });
});

test("does not create a channel when Meta asset discovery fails", async () => {
  const { state, dependencies } = createCompletionFixture();
  dependencies.discoverAssets = async () => {
    state.events.push("discover:failed");
    throw new Error("No WhatsApp Business Account was authorized.");
  };

  await expect(
    runServerOwnedWhatsAppSignup(
      {
        code: "oauth-code",
        orgId: "org-123",
        userId: "user-123",
        attemptId: "attempt-123" as Id<"whatsappConnectionAttempts">,
      },
      dependencies,
    ),
  ).rejects.toThrow("No WhatsApp Business Account was authorized.");

  expect(state.channel).toBeUndefined();
  expect(state.error).toBe("No WhatsApp Business Account was authorized.");
  expect(state.events).toEqual([
    "exchange:oauth-code",
    "discover:failed",
    "failure",
  ]);
  expect(state.diagnostics.at(-1)).toEqual({
    stage: "signup_failed",
    data: {
      failedStage: "asset_discovery",
      error: "No WhatsApp Business Account was authorized.",
    },
  });
});
