import { v } from "convex/values";
import { internalMutation, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { messengerSyncPool } from "./channelSyncPools";
import {
  resolveInboxLedgerContentType,
  resolveWebhookAudioFiles,
} from "./chat/inboxAudioIngest";

// POST handler for the `object: "page"` branch of /webhook/meta.
//
// Payload shape (Messenger Platform):
//   {
//     object: "page",
//     entry: [{
//       id: <page-id>,
//       time: <unix-seconds>,
//       messaging: [{
//         sender: { id: <psid> },
//         recipient: { id: <page-id> },
//         timestamp: <ms>,
//         message: { mid, text?, is_echo? },
//       }],
//     }],
//   }
export async function receive(
  ctx: ActionCtx,
  rawBody: string,
): Promise<Response> {
  let payload: MessengerWebhookEnvelope;
  try {
    payload = JSON.parse(rawBody) as MessengerWebhookEnvelope;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const recipientId = event.recipient?.id;
      const senderId = event.sender?.id;
      const message = event.message;
      if (!recipientId || !senderId || !message?.mid) continue;

      console.log("[messengerWebhook.receive] message event received:", {
        recipientId,
        senderId,
        message,
      });

      const webhookAttachments = message.attachments ?? [];
      const imageAttachments = webhookAttachments
        .filter((a: any) => a.type === "image" && a.payload?.url)
        .map((a: any) => ({
          url: a.payload.url as string,
          mimeType: "image/jpeg", // webhook payloads don't explicitly specify mimeType, default to image/jpeg
        }));
      const audioAttachments = resolveWebhookAudioFiles(webhookAttachments);

      try {
        await ctx.runMutation(internal.messengerWebhook.handleIncoming, {
          pageId: recipientId,
          senderPsid: senderId,
          externalId: message.mid,
          text: message.text,
          isEcho: message.is_echo === true,
          timestampMs:
            typeof event.timestamp === "number"
              ? event.timestamp
              : Date.now(),
          images: imageAttachments.length > 0 ? imageAttachments : undefined,
          files: audioAttachments.length > 0 ? audioAttachments : undefined,
        });
      } catch (err) {
        console.error("Failed to persist Messenger message", err);
      }
    }
  }

  return new Response(null, { status: 200 });
}

// Persist a single Messenger DM, upserting the conversation and customer
// on first contact. When the conversation is brand new we also enqueue a
// full history hydrate via the workpool — same pattern as the Instagram
// webhook.
export const handleIncoming = internalMutation({
  args: {
    pageId: v.string(),
    senderPsid: v.string(),
    externalId: v.string(),
    text: v.optional(v.string()),
    isEcho: v.boolean(),
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
      .withIndex("by_pageId", (q) => q.eq("pageId", args.pageId))
      .unique();
    if (channel === null) {
      console.warn(
        `Messenger webhook for unknown page_id=${args.pageId}; skipping`,
      );
      return;
    }

    // Page sends to a user → `is_echo: true` on the event for our own sends.
    // The senderPsid in an echo is the Page id itself.
    const isOutgoing = args.isEcho || args.senderPsid === args.pageId;
    const contactAddress = isOutgoing ? args.senderPsid : args.senderPsid;
    // For echo events the recipient holds the customer PSID. The Messenger
    // platform does not expose `recipient` to mutations here, but is_echo
    // events still arrive with sender = Page, recipient = customer. We
    // accept that for incoming-only ingestion the contactAddress is the
    // sender; on echoes the senderPsid IS the page so we cannot recover
    // the customer PSID without the recipient field. In practice we drop
    // echo events here and rely on outgoing rows being inserted by the
    // sending action.
    if (isOutgoing) return;

    const existingConversation = await ctx.db
      .query("conversations")
      .withIndex("by_channel_and_contactAddress", (q) =>
        q.eq("channelId", channel._id).eq("contactAddress", contactAddress),
      )
      .unique();
    if (existingConversation === null) {
      await messengerSyncPool.enqueueAction(
        ctx,
        internal.messengerSync.hydrateConversationByParticipant,
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

type MessengerWebhookEnvelope = {
  object?: string;
  entry?: Array<{
    id?: string;
    time?: number;
    messaging?: Array<{
      sender?: { id?: string };
      recipient?: { id?: string };
      timestamp?: number;
      message?: {
        mid?: string;
        text?: string;
        is_echo?: boolean;
        attachments?: Array<{ type: string; payload?: { url?: string } }>;
      };
    }>;
  }>;
};
