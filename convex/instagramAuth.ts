import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthContext, resolveChannelOrgId } from "./authUtils";
import {
  encodeOAuthState,
  generateCsrfToken,
  sanitizeReturnPath,
} from "./oauthShared";

const INSTAGRAM_AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";

const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
  "instagram_business_content_publish",
  "instagram_business_manage_insights",
].join(",");

// The "Auth Route" from the spec, adapted to this stack:
//   - Authenticated via WorkOS/Convex auth (so we know orgId + userId).
//   - Accepts a `returnPath` (e.g. /dashboard/<agentId>/channels) that the
//     callback will 302-redirect to after a successful token exchange.
//   - Encodes { csrf, returnPath } as the OAuth `state` parameter and
//     persists a one-time oauthSessions row keyed by `csrf`. The callback
//     looks up that row to recover the original orgId/userId/returnPath —
//     tampering with `state` to change orgs simply means no session is
//     found and the callback rejects.
//   - Returns the fully-formed Instagram authorize URL so the SPA can
//     `window.location.assign` to it.
//
// The Instagram `redirect_uri` is the STATIC callback registered in the Meta
// App dashboard: `${CONVEX_SITE_URL}/auth/instagram/callback`. The dynamic
// per-flow destination travels inside `state.returnPath`.
export const start = action({
  args: {
    returnPath: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ authorizeUrl: string }> => {
    const { orgId, userId } = await getAuthContext(ctx);
    const channelOrgId = resolveChannelOrgId(orgId, userId);

    const appId = process.env.META_IG_APP_ID;
    if (!appId) {
      throw new Error(
        "INSTAGRAM_APP_ID is not configured on the Convex deployment.",
      );
    }

    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!siteUrl) {
      throw new Error("CONVEX_SITE_URL is not set");
    }
    const redirectUri = `${siteUrl}/auth/instagram/callback`;

    const returnPath = sanitizeReturnPath(args.returnPath);
    const csrf = generateCsrfToken();

    await ctx.runMutation(internal.oauthSessions.internalCreate, {
      csrf,
      service: "instagram",
      orgId: channelOrgId,
      userId,
      returnPath,
    });

    const state = encodeOAuthState({ csrf, returnPath });

    
    const url = new URL(INSTAGRAM_AUTHORIZE_URL);
    url.searchParams.set("force_reauth", "true");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", INSTAGRAM_SCOPES);
    url.searchParams.set("state", state);

    return { authorizeUrl: url.toString() };
  },
});
