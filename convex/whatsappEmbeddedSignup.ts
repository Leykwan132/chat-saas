import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getAuthContext, resolveChannelOrgId } from "./authUtils";
import { whatsappSyncPool } from "./channelSyncPools";
import {
  isOpenWhatsAppConnectionAttempt,
  maybeCompleteWhatsAppConnectionAttempt,
  WHATSAPP_OPEN_CONNECTION_ATTEMPT_STATUSES,
} from "./whatsappConnectionAttemptUtils";

const DEFAULT_GRAPH_VERSION = "v22.0";
const LOG_PREFIX = "[whatsapp-connect]";

function logWhatsAppConnect(
  step: string,
  data?: Record<string, unknown>,
) {
  if (data === undefined) {
    console.log(`${LOG_PREFIX}:completeSignup`, step);
    return;
  }
  console.log(`${LOG_PREFIX}:completeSignup`, step, data);
}

function graphVersion() {
  return process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
}

function graphBase() {
  return `https://graph.facebook.com/${graphVersion()}`;
}

/** Canonical redirect for WhatsApp embedded signup + code exchange. */
export function whatsappOAuthRedirectUri(): string {
  const siteUrl = process.env.CONVEX_SITE_URL;
  if (!siteUrl) {
    throw new Error("CONVEX_SITE_URL is not set");
  }
  return `${siteUrl.replace(/\/+$/, "")}/auth/whatsapp/callback`;
}

type GraphError = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

export const beginConnectionAttempt = mutation({
  args: {},
  handler: async (ctx): Promise<Id<"whatsappConnectionAttempts">> => {
    const { orgId, userId } = await getAuthContext(ctx);
    const channelOrgId = resolveChannelOrgId(orgId, userId);
    const now = Date.now();

    for (const status of WHATSAPP_OPEN_CONNECTION_ATTEMPT_STATUSES) {
      const existing = await ctx.db
        .query("whatsappConnectionAttempts")
        .withIndex("by_connectedByUserId_and_status", (q) =>
          q.eq("connectedByUserId", userId).eq("status", status),
        )
        .first();
      if (existing !== null) {
        throw new Error(
          "You already have a WhatsApp connection in progress. Cancel it before starting a new one.",
        );
      }
    }

    return await ctx.db.insert("whatsappConnectionAttempts", {
      orgId: channelOrgId,
      connectedByUserId: userId,
      status: "started",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const cancelConnectionAttempt = mutation({
  args: {
    attemptId: v.id("whatsappConnectionAttempts"),
  },
  handler: async (ctx, args) => {
    const { userId } = await getAuthContext(ctx);
    const attempt = await ctx.db.get(args.attemptId);
    if (attempt === null) {
      throw new Error("Connection attempt not found.");
    }
    if (attempt.connectedByUserId !== userId) {
      throw new Error("Not allowed to cancel this connection attempt.");
    }
    if (!isOpenWhatsAppConnectionAttempt(attempt) && attempt.status !== "error") {
      throw new Error("This connection attempt is no longer active.");
    }
    await ctx.db.patch(args.attemptId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
  },
});

export const getOpenConnectionAttempt = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getAuthContext(ctx);
    const statuses = [
      ...WHATSAPP_OPEN_CONNECTION_ATTEMPT_STATUSES,
      "error" as const,
    ];
    for (const status of statuses) {
      const attempt = await ctx.db
        .query("whatsappConnectionAttempts")
        .withIndex("by_connectedByUserId_and_status", (q) =>
          q.eq("connectedByUserId", userId).eq("status", status),
        )
        .first();
      if (attempt !== null) {
        return attempt;
      }
    }
    return null;
  },
});

export const internalUpdateConnectionAttempt = internalMutation({
  args: {
    attemptId: v.id("whatsappConnectionAttempts"),
    wabaId: v.optional(v.string()),
    phoneNumberId: v.optional(v.string()),
    channelId: v.optional(v.id("channels")),
    status: v.optional(
      v.union(
        v.literal("started"),
        v.literal("signup_finished"),
        v.literal("token_ready"),
        v.literal("connected"),
        v.literal("syncing"),
        v.literal("completed"),
        v.literal("cancelled"),
        v.literal("error"),
      ),
    ),
    lastError: v.optional(v.string()),
    partnerAppInstalledAt: v.optional(v.number()),
    syncStartedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (attempt === null) return;
    await ctx.db.patch(args.attemptId, {
      ...(args.wabaId !== undefined ? { wabaId: args.wabaId } : {}),
      ...(args.phoneNumberId !== undefined
        ? { phoneNumberId: args.phoneNumberId }
        : {}),
      ...(args.channelId !== undefined ? { channelId: args.channelId } : {}),
      ...(args.status !== undefined ? { status: args.status } : {}),
      ...(args.lastError !== undefined ? { lastError: args.lastError } : {}),
      ...(args.partnerAppInstalledAt !== undefined
        ? { partnerAppInstalledAt: args.partnerAppInstalledAt }
        : {}),
      ...(args.syncStartedAt !== undefined
        ? { syncStartedAt: args.syncStartedAt }
        : {}),
      updatedAt: Date.now(),
    });
  },
});

export const internalMaybeCompleteConnectionAttempt = internalMutation({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    await maybeCompleteWhatsAppConnectionAttempt(ctx, args.channelId);
  },
});

export const internalStartCoexistenceSyncForChannel = internalMutation({
  args: {
    channelId: v.id("channels"),
    attemptId: v.optional(v.id("whatsappConnectionAttempts")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.attemptId !== undefined) {
      const attempt = await ctx.db.get(args.attemptId);
      if (attempt !== null && isOpenWhatsAppConnectionAttempt(attempt)) {
        await ctx.db.patch(args.attemptId, {
          channelId: args.channelId,
          status: "syncing",
          syncStartedAt: attempt.syncStartedAt ?? now,
          updatedAt: now,
        });
      }
    }
  },
});

async function graphFetch<T>(
  url: string,
  init: RequestInit,
  context: string,
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const startedAt = Date.now();
  logWhatsAppConnect("graph-request", { context, method, url });
  const res = await fetch(url, init);
  const text = await res.text();
  let body: unknown;
  try {
    body = text.length ? JSON.parse(text) : {};
  } catch {
    body = text;
  }
  if (!res.ok) {
    const err = (body as GraphError).error;
    const msg = err?.message ?? `HTTP ${res.status}`;
    console.warn(`${LOG_PREFIX}:graphFetch`, context, {
      status: res.status,
      message: msg,
      type: err?.type,
      code: err?.code,
      errorSubcode: err?.error_subcode,
      fbtraceId: err?.fbtrace_id,
      responseBody: body,
    });
    throw new Error(`${context} failed: ${msg}`);
  }
  logWhatsAppConnect("graph-response", {
    context,
    method,
    status: res.status,
    durationMs: Date.now() - startedAt,
    ...(context === "Code exchange"
      ? {
          hasAccessToken: Boolean(
            (body as { access_token?: string }).access_token,
          ),
          tokenType: (body as { token_type?: string }).token_type,
          expiresIn: (body as { expires_in?: number }).expires_in,
        }
      : { responseBody: body }),
  });
  return body as T;
}

type TokenExchangeResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

function selectMetaAppCredentials(args: {
  applicationId?: string;
}): { appId: string; appSecret: string } {
  const appIdEnv = process.env.META_APP_ID;
  const appSecretEnv = process.env.META_APP_SECRET;
  if (!appIdEnv || !appSecretEnv) {
    logWhatsAppConnect("failed", { reason: "missing META_APP_ID / META_APP_SECRET" });
    throw new Error(
      "META_APP_ID / META_APP_SECRET are not configured on the Convex deployment.",
    );
  }

  const appIds = appIdEnv.split("|").map((value) => value.trim());
  const appSecrets = appSecretEnv.split("|").map((value) => value.trim());
  if (
    appIds.length !== appSecrets.length ||
    appIds.some((value) => value.length === 0) ||
    appSecrets.some((value) => value.length === 0)
  ) {
    throw new Error(
      "META_APP_ID and META_APP_SECRET must have matching pipe-separated values.",
    );
  }

  const selectedIndex =
    args.applicationId !== undefined
      ? appIds.indexOf(args.applicationId)
      : 0;
  if (selectedIndex === -1) {
    throw new Error(
      `Could not find application id '${args.applicationId}' in META_APP_ID.`,
    );
  }

  return {
    appId: appIds[selectedIndex],
    appSecret: appSecrets[selectedIndex],
  };
}

async function exchangeAuthorizationCodeForToken(args: {
  appId: string;
  appSecret: string;
  code: string;
}): Promise<TokenExchangeResponse> {
  const url = new URL(`${graphBase()}/oauth/access_token`);
  url.searchParams.set("client_id", args.appId);
  url.searchParams.set("client_secret", args.appSecret);
  url.searchParams.set("code", args.code);

  logWhatsAppConnect("token-exchange-request", {
    method: "GET",
    url: url.toString(),
    hasClientId: true,
    codeLength: args.code.length,
  });

  return await graphFetch<TokenExchangeResponse>(
    url.toString(),
    { method: "GET" },
    "Code exchange",
  );
}

// Stage signup after FB.login + embedded signup FINISH. completeSignup also
// stages the row, so this remains safe for clients that still call it.
export const prepareWhatsAppSignup = action({
  args: {
    wabaId: v.string(),
    phoneNumberId: v.string(),
    attemptId: v.optional(v.id("whatsappConnectionAttempts")),
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const channelOrgId = resolveChannelOrgId(orgId, userId);
    logWhatsAppConnect("prepare-started", {
      wabaId: args.wabaId,
      phoneNumberId: args.phoneNumberId,
      attemptId: args.attemptId,
    });

    if (args.attemptId !== undefined) {
      await ctx.runMutation(
        internal.whatsappEmbeddedSignup.internalUpdateConnectionAttempt,
        {
          attemptId: args.attemptId,
          wabaId: args.wabaId,
          phoneNumberId: args.phoneNumberId,
          status: "signup_finished",
        },
      );
    }

    await ctx.runMutation(internal.channels.internalStartPending, {
      orgId: channelOrgId,
      wabaId: args.wabaId,
      phoneNumberId: args.phoneNumberId,
      connectedByUserId: userId,
      agentId: args.agentId,
    });

    logWhatsAppConnect("prepare-completed", {
      wabaId: args.wabaId,
      phoneNumberId: args.phoneNumberId,
    });
    return { prepared: true as const };
  },
});

// Public action invoked from the frontend after FB.login returns the short-lived
// authorization code and WA_EMBEDDED_SIGNUP returns the WABA + phone IDs.
//
// Steps:
//   1. Exchange the code for a business token (GET /oauth/access_token).
//   2. Subscribe our Meta App to the WABA's webhook events.
//   3. Skip phone-number registration for mobile coexistence.
//   4. Look up display metadata for the number.
//   5. Persist the channel row and start coexistence sync.
export const completeSignup = action({
  args: {
    code: v.string(),
    applicationId: v.optional(v.string()),
    wabaId: v.string(),
    phoneNumberId: v.string(),
    attemptId: v.optional(v.id("whatsappConnectionAttempts")),
    flowType: v.optional(
      v.union(
        v.literal("only_waba"),
        v.literal("new_phone_number"),
        v.literal("existing_phone_number"),
      ),
    ),
    agentId: v.optional(v.id("agents")),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ channelId: Id<"channels">; displayPhoneNumber?: string }> => {
    const startedAt = Date.now();
    const { orgId, userId } = await getAuthContext(ctx);
    const channelOrgId = resolveChannelOrgId(orgId, userId);
    logWhatsAppConnect("started", {
      orgId: channelOrgId,
      userId,
      wabaId: args.wabaId,
      phoneNumberId: args.phoneNumberId,
      flowType: args.flowType ?? "existing_phone_number",
      codeLength: args.code.length,
    });

    try {
      const flowType = args.flowType ?? "existing_phone_number";
      const { appId, appSecret } = selectMetaAppCredentials({
        applicationId: args.applicationId,
      });
      logWhatsAppConnect("env", {
        graphVersion: graphVersion(),
        appId,
        hasAppSecret: Boolean(appSecret),
      });

      if (args.attemptId !== undefined) {
        await ctx.runMutation(
          internal.whatsappEmbeddedSignup.internalUpdateConnectionAttempt,
          {
            attemptId: args.attemptId,
            wabaId: args.wabaId,
            phoneNumberId: args.phoneNumberId,
            status: "signup_finished",
          },
        );
      }

      // 0. Seed a `pending` channel row with progressStep="linking" so the
      //    connecting dialog has something to subscribe to immediately.
      logWhatsAppConnect("step", { progressStep: "linking" });
      await ctx.runMutation(internal.channels.internalStartPending, {
        orgId: channelOrgId,
        wabaId: args.wabaId,
        phoneNumberId: args.phoneNumberId,
        connectedByUserId: userId,
        agentId: args.agentId,
      });

      await ctx.runMutation(internal.channels.internalSetProgress, {
        orgId: channelOrgId,
        service: "whatsapp",
        progressStep: "exchanging",
        phoneNumberId: args.phoneNumberId,
      });

      // 1. Exchange code for access token. Meta's coexistence sample calls
      //    oauth/access_token with client_id, client_secret, and code only.
      logWhatsAppConnect("step", { progressStep: "exchanging" });
      const tokenRes = await exchangeAuthorizationCodeForToken({
        appId,
        appSecret,
        code: args.code,
      });
      const accessToken = tokenRes.access_token;
      const tokenExpiresAt = tokenRes.expires_in
        ? Date.now() + tokenRes.expires_in * 1000
        : undefined;
      logWhatsAppConnect("token-exchange-succeeded", {
        tokenType: tokenRes.token_type,
        expiresIn: tokenRes.expires_in,
        hasAccessToken: Boolean(accessToken),
      });

      if (args.attemptId !== undefined) {
        await ctx.runMutation(
          internal.whatsappEmbeddedSignup.internalUpdateConnectionAttempt,
          { attemptId: args.attemptId, status: "token_ready" },
        );
      }

      await ctx.runMutation(internal.channels.internalSetProgress, {
        orgId: channelOrgId,
        service: "whatsapp",
        progressStep: "subscribing",
        phoneNumberId: args.phoneNumberId,
      });

      // 2. Subscribe our app to the WABA. This is required before Meta will
      //    deliver webhook events for messages sent to this WABA's numbers.
      logWhatsAppConnect("step", { progressStep: "subscribing" });
      await graphFetch(
        `${graphBase()}/${args.wabaId}/subscribed_apps`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
        "WABA subscribe",
      );

      if (flowType === "existing_phone_number") {
        logWhatsAppConnect("coexistence-skip-register", {
          phoneNumberId: args.phoneNumberId,
        });
      } else {
        await ctx.runMutation(internal.channels.internalSetProgress, {
          orgId: channelOrgId,
          service: "whatsapp",
          progressStep: "registering",
          phoneNumberId: args.phoneNumberId,
        });

        const pin = String(Math.floor(100000 + Math.random() * 900000));
        await graphFetch(
          `${graphBase()}/${args.phoneNumberId}/register`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              pin,
            }),
          },
          "Phone number register",
        );
      }

      // 4. Read display metadata so we can show a friendly number in the UI.
      let displayPhoneNumber: string | undefined;
      try {
        logWhatsAppConnect("step", { progressStep: "fetching-display-number" });
        const meta = await graphFetch<{ display_phone_number?: string }>(
          `${graphBase()}/${args.phoneNumberId}?fields=display_phone_number`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
          "Phone number fetch",
        );
        displayPhoneNumber = meta.display_phone_number;
        logWhatsAppConnect("display-number-fetched", { displayPhoneNumber });
      } catch (err) {
        console.warn(`${LOG_PREFIX}:completeSignup`, "display number fetch failed", err);
      }

      // 5. Persist.
      logWhatsAppConnect("step", { progressStep: "persisting-channel" });
      const channelId: Id<"channels"> = await ctx.runMutation(
        internal.channels.internalUpsertWhatsApp,
        {
          orgId: channelOrgId,
          wabaId: args.wabaId,
          phoneNumberId: args.phoneNumberId,
          displayPhoneNumber,
          accessToken,
          tokenExpiresAt,
          connectedByUserId: userId,
          agentId: args.agentId,
        },
      );
      if (args.attemptId !== undefined) {
        await ctx.runMutation(
          internal.whatsappEmbeddedSignup.internalUpdateConnectionAttempt,
          {
            attemptId: args.attemptId,
            channelId,
            status: "token_ready",
          },
        );
      }

      if (flowType === "existing_phone_number") {
        if (args.attemptId !== undefined) {
          await ctx.runMutation(
            internal.whatsappEmbeddedSignup.internalStartCoexistenceSyncForChannel,
            { channelId, attemptId: args.attemptId },
          );
        }
        await whatsappSyncPool.enqueueAction(
          ctx,
          internal.whatsappSync.initiateCoexistenceSync,
          { channelId },
        );
      }

      logWhatsAppConnect("completed", {
        channelId,
        displayPhoneNumber,
        durationMs: Date.now() - startedAt,
      });
      return { channelId, displayPhoneNumber };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logWhatsAppConnect("failed", {
        error: message,
        wabaId: args.wabaId,
        phoneNumberId: args.phoneNumberId,
        durationMs: Date.now() - startedAt,
      });
      await ctx.runMutation(internal.channels.internalRecordError, {
        orgId: channelOrgId,
        service: "whatsapp",
        error: message,
        connectedByUserId: userId,
        phoneNumberId: args.phoneNumberId,
      });
      if (args.attemptId !== undefined) {
        await ctx.runMutation(
          internal.whatsappEmbeddedSignup.internalUpdateConnectionAttempt,
          {
            attemptId: args.attemptId,
            wabaId: args.wabaId,
            phoneNumberId: args.phoneNumberId,
            status: "error",
            lastError: message,
          },
        );
      }
      throw err;
    }
  },
});

export const internalGetAttempt = internalQuery({
  args: {
    attemptId: v.id("whatsappConnectionAttempts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.attemptId);
  },
});
