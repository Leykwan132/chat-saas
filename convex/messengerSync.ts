import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  type ActionCtx,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { messengerSyncPool } from "./channelSyncPools";

const DEFAULT_GRAPH_VERSION = "v25.0";

function graphVersion() {
  return process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
}

function fbGraphBase() {
  return `https://graph.facebook.com/${graphVersion()}`;
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

type MessengerParticipant = { id?: string; name?: string };
type MessengerMessage = {
  id: string;
  from?: MessengerParticipant;
  to?: { data?: MessengerParticipant[] };
  message?: string;
  created_time?: string;
};
type ConversationDetailResponse = {
  id?: string;
  messages?: { data?: MessengerMessage[] };
};

// One-time backfill of the latest `limit` Messenger conversations on the
// Page after the user connects. Each conversation hydrates its own messages
// on a follow-up workpool job.
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
    if (
      channel === null ||
      channel.service !== "messenger" ||
      !channel.accessToken ||
      !channel.pageId
    ) {
      return;
    }

    try {
      const url = new URL(`${fbGraphBase()}/${channel.pageId}/conversations`);
      url.searchParams.set("platform", "messenger");
      url.searchParams.set("limit", String(args.limit));
      url.searchParams.set("access_token", channel.accessToken);
      const list = await graphFetch<{
        data?: Array<{ id: string }>;
      }>(url.toString(), "Messenger conversations list");
      console.log('msg list', list);
      for (const conv of list.data ?? []) {
        if (!conv.id) continue;
        await messengerSyncPool.enqueueAction(
          ctx,
          internal.messengerSync.syncMessages,
          {
            channelId: args.channelId,
            conversationExternalId: conv.id,
          },
        );
      }
    } catch (err) {
      console.error("Messenger backfill failed", err);
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
      channel.service !== "messenger" ||
      !channel.accessToken ||
      !channel.pageId
    ) {
      return;
    }

    try {
      const url = new URL(
        `${fbGraphBase()}/${args.conversationExternalId}`,
      );
      url.searchParams.set(
        "fields",
        "messages{id,from,to,message,created_time}",
      );
      url.searchParams.set("access_token", channel.accessToken);
      const detail = await graphFetch<ConversationDetailResponse>(
        url.toString(),
        "Messenger conversation fetch",
      );
      console.log('msg detail', detail);
      await ingestConversationMessages(ctx, channel, detail);
    } catch (err) {
      console.error(
        `Messenger syncMessages failed for ${args.conversationExternalId}`,
        err,
      );
    }
  },
});

// Webhook events for Messenger include the sender PSID but not the
// conversation id. We list conversations filtered by `user_id={psid}` to
// recover the conversation id, then hydrate its full message history.
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
      channel.service !== "messenger" ||
      !channel.accessToken ||
      !channel.pageId
    ) {
      return;
    }

    try {
      const url = new URL(`${fbGraphBase()}/${channel.pageId}/conversations`);
      url.searchParams.set("platform", "messenger");
      url.searchParams.set("user_id", args.participantUserId);
      url.searchParams.set(
        "fields",
        "id,messages{id,from,to,message,created_time}",
      );
      url.searchParams.set("access_token", channel.accessToken);
      const list = await graphFetch<{
        data?: Array<ConversationDetailResponse>;
      }>(url.toString(), "Messenger conversation lookup by user_id");
      for (const conv of list.data ?? []) {
        await ingestConversationMessages(ctx, channel, conv);
      }
    } catch (err) {
      console.error(
        `Messenger hydrate failed for participant ${args.participantUserId}`,
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
  for (const message of [...messages].reverse()) {
    if (!message.id) continue;
    const pageId = channel.pageId;
    const fromId = message.from?.id;
    const isOutgoing = pageId !== undefined && fromId === pageId;
    const contactAddress = isOutgoing
      ? message.to?.data?.[0]?.id
      : fromId;
    const contactName = isOutgoing
      ? message.to?.data?.[0]?.name
      : message.from?.name;
    if (!contactAddress) continue;

    await ctx.runMutation(internal.messengerSync.internalIngestMessage, {
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

// Atomically upsert customer + conversation + message for Messenger.
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
        service: "messenger",
        contactAddress: args.contactAddress,
        profileName: args.contactName,
      },
    );

    const orgAddress = channel.pageId ?? "";
    const conversationId = await upsertConversation(ctx, {
      orgId: channel.orgId,
      channelId: channel._id,
      orgAddress,
      contactAddress: args.contactAddress,
      contactName: args.contactName,
      customerId,
      lastMessageAt: args.timestampMs,
      preview: args.content.slice(0, 140),
      isIncoming: args.direction === "incoming",
    });

    await ctx.db.insert("messages", {
      orgId: channel.orgId,
      conversationId,
      channelId: channel._id,
      service: "messenger",
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
      service: "messenger",
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

function parseTimestamp(ts?: string): number {
  if (!ts) return Date.now();
  const ms = Date.parse(ts);
  return Number.isFinite(ms) ? ms : Date.now();
}
