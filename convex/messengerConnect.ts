import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthContext, resolveChannelOrgId } from "./authUtils";
import { messengerSyncPool } from "./channelSyncPools";

const DEFAULT_GRAPH_VERSION = "v25.0";

function graphVersion() {
  return process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
}

function fbGraphBase() {
  return `https://graph.facebook.com/${graphVersion()}`;
}

/** Canonical redirect for classic OAuth + token exchange (must match Meta app settings). */
export function messengerOAuthRedirectUri(): string {
  const siteUrl = process.env.CONVEX_SITE_URL;
  if (!siteUrl) {
    throw new Error("CONVEX_SITE_URL is not set");
  }
  return siteUrl.replace(/\/+$/, "") + "/auth/messenger/callback";
}

type GraphErrorBody = { error?: { message?: string } };

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
    const msg =
      err?.message != null ? err.message : "HTTP " + String(res.status);
    throw new Error(context + " failed: " + msg);
  }
  return body as T;
}

type PageEdge = {
  id: string;
  name?: string;
  access_token?: string;
};

export async function exchangeCodeForUserToken(
  code: string,
  appId: string,
  appSecret: string,
  redirectUri?: string,
): Promise<string> {
  const tokenUrl = new URL(`${fbGraphBase()}${"/oauth/access_token"}`);
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("code", code);
  if (redirectUri != null && redirectUri.length > 0) {
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
  }
  const res = await graphFetch<{ access_token: string; expires_in?: number }>(
    tokenUrl.toString(),
    { method: "GET" },
    "Facebook code exchange",
  );
  return res.access_token;
}

async function listUserPages(userAccessToken: string): Promise<PageEdge[]> {
  const url = new URL(`${fbGraphBase()}${"/me/accounts"}`);
  url.searchParams.set("fields", "id,name,access_token");
  url.searchParams.set("access_token", userAccessToken);
  const res = await graphFetch<{ data?: PageEdge[] }>(
    url.toString(),
    { method: "GET" },
    "Facebook page list",
  );
  return res.data ?? [];
}

/** Public helper for messengerAuth.getPickerPages — re-fetches /me/accounts. */
export async function listPagesForUserToken(
  userAccessToken: string,
): Promise<PageEdge[]> {
  return listUserPages(userAccessToken);
}

async function fetchFbUserId(
  userAccessToken: string,
): Promise<string | undefined> {
  try {
    const url = new URL(`${fbGraphBase()}${"/me"}`);
    url.searchParams.set("fields", "id");
    url.searchParams.set("access_token", userAccessToken);
    const res = await graphFetch<{ id?: string }>(
      url.toString(),
      { method: "GET" },
      "Facebook user id fetch",
    );
    return res.id;
  } catch (err) {
    console.warn("Failed to fetch Facebook user id", err);
    return undefined;
  }
}

async function subscribePage(page: PageEdge): Promise<void> {
  if (!page.access_token) {
    throw new Error(
      "Selected Page is unavailable or did not return an access token.",
    );
  }
  const subscribeUrl = new URL(
    fbGraphBase() + "/" + page.id + "/subscribed_apps",
  );
  subscribeUrl.searchParams.set(
    "subscribed_fields",
    "messages,messaging_postbacks",
  );
  await graphFetch(
    subscribeUrl.toString(),
    {
      method: "POST",
      headers: { Authorization: "Bearer " + page.access_token },
    },
    "Messenger page subscribe",
  );
}

/** Shared core after we hold a user access token (popup or OAuth redirect). */
async function completeMessengerFromUserAccessToken(
  ctx: ActionCtx,
  args: {
    orgId: string;
    userId: string;
    userAccessToken: string;
    pageId?: string;
  },
): Promise<
  | { channelId: Id<"channels">; displayUsername?: string }
  | { needsPagePicker: true; pages: Array<{ id: string; name?: string }> }
> {
  const { orgId, userId, userAccessToken } = args;
  const pages = await listUserPages(userAccessToken);
  if (pages.length === 0) {
    throw new Error(
      "No Facebook Pages were returned. Make sure the connecting account manages at least one Page.",
    );
  }

  if (!args.pageId && pages.length > 1) {
    return {
      needsPagePicker: true,
      pages: pages.map((p) => ({ id: p.id, name: p.name })),
    };
  }

  const selected = args.pageId
    ? pages.find((p) => p.id === args.pageId)
    : pages[0];
  if (!selected || !selected.access_token) {
    throw new Error(
      "Selected Page is unavailable or did not return an access token.",
    );
  }

  await ctx.runMutation(internal.channels.internalSetProgress, {
    orgId,
    service: "messenger",
    progressStep: "subscribing",
  });

  await subscribePage(selected);

  await ctx.runMutation(internal.channels.internalSetProgress, {
    orgId,
    service: "messenger",
    progressStep: "backfilling",
  });

  const fbUserId = await fetchFbUserId(userAccessToken);

  const channelId: Id<"channels"> = await ctx.runMutation(
    internal.channels.internalUpsertMessenger,
    {
      orgId,
      pageId: selected.id,
      fbUserId,
      displayUsername: selected.name,
      accessToken: selected.access_token,
      connectedByUserId: userId,
    },
  );

  await messengerSyncPool.enqueueAction(
    ctx,
    internal.messengerSync.backfillConversations,
    { channelId, limit: 10 },
  );

  return { channelId, displayUsername: selected.name };
}

export const listPages = action({
  args: {
    code: v.string(),
    redirectUri: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ pages: Array<{ id: string; name?: string }> }> => {
    await getAuthContext(ctx);
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error(
        "META_APP_ID / META_APP_SECRET are not configured on the Convex deployment.",
      );
    }
    const userToken = await exchangeCodeForUserToken(
      args.code,
      appId,
      appSecret,
      args.redirectUri,
    );
    const pages = await listUserPages(userToken);
    return { pages: pages.map((p) => ({ id: p.id, name: p.name })) };
  },
});

/**
 * FB.login popup path: `redirectUri` is the SPA origin (e.g. https://app...).
 * OAuth redirect path: use `messengerOAuthRedirectUri()` for BOTH authorize
 * URL and this action — must match byte-for-byte.
 */
export const completeSignup = action({
  args: {
    code: v.string(),
    /** Classic `dialog/oauth`; omit for Facebook Login for Business Embedded Signup (`config_id`). */
    redirectUri: v.optional(v.string()),
    pageId: v.optional(v.string()),
    /** Stored on the OAuth hold row when `needsPagePicker` (for finalizePick). */
    returnPath: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    | { channelId: Id<"channels">; displayUsername?: string }
    | {
        needsPagePicker: true;
        pages: Array<{ id: string; name?: string }>;
        sessionId: Id<"oauthSessions">;
      }
  > => {
    const { orgId, userId } = await getAuthContext(ctx);
    const channelOrgId = resolveChannelOrgId(orgId, userId);

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error(
        "META_APP_ID / META_APP_SECRET are not configured on the Convex deployment.",
      );
    }

    try {
      await ctx.runMutation(internal.channels.internalStartMessengerPending, {
        orgId: channelOrgId,
        connectedByUserId: userId,
      });

      const userToken = await exchangeCodeForUserToken(
        args.code,
        appId,
        appSecret,
        args.redirectUri,
      );

      const result = await completeMessengerFromUserAccessToken(ctx, {
        orgId: channelOrgId,
        userId,
        userAccessToken: userToken,
        pageId: args.pageId,
      });

      if ("needsPagePicker" in result) {
        const sessionId = await ctx.runMutation(
          internal.oauthSessions.internalCreateMessengerPickerHold,
          {
            orgId: channelOrgId,
            userId,
            userAccessToken: userToken,
            returnPath: args.returnPath,
          },
        );
        return {
          needsPagePicker: true,
          pages: result.pages,
          sessionId,
        };
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.channels.internalRecordError, {
        orgId: channelOrgId,
        service: "messenger",
        error: message,
        connectedByUserId: userId,
      });
      throw err;
    }
  },
});

/** HTTP `/auth/messenger/callback`: exchange code with the SAME redirect_uri as authorize. */
export const internalOAuthCallback = internalAction({
  args: {
    code: v.string(),
    redirectUri: v.string(),
    orgId: v.string(),
    userId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    | {
        kind: "connected";
        channelId: Id<"channels">;
        displayUsername?: string;
      }
    | {
        kind: "needsPicker";
        userAccessToken: string;
        pages: Array<{ id: string; name?: string }>;
      }
  > => {
    const { orgId, userId } = args;
    if (!orgId) {
      throw new Error("Missing channel scope for Messenger connect.");
    }
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error(
        "META_APP_ID / META_APP_SECRET are not configured on the Convex deployment.",
      );
    }

    try {
      await ctx.runMutation(internal.channels.internalStartMessengerPending, {
        orgId,
        connectedByUserId: userId,
      });

      const userToken = await exchangeCodeForUserToken(
        args.code,
        appId,
        appSecret,
        args.redirectUri,
      );

      const result = await completeMessengerFromUserAccessToken(ctx, {
        orgId,
        userId,
        userAccessToken: userToken,
      });

      if ("needsPagePicker" in result) {
        return {
          kind: "needsPicker",
          userAccessToken: userToken,
          pages: result.pages,
        };
      }
      return {
        kind: "connected",
        channelId: result.channelId,
        displayUsername: result.displayUsername,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.channels.internalRecordError, {
        orgId,
        service: "messenger",
        error: message,
        connectedByUserId: userId,
      });
      throw err;
    }
  },
});

export const internalFinalizeMessengerPagePick = internalAction({
  args: {
    orgId: v.string(),
    userId: v.string(),
    pageId: v.string(),
    userAccessToken: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ channelId: Id<"channels">; displayUsername?: string }> => {
    try {
      await ctx.runMutation(internal.channels.internalStartMessengerPending, {
        orgId: args.orgId,
        connectedByUserId: args.userId,
      });
      const result = await completeMessengerFromUserAccessToken(ctx, {
        orgId: args.orgId,
        userId: args.userId,
        userAccessToken: args.userAccessToken,
        pageId: args.pageId,
      });
      if ("needsPagePicker" in result) {
        throw new Error("Page selection did not complete the connection.");
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.channels.internalRecordError, {
        orgId: args.orgId,
        service: "messenger",
        error: message,
        connectedByUserId: args.userId,
      });
      throw err;
    }
  },
});
