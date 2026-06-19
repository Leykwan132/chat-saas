import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getAuthContext, resolveChannelOrgId } from "./authUtils";

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

type GraphError = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

async function graphFetch<T>(
  url: string,
  init: RequestInit,
  context: string,
): Promise<T> {
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
    });
    throw new Error(`${context} failed: ${msg}`);
  }
  return body as T;
}

// Public action invoked from the frontend after the FB.login modal returns
// with a one-time code plus the WABA + phone number ids selected by the user.
//
// Steps:
//   1. Exchange the code for a long-lived business token tied to the WABA.
//   2. Subscribe our Meta App to the WABA's webhook events.
//   3. Register the Cloud API phone number (this is what enables Cloud-API
//      hosted messaging — without it sends will 400).
//   4. Look up display metadata for the number (so the UI can show +60 11 ...).
//   5. Persist the channel row.
export const completeSignup = action({
  args: {
    code: v.string(),
    wabaId: v.string(),
    phoneNumberId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ channelId: Id<"channels">; displayPhoneNumber?: string }> => {
    const { orgId, userId } = await getAuthContext(ctx);
    const channelOrgId = resolveChannelOrgId(orgId, userId);
    logWhatsAppConnect("started", {
      orgId: channelOrgId,
      userId,
      wabaId: args.wabaId,
      phoneNumberId: args.phoneNumberId,
      codeLength: args.code.length,
    });

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error(
        "META_APP_ID / META_APP_SECRET are not configured on the Convex deployment.",
      );
    }

    try {
      // 0. Seed a `pending` channel row with progressStep="linking" so the
      //    connecting dialog has something to subscribe to immediately.
      logWhatsAppConnect("step", { progressStep: "linking" });
      await ctx.runMutation(internal.channels.internalStartPending, {
        orgId: channelOrgId,
        wabaId: args.wabaId,
        phoneNumberId: args.phoneNumberId,
        connectedByUserId: userId,
      });

      // 1. Exchange code for access token. Embedded Signup returns a token
      //    already scoped to the selected WABA; no redirect_uri is needed
      //    when the token type is `code` from the embedded flow.
      logWhatsAppConnect("step", { progressStep: "exchanging-token" });
      const tokenUrl = new URL(`${graphBase()}/oauth/access_token`);
      tokenUrl.searchParams.set("client_id", appId);
      tokenUrl.searchParams.set("client_secret", appSecret);
      tokenUrl.searchParams.set("code", args.code);
      const tokenRes = await graphFetch<{
        access_token: string;
        token_type?: string;
        expires_in?: number;
      }>(tokenUrl.toString(), { method: "GET" }, "Code exchange");
      const accessToken = tokenRes.access_token;
      const tokenExpiresAt = tokenRes.expires_in
        ? Date.now() + tokenRes.expires_in * 1000
        : undefined;
      logWhatsAppConnect("token-exchange-succeeded", {
        tokenType: tokenRes.token_type,
        expiresIn: tokenRes.expires_in,
        hasAccessToken: Boolean(accessToken),
      });

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

      await ctx.runMutation(internal.channels.internalSetProgress, {
        orgId: channelOrgId,
        service: "whatsapp",
        progressStep: "registering",
        phoneNumberId: args.phoneNumberId,
      });

      // 3. Register the phone number with Cloud API. PIN can be anything
      //    when the number was migrated via Embedded Signup; we generate one.
      logWhatsAppConnect("step", { progressStep: "registering" });
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
        },
      );

      logWhatsAppConnect("completed", {
        channelId,
        displayPhoneNumber,
      });
      return { channelId, displayPhoneNumber };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logWhatsAppConnect("failed", {
        error: message,
        wabaId: args.wabaId,
        phoneNumberId: args.phoneNumberId,
      });
      await ctx.runMutation(internal.channels.internalRecordError, {
        orgId: channelOrgId,
        service: "whatsapp",
        error: message,
        connectedByUserId: userId,
        phoneNumberId: args.phoneNumberId,
      });
      throw err;
    }
  },
});
