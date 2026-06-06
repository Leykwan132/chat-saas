import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  type ActionCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { messengerSyncPool } from "./channelSyncPools";
import {
  ingestChannelMessage,
  resolveSyncMessageDirection,
  businessAgentName,
} from "./chat/threads";
import { inboxAiReplyPool } from "./inboxPools";

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

type MessengerParticipant = { id?: string; name?: string; email?: string };
type MessengerAttachment = {
  id?: string;
  mime_type?: string;
  name?: string;
  size?: number;
  image_data?: { url?: string; width?: number; height?: number };
  video_data?: { url?: string };
  file_url?: string;
};
type MessengerMessage = {
  id: string;
  from?: MessengerParticipant;
  to?: { data?: MessengerParticipant[] };
  message?: string;
  created_time?: string;
  attachments?: { data?: MessengerAttachment[] };
};
type ConversationDetailResponse = {
  id?: string;
  participants?: { data?: MessengerParticipant[] };
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
        "participants{id,name,email},messages{id,from,to,message,created_time,attachments}",
      );
      url.searchParams.set("access_token", channel.accessToken);
      const detail = await graphFetch<ConversationDetailResponse>(
        url.toString(),
        "Messenger conversation fetch",
      );
      const conversationId = await ingestConversationMessages(ctx, channel, detail);
      if (conversationId) {
        await ctx.runMutation(internal.chat.inbox.internalEnqueueSummarization, {
          conversationId,
        });
      }
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
        "id,participants{id,name,email},messages{id,from,to,message,created_time,attachments}",
      );
      url.searchParams.set("access_token", channel.accessToken);
      const list = await graphFetch<{
        data?: Array<ConversationDetailResponse>;
      }>(url.toString(), "Messenger conversation lookup by user_id");
      for (const conv of list.data ?? []) {
        const conversationId = await ingestConversationMessages(ctx, channel, conv);
        if (conversationId) {
          await ctx.runMutation(internal.chat.inbox.internalEnqueueSummarization, {
            conversationId,
          });
        }
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
): Promise<Id<"conversations"> | null> {
  const messages = detail.messages?.data ?? [];
  const participants = detail.participants?.data ?? [];
  const customerParticipant = participants.find((p) => p.id && p.id !== channel.pageId);

  let conversationId: Id<"conversations"> | null = null;

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

    const audioAttachments = attachments
      .filter(
        (a) =>
          a.mime_type?.startsWith("audio/") ||
          a.name?.endsWith(".aac") ||
          a.name?.endsWith(".mp3") ||
          a.name?.endsWith(".m4a") ||
          a.name?.endsWith(".ogg"),
      )
      .map((a) => {
        const url = a.file_url;
        const mimeType = a.mime_type ?? "audio/ogg";
        return url ? { url, mimeType } : null;
      })
      .filter(Boolean) as Array<{ url: string; mimeType: string }>;

    const isAudioMessage = audioAttachments.length > 0;

    const isOutgoing = resolveSyncMessageDirection(channel, message);
    const contactAddress = (isOutgoing
      ? message.to?.data?.[0]?.id
      : message.from?.id) || customerParticipant?.id;
    const contactName = (isOutgoing
      ? message.to?.data?.[0]?.name
      : message.from?.name) || customerParticipant?.name;
    if (!contactAddress) continue;

    const ingestArgs = {
      channelId: channel._id,
      externalId: message.id,
      contactAddress,
      contactName,
      contactEmail: customerParticipant?.email,
      direction: isOutgoing ? ("outgoing" as const) : ("incoming" as const),
      content: message.message ?? "",
      timestampMs: parseTimestamp(message.created_time),
      metaConversationId: detail.id,
      images: imageAttachments.length > 0 ? imageAttachments : undefined,
      audios: audioAttachments.length > 0 ? audioAttachments : undefined,
    };

    if (isAudioMessage) {
      console.log("[messengerSync.ingestConversationMessages] audio message", {
        messageId: message.id,
        conversationExternalId: detail.id,
        direction: ingestArgs.direction,
        isOutgoing,
        textContent: message.message ?? "",
        rawAttachments: attachments,
        audioAttachments,
        imageAttachments,
        ingestArgs,
      });
    }

    const res = await ctx.runMutation(
      internal.messengerSync.internalIngestMessage,
      ingestArgs,
    );
    if (res?.conversationId) {
      conversationId = res.conversationId;
    }
  }
  return conversationId;
}

// Atomically upsert customer + conversation + message for Messenger.
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
    audios: v.optional(
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

    let contentType: Doc<"messages">["contentType"] = "text";
    if (args.audios && args.audios.length > 0) {
      contentType = "audio";
    } else if (args.images && args.images.length > 0) {
      contentType = "image";
    }

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
      audios: args.audios,
    });
    if (result.skipped || !result.shouldEnqueueAi) {
      return result;
    }
    const conv = await ctx.db.get(result.conversationId);
    if (conv === null || !conv.assignToAiAgent || !conv.assignedAgentId) {
      return result;
    }
    await inboxAiReplyPool.enqueueAction(
      ctx,
      internal.chat.inbox.generateAiReplyWorker,
      {
        conversationId: result.conversationId,
        promptContent: args.content.trim(),
        promptMessageId: result.agentMessageId,
      },
    );
    return result;
  },
});

function parseTimestamp(ts?: string): number {
  if (!ts) return Date.now();
  const ms = Date.parse(ts);
  return Number.isFinite(ms) ? ms : Date.now();
}
