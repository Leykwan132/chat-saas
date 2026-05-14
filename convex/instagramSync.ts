import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  type ActionCtx,
  type MutationCtx,
} from "./_generated/server";
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

type GraphErrorBody = { error?: { message?: string } };

async function graphFetch<T>(url: string, context: string): Promise<T> {
  const res = await fetch(url, { method: "GET" });
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

type ConversationListResponse = {
  data?: Array<{ id: string; updated_time?: string }>;
};

type ConversationDetailResponse = {
  id?: string;
  messages?: {
    data?: Array<InstagramMessage>;
  };
};

type InstagramMessage = {
  id: string;
  from?: { id?: string; username?: string };
  to?: { data?: Array<{ id?: string; username?: string }> };
  message?: string;
  created_time?: string;
};

// One-time backfill of the latest `limit` conversations for a freshly-connected
// Instagram channel. Each conversation hydrates its own messages on a follow-up
// workpool job so we never block on a single slow conversation.
export const backfillConversations = internalAction({
  args: {
    channelId: v.id("channels"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const channel: Doc<"channels"> | null = await ctx.runQuery(
      internal.channels.internalGetChannel,
      { channelId: args.channelId },
    );
    console.log('channel', channel);
    if (
      channel === null ||
      channel.service !== "instagram" ||
      !channel.accessToken
    ) {
      return;
    }

    console.log('enqueueing instagram sync messages');
    try {
      console.log('fetching instagram conversations list');
      const url = new URL(`${instagramGraphBase()}/me/conversations`);
      url.searchParams.set("platform", "instagram");
      url.searchParams.set("limit", String(args.limit));
      url.searchParams.set("access_token", channel.accessToken);

      console.log('url', url.toString());
      const list = await graphFetch<ConversationListResponse>(
        url.toString(),
        "Instagram conversations list",
      );
      console.log('instagram conversations list', list);
      const conversations = list.data ?? [];
      for (const conv of conversations) {
        console.log('conv', conv);
        if (!conv.id) continue;
        console.log('enqueueing instagram sync messages', conv.id);
        await instagramSyncPool.enqueueAction(
          ctx,
          internal.instagramSync.syncMessages,
          {
            channelId: args.channelId,
            conversationExternalId: conv.id,
          },
        );
      }
    } catch (err) {
      console.error("Instagram backfill failed", err);
    }
  },
});

// Pull every message for a single conversation and ingest them. Used both
// during initial backfill and as a one-shot hydrator when a webhook arrives
// for an unknown conversation.
export const syncMessages = internalAction({
  args: {
    channelId: v.id("channels"),
    conversationExternalId: v.string(),
  },
  handler: async (ctx, args) => {
    const channel: Doc<"channels"> | null = await ctx.runQuery(
      internal.channels.internalGetChannel,
      { channelId: args.channelId },
    );
    if (
      channel === null ||
      channel.service !== "instagram" ||
      !channel.accessToken
    ) {
      return;
    }

    try {
      const url = new URL(
        `${instagramGraphBase()}/${args.conversationExternalId}`,
      );
      url.searchParams.set(
        "fields",
        "messages{id,from,to,message,created_time}",
      );
      url.searchParams.set("access_token", channel.accessToken);
      const detail = await graphFetch<ConversationDetailResponse>(
        url.toString(),
        "Instagram conversation fetch",
      );
      await ingestConversationMessages(ctx, channel, detail);
    } catch (err) {
      console.error(
        `Instagram syncMessages failed for ${args.conversationExternalId}`,
        err,
      );
    }
  },
});

// Webhook events don't include the conversation id, only the participant's
// IG-scoped user id. This worker looks up the conversation via the
// `user_id` filter on `me/conversations`, then hydrates its messages.
// Idempotent — re-running it after the first sync is a no-op because each
// message is deduped on `externalId`.
export const hydrateConversationByParticipant = internalAction({
  args: {
    channelId: v.id("channels"),
    participantUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const channel: Doc<"channels"> | null = await ctx.runQuery(
      internal.channels.internalGetChannel,
      { channelId: args.channelId },
    );
    if (
      channel === null ||
      channel.service !== "instagram" ||
      !channel.accessToken
    ) {
      return;
    }

    try {
      const listUrl = new URL(`${instagramGraphBase()}/me/conversations`);
      listUrl.searchParams.set("platform", "instagram");
      listUrl.searchParams.set("user_id", args.participantUserId);
      listUrl.searchParams.set(
        "fields",
        "id,messages{id,from,to,message,created_time}",
      );
      listUrl.searchParams.set("access_token", channel.accessToken);
      const list = await graphFetch<{
        data?: Array<ConversationDetailResponse>;
      }>(listUrl.toString(), "Instagram conversation lookup by user_id");
      for (const conv of list.data ?? []) {
        await ingestConversationMessages(ctx, channel, conv);
      }
    } catch (err) {
      console.error(
        `Instagram hydrate failed for participant ${args.participantUserId}`,
        err,
      );
    }
  },
});

async function ingestConversationMessages(
  ctx: ActionCtx,
  channel: Doc<"channels">,
  detail: ConversationDetailResponse,
) {
  const messages = detail.messages?.data ?? [];
  // Graph returns newest first; ingest oldest-first for natural ordering.
  for (const message of [...messages].reverse()) {
    if (!message.id) continue;
    const orgUserId = channel.igUserId;
    const fromId = message.from?.id;
    const isOutgoing = orgUserId !== undefined && fromId === orgUserId;
    const contactAddress = isOutgoing
      ? message.to?.data?.[0]?.id
      : fromId;
    const contactName = isOutgoing
      ? message.to?.data?.[0]?.username
      : message.from?.username;
    if (!contactAddress) continue;

    await ctx.runMutation(internal.instagramSync.internalIngestMessage, {
      channelId: channel._id,
      externalId: message.id,
      contactAddress,
      contactName,
      direction: isOutgoing ? "outgoing" : "incoming",
      content: message.message ?? "",
      timestampMs: parseTimestamp(message.created_time),
    });
  }
}


// Atomically upsert customer + conversation + message. Mirrors the WhatsApp
// `handleIncoming` mutation so the inbox tables stay consistent across
// services.
export const internalIngestMessage = internalMutation({
  args: {
    channelId: v.id("channels"),
    externalId: v.string(),
    contactAddress: v.string(),
    contactName: v.optional(v.string()),
    direction: v.union(v.literal("incoming"), v.literal("outgoing")),
    content: v.string(),
    timestampMs: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();
    if (existing !== null) return;

    const channel = await ctx.db.get(args.channelId);
    if (channel === null) return;

    const customerId: Id<"customers"> = await ctx.runMutation(
      internal.customers.internalUpsertFromWebhook,
      {
        orgId: channel.orgId,
        service: "instagram",
        contactAddress: args.contactAddress,
        profileName: args.contactName,
      },
    );

    const orgAddress = channel.igUserId ?? "";
    const conversationId = await upsertConversation(ctx, {
      orgId: channel.orgId,
      channelId: channel._id,
      orgAddress,
      contactAddress: args.contactAddress,
      contactName: args.contactName,
      customerId,
      lastMessageAt: args.timestampMs,
      preview: previewFor(args.content),
      isIncoming: args.direction === "incoming",
    });

    await ctx.db.insert("messages", {
      orgId: channel.orgId,
      conversationId,
      channelId: channel._id,
      service: "instagram",
      externalId: args.externalId,
      orgAddress,
      contactAddress: args.contactAddress,
      direction: args.direction,
      contentType: "text",
      content: args.content,
      createdAt: args.timestampMs,
    });

    await ctx.runMutation(internal.customers.internalSetLastConversation, {
      customerId,
      conversationId,
    });
  },
});

async function upsertConversation(
  ctx: MutationCtx,
  args: {
    orgId: string;
    channelId: Id<"channels">;
    orgAddress: string;
    contactAddress: string;
    contactName?: string;
    customerId: Id<"customers">;
    lastMessageAt: number;
    preview: string;
    isIncoming: boolean;
  },
): Promise<Id<"conversations">> {
  const existing = await ctx.db
    .query("conversations")
    .withIndex("by_channel_and_contactAddress", (q) =>
      q
        .eq("channelId", args.channelId)
        .eq("contactAddress", args.contactAddress),
    )
    .unique();

  const now = Date.now();
  if (existing === null) {
    return await ctx.db.insert("conversations", {
      orgId: args.orgId,
      channelId: args.channelId,
      service: "instagram",
      orgAddress: args.orgAddress,
      contactAddress: args.contactAddress,
      contactName: args.contactName,
      customerId: args.customerId,
      status: "open",
      lastMessageAt: args.lastMessageAt,
      lastMessagePreview: args.preview,
      unreadCount: args.isIncoming ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  const patch: Record<string, unknown> = {
    lastMessageAt: args.lastMessageAt,
    lastMessagePreview: args.preview,
    updatedAt: now,
  };
  if (args.isIncoming) {
    patch.unreadCount = existing.unreadCount + 1;
  }
  if (!existing.contactName && args.contactName) {
    patch.contactName = args.contactName;
  }
  if (!existing.customerId) {
    patch.customerId = args.customerId;
  }
  if (existing.status === "closed") patch.status = "open";
  await ctx.db.patch(existing._id, patch);
  return existing._id;
}

function previewFor(content: string): string {
  return content.slice(0, 140);
}

function parseTimestamp(ts?: string): number {
  if (!ts) return Date.now();
  const ms = Date.parse(ts);
  return Number.isFinite(ms) ? ms : Date.now();
}
