import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getAuthContext, resolveChannelOrgId } from "./authUtils";
import { instagramSyncPool } from "./channelSyncPools";
import { exchangeCodeForUserToken } from "./messengerConnect";

type InstagramAccount = {
  id: string;
  username?: string;
};

type PageWithInstagram = {
  id: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: InstagramAccount;
};

type GraphErrorBody = {
  error?: { message?: string };
};

function graphBase() {
  const version = process.env.META_GRAPH_API_VERSION || "v25.0";
  return `https://graph.facebook.com/${version}`;
}

async function graphFetch<T>(url: string, init: RequestInit, context: string) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({})) as T & GraphErrorBody;
  if (!response.ok) {
    throw new Error(`${context} failed: ${body.error?.message ?? `HTTP ${response.status}`}`);
  }
  return body;
}

export async function listInstagramAccounts(userAccessToken: string) {
  const url = new URL(`${graphBase()}/me/accounts`);
  url.searchParams.set(
    "fields",
    "id,name,access_token,instagram_business_account{id,username}",
  );
  url.searchParams.set("access_token", userAccessToken);
  const result = await graphFetch<{ data?: PageWithInstagram[] }>(
    url.toString(),
    { method: "GET" },
    "Instagram account list",
  );
  return (result.data ?? []).filter(
    (page): page is PageWithInstagram & {
      access_token: string;
      instagram_business_account: InstagramAccount;
    } => Boolean(page.access_token && page.instagram_business_account?.id),
  );
}

async function subscribeInstagramPage(page: PageWithInstagram & { access_token: string }) {
  const url = new URL(`${graphBase()}/${page.id}/subscribed_apps`);
  url.searchParams.set("subscribed_fields", "messages,comments");
  await graphFetch(
    url.toString(),
    {
      method: "POST",
      headers: { Authorization: `Bearer ${page.access_token}` },
    },
    "Instagram webhook subscription",
  );
}

export const completeSignup = action({
  args: {
    code: v.string(),
    redirectUri: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ channelId: Id<"channels">; displayUsername?: string }> => {
    const { orgId, userId } = await getAuthContext(ctx);
    const channelOrgId = resolveChannelOrgId(orgId, userId);
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error(
        "META_APP_ID / META_APP_SECRET are not configured on the Convex deployment.",
      );
    }

    let igUserId: string | undefined;
    let instagramPageId: string | undefined;
    try {
      const userAccessToken = await exchangeCodeForUserToken(
        args.code,
        appId,
        appSecret,
        args.redirectUri,
      );
      const accounts = await listInstagramAccounts(userAccessToken);
      if (accounts.length === 0) {
        throw new Error(
          "No Instagram professional account linked to an authorized Facebook Page was returned.",
        );
      }
      if (accounts.length > 1) {
        throw new Error(
          "Authorize exactly one Instagram professional account in the Instagram configuration.",
        );
      }

      const page = accounts[0];
      igUserId = page.instagram_business_account.id;
      instagramPageId = page.id;
      const displayUsername =
        page.instagram_business_account.username ?? page.name;

      await ctx.runMutation(internal.channels.internalStartInstagramPending, {
        orgId: channelOrgId,
        connectedByUserId: userId,
        igUserId,
      });
      await ctx.runMutation(internal.channels.internalSetProgress, {
        orgId: channelOrgId,
        service: "instagram",
        progressStep: "subscribing",
        igUserId,
      });
      await subscribeInstagramPage(page);
      await ctx.runMutation(internal.channels.internalSetProgress, {
        orgId: channelOrgId,
        service: "instagram",
        progressStep: "backfilling",
        igUserId,
      });

      const channelId: Id<"channels"> = await ctx.runMutation(
        internal.channels.internalUpsertInstagram,
        {
          orgId: channelOrgId,
          igUserId,
          instagramPageId,
          displayUsername,
          accessToken: page.access_token,
          connectedByUserId: userId,
        },
      );
      await instagramSyncPool.enqueueAction(
        ctx,
        internal.instagramSync.backfillConversations,
        { channelId, limit: 10 },
      );
      return { channelId, displayUsername };
    } catch (error) {
      await ctx.runMutation(internal.channels.internalRecordError, {
        orgId: channelOrgId,
        service: "instagram",
        error: error instanceof Error ? error.message : String(error),
        connectedByUserId: userId,
        igUserId,
      });
      throw error;
    }
  },
});
