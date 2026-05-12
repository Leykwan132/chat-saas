import { v } from "convex/values";
import {
  internalMutation,
  type ActionCtx,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { messengerSyncPool } from "./channelSyncPools";

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

    const customerId: Id<"customers"> = await ctx.runMutation(
      internal.customers.internalUpsertFromWebhook,
      {
        orgId: channel.orgId,
        service: "messenger",
        contactAddress,
        profileName: undefined,
      },
    );

    const conversationId = await upsertConversation(ctx, {
      orgId: channel.orgId,
      channelId: channel._id,
      orgAddress: channel.pageId ?? args.pageId,
      contactAddress,
      customerId,
      lastMessageAt: args.timestampMs,
      preview: (args.text ?? "").slice(0, 140),
    });

    await ctx.db.insert("messages", {
      orgId: channel.orgId,
      conversationId,
      channelId: channel._id,
      service: "messenger",
      externalId: args.externalId,
      orgAddress: channel.pageId ?? args.pageId,
      contactAddress,
      direction: "incoming",
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
      customerId: args.customerId,
      status: "open",
      lastMessageAt: args.lastMessageAt,
      lastMessagePreview: args.preview,
      unreadCount: 1,
      createdAt: now,
      updatedAt: now,
    });
  }
  const patch: Record<string, unknown> = {
    lastMessageAt: args.lastMessageAt,
    lastMessagePreview: args.preview,
    unreadCount: existing.unreadCount + 1,
    updatedAt: now,
  };
  if (!existing.customerId) {
    patch.customerId = args.customerId;
  }
  if (existing.status === "closed") patch.status = "open";
  await ctx.db.patch(existing._id, patch);
  return existing._id;
}

type MessengerWebhookEnvelope = {
  object?: string;
  entry?: Array<{
    id?: string;
    time?: number;
    messaging?: Array<{
      sender?: { id?: string };
      recipient?: { id?: string };
      timestamp?: number;
      message?: { mid?: string; text?: string; is_echo?: boolean };
    }>;
  }>;
};
