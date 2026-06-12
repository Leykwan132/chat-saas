import { v } from "convex/values";
import { internalMutation, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { instagramSyncPool } from "./channelSyncPools";
import {
  resolveInboxLedgerContentType,
  resolveWebhookAudioFiles,
} from "./chat/inboxAudioIngest";
import { markOutboundReadThroughExternalId } from "./chat/readReceipts";

// POST handler for the `object: "instagram"` branch of /webhook/meta.
// The caller (convex/http.ts) has already validated the HMAC and parsed JSON.
//
// Payload shape (Instagram Messaging webhooks):
//   {
//     object: "instagram",
//     entry: [{
//       id: <ig-business-account-id>,
//       time: <unix-seconds>,
//       messaging: [{
//         sender: { id },
//         recipient: { id },
//         timestamp: <ms>,
//         message: { mid, text?, attachments? },
//       }],
//     }],
//   }
//
// Exposed as a plain async function rather than an httpAction because the
// /webhook/meta dispatcher (convex/http.ts) calls it after it has already
// verified the HMAC and read the body — wrapping it in `httpAction` would
// prevent direct invocation.
export async function receive(
  ctx: ActionCtx,
  rawBody: string,
): Promise<Response> {
  let payload: InstagramWebhookEnvelope;
  try {
    payload = JSON.parse(rawBody) as InstagramWebhookEnvelope;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messaging_seen") continue;
      const value = change.value;
      const recipientId = value.recipient?.id;
      const senderId = value.sender?.id;
      const readMid = value.read?.mid;
      if (!recipientId || !senderId || !readMid) continue;

      console.log("[instagramWebhook.receive] seen receipt event received:", {
        source: "changes",
        recipientId,
        senderId,
        readMid,
        timestamp: value.timestamp,
      });

      try {
        await ctx.runMutation(internal.instagramWebhook.handleSeenReceipt, {
          recipientIgUserId: recipientId,
          senderIgUserId: senderId,
          externalId: readMid,
          timestampMs: parseMetaTimestamp(value.timestamp),
        });
      } catch (err) {
        console.error("Failed to apply Instagram seen receipt", err);
      }
    }

    for (const event of entry.messaging ?? []) {
      const recipientId = event.recipient?.id;
      const senderId = event.sender?.id;
      const readMid = event.read?.mid;
      if (recipientId && senderId && readMid) {
        console.log("[instagramWebhook.receive] seen receipt event received:", {
          source: "messaging",
          recipientId,
          senderId,
          readMid,
          timestamp: event.timestamp,
        });

        try {
          await ctx.runMutation(internal.instagramWebhook.handleSeenReceipt, {
            recipientIgUserId: recipientId,
            senderIgUserId: senderId,
            externalId: readMid,
            timestampMs: parseMetaTimestamp(event.timestamp),
          });
        } catch (err) {
          console.error("Failed to apply Instagram seen receipt", err);
        }
        continue;
      }

      const message = event.message;
      if (!recipientId || !senderId || !message?.mid) continue;

      console.log("[instagramWebhook.receive] message event received:", {
        recipientId,
        senderId,
        message,
      });

      const webhookAttachments = message.attachments ?? [];
      const imageAttachments = webhookAttachments
        .filter((a): a is WebhookAttachment & { payload: { url: string } } =>
          a.type === "image" && typeof a.payload?.url === "string",
        )
        .map((a) => ({
          url: a.payload.url,
          mimeType: "image/jpeg", // webhook payloads don't explicitly specify mimeType, default to image/jpeg
        }));
      const audioAttachments = resolveWebhookAudioFiles(webhookAttachments);

      try {
        await ctx.runMutation(internal.instagramWebhook.handleIncoming, {
          recipientIgUserId: recipientId,
          senderIgUserId: senderId,
          externalId: message.mid,
          text: message.text,
          timestampMs:
            typeof event.timestamp === "number"
              ? event.timestamp
              : Date.now(),
          images: imageAttachments.length > 0 ? imageAttachments : undefined,
          files: audioAttachments.length > 0 ? audioAttachments : undefined,
        });
      } catch (err) {
        console.error("Failed to persist Instagram message", err);
      }
    }
  }

  return new Response(null, { status: 200 });
}

// Persist a single inbound Instagram DM, upserting the conversation and
// customer on first contact. Mirrors the WhatsApp `handleIncoming` mutation.
//
// IG Graph webhook events do not carry the conversation id, so we use
// (channelId, contactAddress) as the natural key — same shape we use to look
// up conversations from the backfill worker.
export const handleIncoming = internalMutation({
  args: {
    recipientIgUserId: v.string(),
    senderIgUserId: v.string(),
    externalId: v.string(),
    text: v.optional(v.string()),
    timestampMs: v.number(),
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
    const existingMsg = await ctx.db
      .query("messages")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();
    if (existingMsg !== null) return;

    const channel = await ctx.db
      .query("channels")
      .withIndex("by_igUserId", (q) =>
        q.eq("igUserId", args.recipientIgUserId),
      )
      .unique();
    if (channel === null) {
      console.warn(
        `Instagram webhook for unknown ig_user_id=${args.recipientIgUserId}; skipping`,
      );
      return;
    }

    // Is the sender us (echoed outgoing) or the customer?
    const isOutgoing =
      channel.igUserId !== undefined &&
      args.senderIgUserId === channel.igUserId;
    if (isOutgoing) return;

    const contactAddress = args.senderIgUserId;

    const existingConversation = await ctx.db
      .query("conversations")
      .withIndex("by_channel_and_contactAddress", (q) =>
        q.eq("channelId", channel._id).eq("contactAddress", contactAddress),
      )
      .unique();
    if (existingConversation === null) {
      await instagramSyncPool.enqueueAction(
        ctx,
        internal.instagramSync.hydrateConversationByParticipant,
        { channelId: channel._id, participantUserId: contactAddress },
      );
    }

    const content = args.text ?? "";
    const contentType = resolveInboxLedgerContentType(
      content,
      args.images,
      args.files,
    );

    await ctx.runMutation(internal.chat.inbox.internalIngestChannelMessage, {
      channelId: channel._id,
      externalId: args.externalId,
      contactAddress,
      direction: "incoming",
      content,
      contentType,
      timestampMs: args.timestampMs,
      isHistorical: false,
      images: args.images,
      files: args.files,
    });
  },
});

export const handleSeenReceipt = internalMutation({
  args: {
    recipientIgUserId: v.string(),
    senderIgUserId: v.string(),
    externalId: v.string(),
    timestampMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db
      .query("channels")
      .withIndex("by_igUserId", (q) =>
        q.eq("igUserId", args.recipientIgUserId),
      )
      .unique();
    if (channel === null) {
      console.warn(
        `Instagram seen receipt for unknown ig_user_id=${args.recipientIgUserId}; skipping`,
      );
      return;
    }

    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_channel_and_contactAddress", (q) =>
        q.eq("channelId", channel._id).eq("contactAddress", args.senderIgUserId),
      )
      .unique();
    if (conversation === null) return;

    await markOutboundReadThroughExternalId(ctx, {
      conversationId: conversation._id,
      channelId: channel._id,
      externalId: args.externalId,
      source: "instagram_seen",
      timestampMs: args.timestampMs,
    });
  },
});

function parseMetaTimestamp(timestamp: number | string | undefined): number | undefined {
  if (timestamp === undefined) return undefined;
  const n = Number(timestamp);
  if (!Number.isFinite(n)) return undefined;
  return n < 1_000_000_000_000 ? n * 1000 : n;
}

type InstagramWebhookEnvelope = {
  object?: string;
  entry?: Array<{
    id?: string;
    time?: number;
    changes?: Array<{
      field?: string;
      value: {
        sender?: { id?: string };
        recipient?: { id?: string };
        timestamp?: number | string;
        read?: { mid?: string };
      };
    }>;
    messaging?: Array<{
      sender?: { id?: string };
      recipient?: { id?: string };
      timestamp?: number;
      read?: {
        mid?: string;
      };
      message?: {
        mid?: string;
        text?: string;
        attachments?: Array<{ type: string; payload?: { url?: string } }>;
      };
    }>;
  }>;
};

type WebhookAttachment = {
  type: string;
  payload?: { url?: string };
};
