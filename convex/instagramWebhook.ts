import { v } from "convex/values";
import { internalMutation, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { instagramSyncPool } from "./channelSyncPools";

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
    for (const event of entry.messaging ?? []) {
      const recipientId = event.recipient?.id;
      const senderId = event.sender?.id;
      const message = event.message;
      if (!recipientId || !senderId || !message?.mid) continue;
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

    await ctx.runMutation(internal.chat.inbox.internalIngestChannelMessage, {
      channelId: channel._id,
      externalId: args.externalId,
      contactAddress,
      direction: "incoming",
      content: args.text ?? "",
      contentType: "text",
      timestampMs: args.timestampMs,
      isHistorical: false,
    });
  },
});

type InstagramWebhookEnvelope = {
  object?: string;
  entry?: Array<{
    id?: string;
    time?: number;
    messaging?: Array<{
      sender?: { id?: string };
      recipient?: { id?: string };
      timestamp?: number;
      message?: { mid?: string; text?: string };
    }>;
  }>;
};
