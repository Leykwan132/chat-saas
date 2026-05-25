import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getAuthContext, resolveChannelOrgId } from "./authUtils";
import {
  encodeOAuthState,
  generateCsrfToken,
  sanitizeReturnPath,
} from "./oauthShared";
import { listPagesForUserToken, messengerOAuthRedirectUri } from "./messengerConnect";

const DEFAULT_FB_OAUTH_VERSION = "v25.0";

function fbOAuthDialogVersion() {
  return process.env.META_GRAPH_API_VERSION || DEFAULT_FB_OAUTH_VERSION;
}

// OAuth helpers for Messenger. The in-app connect button uses Embedded
// Signup (`messengerConnect.completeSignup` + `FB.login`). `start` remains
// for classic `dialog/oauth` → `/auth/messenger/callback` if needed.
const MESSENGER_OAUTH_SCOPES = "pages_messaging,pages_show_list";

/**
 * Builds https://www.facebook.com/v25.0/dialog/oauth?client_id=...&redirect_uri=...&state=...&response_type=code&scope=pages_messaging,pages_show_list
 * `redirect_uri` is always `messengerOAuthRedirectUri()` — the same value used in `exchangeCodeForUserToken`.
 */
export const start = action({
  args: {
    returnPath: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ authorizeUrl: string }> => {
    const { orgId, userId } = await getAuthContext(ctx);
    const channelOrgId = resolveChannelOrgId(orgId, userId);

    const appId = process.env.META_APP_ID;
    if (!appId) {
      throw new Error(
        "META_APP_ID is not configured on the Convex deployment.",
      );
    }

    const redirectUri = messengerOAuthRedirectUri();
    const returnPath = sanitizeReturnPath(args.returnPath);
    const csrf = generateCsrfToken();

    await ctx.runMutation(internal.oauthSessions.internalCreate, {
      csrf,
      service: "messenger",
      orgId: channelOrgId,
      userId,
      returnPath,
    });

    const state = encodeOAuthState({ csrf, returnPath });

    const url = new URL(
      `https://www.facebook.com/${fbOAuthDialogVersion()}/dialog/oauth`,
    );
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", MESSENGER_OAUTH_SCOPES);

    return { authorizeUrl: url.toString() };
  },
});

export const getPickerPages = action({
  args: { sessionId: v.id("oauthSessions") },
  handler: async (
    ctx,
    args,
  ): Promise<{ pages: Array<{ id: string; name?: string }> }> => {
    const { orgId, userId } = await getAuthContext(ctx);
    const channelOrgId = resolveChannelOrgId(orgId, userId);
    const session = await ctx.runQuery(internal.oauthSessions.internalGetById, {
      sessionId: args.sessionId,
    });
    if (
      session === null ||
      session.service !== "messenger" ||
      session.orgId !== channelOrgId ||
      session.userId !== userId ||
      session.consumed ||
      session.expiresAt < Date.now() ||
      !session.pendingUserAccessToken
    ) {
      throw new Error("OAuth session is invalid or expired. Please reconnect.");
    }
    const pages = await listPagesForUserToken(session.pendingUserAccessToken);
    return { pages: pages.map((p) => ({ id: p.id, name: p.name })) };
  },
});

export const finalizePick = action({
  args: {
    sessionId: v.id("oauthSessions"),
    pageId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ channelId: Id<"channels">; displayUsername?: string }> => {
    const { orgId, userId } = await getAuthContext(ctx);
    const channelOrgId = resolveChannelOrgId(orgId, userId);
    const session = await ctx.runQuery(internal.oauthSessions.internalGetById, {
      sessionId: args.sessionId,
    });
    if (
      session === null ||
      session.service !== "messenger" ||
      session.orgId !== channelOrgId ||
      session.userId !== userId ||
      session.consumed ||
      session.expiresAt < Date.now() ||
      !session.pendingUserAccessToken
    ) {
      throw new Error("OAuth session is invalid or expired. Please reconnect.");
    }

    const result = await ctx.runAction(
      internal.messengerConnect.internalFinalizeMessengerPagePick,
      {
        orgId: channelOrgId,
        userId,
        pageId: args.pageId,
        userAccessToken: session.pendingUserAccessToken,
      },
    );

    await ctx.runMutation(internal.oauthSessions.internalMarkConsumedById, {
      sessionId: args.sessionId,
    });

    return result;
  },
});
