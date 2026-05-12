import { v } from "convex/values";
import {
  internalMutation,
  type ActionCtx,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
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
    const isOutgoing = args.senderIgUserId === args.recipientIgUserId;
    const contactAddress = isOutgoing
      ? args.recipientIgUserId
      : args.senderIgUserId;

    // Determine up-front whether we've already stored this conversation;
    // if not, hydrate full history from Graph in the background once. The
    // single message we are about to insert is still saved synchronously so
    // it never goes missing, and the hydrate is idempotent (deduped by
    // externalId).
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

    const customerId: Id<"customers"> = await ctx.runMutation(
      internal.customers.internalUpsertFromWebhook,
      {
        orgId: channel.orgId,
        service: "instagram",
        contactAddress,
        profileName: undefined,
      },
    );

    const conversationId = await upsertConversation(ctx, {
      orgId: channel.orgId,
      channelId: channel._id,
      orgAddress: channel.igUserId ?? args.recipientIgUserId,
      contactAddress,
      customerId,
      lastMessageAt: args.timestampMs,
      preview: (args.text ?? "").slice(0, 140),
      isIncoming: !isOutgoing,
    });

    await ctx.db.insert("messages", {
      orgId: channel.orgId,
      conversationId,
      channelId: channel._id,
      service: "instagram",
      externalId: args.externalId,
      orgAddress: channel.igUserId ?? args.recipientIgUserId,
      contactAddress,
      direction: isOutgoing ? "outgoing" : "incoming",
      contentType: "text",
      content: args.text ?? "",
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
  if (!existing.customerId) {
    patch.customerId = args.customerId;
  }
  if (existing.status === "closed") patch.status = "open";
  await ctx.db.patch(existing._id, patch);
  return existing._id;
}

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
