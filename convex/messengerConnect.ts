import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getAuthContext } from "./authUtils";
import { messengerSyncPool } from "./channelSyncPools";

const DEFAULT_GRAPH_VERSION = "v25.0";

function graphVersion() {
  return process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
}

function fbGraphBase() {
  return `https://graph.facebook.com/${graphVersion()}`;
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
    const msg = err?.message ?? `HTTP ${res.status}`;
    throw new Error(`${context} failed: ${msg}`);
  }
  return body as T;
}

type PageEdge = {
  id: string;
  name?: string;
  access_token?: string;
};

async function exchangeCodeForUserToken(
  code: string,
  redirectUri: string,
  appId: string,
  appSecret: string,
): Promise<string> {
  const tokenUrl = new URL(`${fbGraphBase()}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);
  const res = await graphFetch<{ access_token: string; expires_in?: number }>(
    tokenUrl.toString(),
    { method: "GET" },
    "Facebook code exchange",
  );
  return res.access_token;
}

async function listUserPages(userAccessToken: string): Promise<PageEdge[]> {
  const url = new URL(`${fbGraphBase()}/me/accounts`);
  url.searchParams.set("fields", "id,name,access_token");
  url.searchParams.set("access_token", userAccessToken);
  const res = await graphFetch<{ data?: PageEdge[] }>(
    url.toString(),
    { method: "GET" },
    "Facebook page list",
  );
  return res.data ?? [];
}

// Helper for the picker UI: returns the Pages the connecting user owns
// without persisting anything. The same `code` can then be passed back into
// `completeSignup` with the selected `pageId`.
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
      args.redirectUri,
      appId,
      appSecret,
    );
    const pages = await listUserPages(userToken);
    return { pages: pages.map((p) => ({ id: p.id, name: p.name })) };
  },
});

// Public action invoked from the Messenger connect button after FB.login
// returns an auth code via SDK callback.
//
// Steps:
//   1. Seed a pending channel row so the UI can subscribe to progressStep.
//   2. Exchange code → short-lived user access token.
//   3. GET /me/accounts to enumerate Pages owned by the user.
//   4. If multiple Pages and no `pageId` arg, return them so the UI can
//      render a picker. Otherwise auto-select the only Page.
//   5. Subscribe the chosen Page to the `messages` + `messaging_postbacks`
//      webhook fields.
//   6. Persist as connected, then enqueue a one-time backfill of the latest
//      10 conversations.
export const completeSignup = action({
  args: {
    code: v.string(),
    redirectUri: v.string(),
    pageId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    | { channelId: Id<"channels">; displayUsername?: string }
    | { needsPagePicker: true; pages: Array<{ id: string; name?: string }> }
  > => {
    const { orgId, userId } = await getAuthContext(ctx);
    if (orgId === "personal" || !orgId) {
      throw new Error(
        "You must belong to an organization before connecting Messenger.",
      );
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
        args.redirectUri,
        appId,
        appSecret,
      );

      const pages = await listUserPages(userToken);
      if (pages.length === 0) {
        throw new Error(
          "No Facebook Pages were returned. Make sure the connecting account manages at least one Page.",
        );
      }

      // Picker path — if the user owns multiple pages we surface them and
      // let the UI call us back with a chosen pageId. We intentionally do
      // not persist anything yet so a cancelled picker leaves no state.
      if (!args.pageId && pages.length > 1) {
        // Reset the pending row so the user is not stuck in `exchanging`.
        await ctx.runMutation(internal.channels.internalRecordError, {
          orgId,
          service: "messenger",
          error: "Multiple Pages available — please pick one.",
          connectedByUserId: userId,
        });
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

      // Subscribe the page to messaging webhooks. Without this Meta will
      // not deliver inbound DMs for this Page.
      const subscribeUrl = new URL(
        `${fbGraphBase()}/${selected.id}/subscribed_apps`,
      );
      subscribeUrl.searchParams.set(
        "subscribed_fields",
        "messages,messaging_postbacks",
      );
      await graphFetch(
        subscribeUrl.toString(),
        {
          method: "POST",
          headers: { Authorization: `Bearer ${selected.access_token}` },
        },
        "Messenger page subscribe",
      );

      await ctx.runMutation(internal.channels.internalSetProgress, {
        orgId,
        service: "messenger",
        progressStep: "backfilling",
      });

      const channelId: Id<"channels"> = await ctx.runMutation(
        internal.channels.internalUpsertMessenger,
        {
          orgId,
          pageId: selected.id,
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
