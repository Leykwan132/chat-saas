import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  type ActionCtx,
} from "./_generated/server";
import {
  resolveInboxLedgerContentType,
  resolveSyncAudioFiles,
} from "./chat/inboxAudioIngest";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { instagramSyncPool } from "./channelSyncPools";
import {
  ingestChannelMessage,
  resolveSyncMessageDirection,
  businessAgentName,
} from "./chat/threads";
import { requestConversationAnalyticsRefresh } from "./analyticsRefreshRequest";

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

type InstagramParticipant = { id?: string; username?: string; name?: string };

type ConversationDetailResponse = {
  id?: string;
  participants?: { data?: InstagramParticipant[] };
  messages?: {
    data?: Array<InstagramMessage>;
  };
};

type InstagramAttachment = {
  id?: string;
  mime_type?: string;
  name?: string;
  size?: number;
  image_data?: { url?: string; width?: number; height?: number };
  video_data?: { url?: string };
  file_url?: string;
};

type InstagramMessage = {
  id: string;
  from?: InstagramParticipant;
  to?: { data?: InstagramParticipant[] };
  message?: string;
  created_time?: string;
  attachments?: { data?: InstagramAttachment[] };
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
        "participants{id,username,name},messages{id,from,to,message,created_time,attachments}",
      );
      url.searchParams.set("access_token", channel.accessToken);
      const detail = await graphFetch<ConversationDetailResponse>(
        url.toString(),
        "Instagram conversation fetch",
      );
      console.log("[instagramSync.syncMessages] conversation fetched", {
        conversationExternalId: args.conversationExternalId,
        channelId: args.channelId,
        messageCount: detail.messages?.data?.length ?? 0,
        messages: detail.messages?.data,
      });
      const conversationId = await ingestConversationMessages(ctx, channel, detail);
      if (conversationId) {
        await ctx.runAction(internal.chat.inboxActions.internalLabelLeadOnSync, {
          conversationId,
        });
      }
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
        "id,participants{id,username,name},messages{id,from,to,message,created_time,attachments}",
      );
      listUrl.searchParams.set("access_token", channel.accessToken);
      const list = await graphFetch<{
        data?: Array<ConversationDetailResponse>;
      }>(listUrl.toString(), "Instagram conversation lookup by user_id");
      for (const conv of list.data ?? []) {
        const conversationId = await ingestConversationMessages(ctx, channel, conv);
        if (conversationId) {
          await ctx.runAction(internal.chat.inboxActions.internalLabelLeadOnSync, {
            conversationId,
          });
        }
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
): Promise<Id<"conversations"> | null> {
  const messages = detail.messages?.data ?? [];
  const participants = detail.participants?.data ?? [];
  const customerParticipant = participants.find((p) => p.id && p.id !== channel.igUserId);

  let conversationId: Id<"conversations"> | null = null;

  // Graph returns newest first; ingest oldest-first for natural ordering.
  for (const message of [...messages].reverse()) {
    if (!message.id) continue;
    const attachments = message.attachments?.data ?? [];
    const imageAttachments = attachments
      .filter(
        (a) =>
          a.mime_type?.startsWith("image/") ||
          a.image_data !== undefined
      )
      .map((a) => {
        const url = a.image_data?.url ?? a.file_url;
        const mimeType = a.mime_type ?? "image/jpeg";
        return url ? { url, mimeType } : null;
      })
      .filter(Boolean) as Array<{ url: string; mimeType: string }>;

    const audioAttachments = resolveSyncAudioFiles(
      attachments,
      channel.accessToken,
    );

    const hasImageAttachment = imageAttachments.length > 0;
    const hasAudioAttachment = audioAttachments.length > 0;
    if (attachments.length > 0 || !message.message) {
      console.log("[instagramSync.ingestConversationMessages] message", {
        messageId: message.id,
        text: message.message ?? null,
        attachmentCount: attachments.length,
        hasImageAttachment,
        hasAudioAttachment,
        attachments,
        from: message.from,
        to: message.to,
        created_time: message.created_time,
      });
    }

    const isOutgoing = resolveSyncMessageDirection(channel, message);
    const contactAddress = (isOutgoing
      ? message.to?.data?.[0]?.id
      : message.from?.id) || customerParticipant?.id;
    const contactName = (isOutgoing
      ? message.to?.data?.[0]?.username ?? message.to?.data?.[0]?.name
      : message.from?.username ?? message.from?.name) || customerParticipant?.username || customerParticipant?.name;
    if (!contactAddress) continue;

    const res = await ctx.runMutation(internal.instagramSync.internalIngestMessage, {
      channelId: channel._id,
      externalId: message.id,
      contactAddress,
      contactName,
      direction: isOutgoing ? "outgoing" : "incoming",
      content: message.message ?? "",
      timestampMs: parseTimestamp(message.created_time),
      metaConversationId: detail.id,
      images: imageAttachments.length > 0 ? imageAttachments : undefined,
      files: audioAttachments.length > 0 ? audioAttachments : undefined,
    });
    if (res?.conversationId) {
      conversationId = res.conversationId;
    }
  }
  return conversationId;
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
    contactEmail: v.optional(v.string()),
    direction: v.union(v.literal("incoming"), v.literal("outgoing")),
    content: v.string(),
    timestampMs: v.number(),
    metaConversationId: v.optional(v.string()),
    images: v.optional(
      v.array(
        v.object({
          url: v.string(),
          mimeType: v.string(),
        })
      )
    ),
    files: v.optional(
      v.array(
        v.object({
          url: v.string(),
          mimeType: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (channel === null) return null;

    const contentType = resolveInboxLedgerContentType(
      args.content,
      args.images,
      args.files,
    );

    const result = await ingestChannelMessage(ctx, {
      channelId: args.channelId,
      externalId: args.externalId,
      contactAddress: args.contactAddress,
      contactName: args.contactName,
      contactEmail: args.contactEmail,
      direction: args.direction,
      content: args.content,
      contentType,
      timestampMs: args.timestampMs,
      isHistorical: true,
      humanAgentName:
        args.direction === "outgoing" ? businessAgentName(channel) : undefined,
      metaConversationId: args.metaConversationId,
      images: args.images,
      files: args.files,
    });
    if (!result.skipped) {
      await requestConversationAnalyticsRefresh(ctx, result.conversationId);
    }
    return result;
  },
});

function parseTimestamp(ts?: string): number {
  if (!ts) return Date.now();
  const ms = Date.parse(ts);
  return Number.isFinite(ms) ? ms : Date.now();
}
