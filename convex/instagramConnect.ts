import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { instagramSyncPool } from "./channelSyncPools";

const DEFAULT_GRAPH_VERSION = "v25.0";

function graphVersion() {
  return process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
}

function instagramGraphBase() {
  return `https://graph.instagram.com/${graphVersion()}`;
}

type GraphErrorBody = {
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
    const err = (body as GraphErrorBody).error;
    const msg = err?.message ?? `HTTP ${res.status}`;
    throw new Error(`${context} failed: ${msg}`);
  }
  return body as T;
}

// Internal action invoked from the static HTTP callback at
// /auth/instagram/callback. The callback decodes `state`, looks up the
// matching oauthSessions row (which carries the authenticated orgId/userId
// that initiated the flow), then calls this with explicit identity args.
//
// We do NOT expose a public action equivalent: a logged-in attacker could
// otherwise call it directly with a stolen `code` and connect Instagram
// against their own org. The `oauthSessions` row is the single bridge
// between authenticated state and the un-authenticated HTTP callback.
//
// Steps:
//   1. Seed a pending channel row so the UI dialog can subscribe to progress.
//   2. POST api.instagram.com/oauth/access_token (form data) → short-lived token
//      + IG-scoped user id + granted permissions.
//   3. GET graph.instagram.com/access_token?grant_type=ig_exchange_token →
//      long-lived token (60 days).
//   4. GET graph.instagram.com/{version}/me?fields=id,username → IG handle.
//   5. Persist the channel row, then enqueue a one-time backfill of the
//      latest 10 conversations on the dedicated workpool.
export const internalCompleteSignup = internalAction({
  args: {
    code: v.string(),
    redirectUri: v.string(),
    orgId: v.string(),
    userId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ channelId: Id<"channels">; displayUsername?: string }> => {
    const { orgId, userId } = args;
    if (!orgId) {
      throw new Error("Missing channel scope for Instagram connect.");
    }

    const appId = process.env.META_IG_APP_ID;
    const appSecret = process.env.META_IG_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error(
        "INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET are not configured on the Convex deployment.",
      );
    }

    try {
      await ctx.runMutation(internal.channels.internalStartInstagramPending, {
        orgId,
        connectedByUserId: userId,
      });

      // 1. Short-lived token. The Instagram Graph endpoint expects
      //    application/x-www-form-urlencoded; the docs show form fields.
      const tokenForm = new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: args.redirectUri,
        code: args.code,
      });
      // Per Meta docs, the short-lived response can come back in two shapes:
      //   - flat: { access_token, user_id, permissions }
      //   - wrapped: { data: [{ access_token, user_id, permissions }] }
      const shortRaw = await graphFetch<{
        access_token?: string;
        user_id?: string | number;
        permissions?: string | string[];
        data?: Array<{
          access_token?: string;
          user_id?: string | number;
          permissions?: string | string[];
        }>;
      }>(
        "https://api.instagram.com/oauth/access_token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: tokenForm.toString(),
        },
        "Instagram code exchange",
      );
      const shortPick = shortRaw.data?.[0] ?? shortRaw;
      const shortToken = shortPick.access_token;
      const igUserId =
        shortPick.user_id !== undefined ? String(shortPick.user_id) : undefined;
      if (!shortToken || !igUserId) {
        throw new Error(
          "Instagram code exchange returned no access_token or user_id",
        );
      }

      await ctx.runMutation(internal.channels.internalSetProgress, {
        orgId,
        service: "instagram",
        progressStep: "subscribing",
      });

      // 2. Long-lived token (60 days). NOTE: long-lived exchange does NOT use
      //    a graph version segment in the path on graph.instagram.com.
      const longUrl = new URL(`https://graph.instagram.com/access_token`);
      longUrl.searchParams.set("grant_type", "ig_exchange_token");
      longUrl.searchParams.set("client_secret", appSecret);
      longUrl.searchParams.set("access_token", shortToken);
      const longRes = await graphFetch<{
        access_token: string;
        token_type?: string;
        expires_in?: number;
      }>(longUrl.toString(), { method: "GET" }, "Instagram long-lived exchange");
      const longToken = longRes.access_token;
      const tokenExpiresAt = longRes.expires_in
        ? Date.now() + longRes.expires_in * 1000
        : undefined;

      // 3. Profile metadata for the UI. Best-effort; failure here should not
      //    block the connection.
      let displayUsername: string | undefined;
      try {
        const me = await graphFetch<{ id?: string; username?: string }>(
          `${instagramGraphBase()}/me?fields=id,username&access_token=${encodeURIComponent(longToken)}`,
          { method: "GET" },
          "Instagram profile fetch",
        );
        displayUsername = me.username;
      } catch (err) {
        console.warn("Failed to fetch Instagram profile", err);
      }

      await ctx.runMutation(internal.channels.internalSetProgress, {
        orgId,
        service: "instagram",
        progressStep: "backfilling",
      });

      // 4. Persist as connected.
      const channelId: Id<"channels"> = await ctx.runMutation(
        internal.channels.internalUpsertInstagram,
        {
          orgId,
          igUserId,
          displayUsername,
          accessToken: longToken,
          tokenExpiresAt,
          connectedByUserId: userId,
        },
      );

      // 5. Fire-and-forget backfill on the dedicated pool. Errors here are
      //    logged inside the worker so the connect flow stays green.
      await instagramSyncPool.enqueueAction(
        ctx,
        internal.instagramSync.backfillConversations,
        { channelId, limit: 10 },
      );

      return { channelId, displayUsername };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.channels.internalRecordError, {
        orgId,
        service: "instagram",
        error: message,
        connectedByUserId: userId,
      });
      throw err;
    }
  },
});

// Refresh a single Instagram channel's long-lived token. Long-lived tokens
// can be refreshed any time after they are 24 hours old and before they
// expire, extending the validity by another 60 days.
export const refreshToken = internalAction({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const channel: Doc<"channels"> | null = await ctx.runQuery(
      internal.channels.internalGetChannel,
      { channelId: args.channelId },
    );
    if (channel === null || channel.service !== "instagram") return;
    if (!channel.accessToken) return;

    try {
      const refreshUrl = new URL(
        "https://graph.instagram.com/refresh_access_token",
      );
      refreshUrl.searchParams.set("grant_type", "ig_refresh_token");
      refreshUrl.searchParams.set("access_token", channel.accessToken);
      const refreshed = await graphFetch<{
        access_token: string;
        token_type?: string;
        expires_in?: number;
      }>(refreshUrl.toString(), { method: "GET" }, "Instagram token refresh");
      await ctx.runMutation(internal.channels.internalUpdateInstagramToken, {
        channelId: args.channelId,
        accessToken: refreshed.access_token,
        tokenExpiresAt: refreshed.expires_in
          ? Date.now() + refreshed.expires_in * 1000
          : undefined,
      });
    } catch (err) {
      console.error(
        `Failed to refresh Instagram token for channel ${args.channelId}`,
        err,
      );
    }
  },
});

// Cron entry point. Refreshes every Instagram token expiring within 7 days.
// Each per-channel call is its own action so a single failure does not bring
// the rest of the batch down.
export const refreshExpiringTokens = internalAction({
  args: {},
  handler: async (ctx) => {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const expiring: Array<Doc<"channels">> = await ctx.runQuery(
      internal.channels.internalGetExpiringInstagramTokens,
      { withinMs: SEVEN_DAYS_MS },
    );
    for (const channel of expiring) {
      await ctx.runAction(internal.instagramConnect.refreshToken, {
        channelId: channel._id,
      });
    }
  },
});
