import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthContext } from "./authUtils";
import { handleWorkflowFollowUpOutbound } from "./workflowFollowUpRuntime";
import { buildWhatsAppRecipient } from "./whatsappRecipient";

const DEFAULT_GRAPH_VERSION = "v22.0";

function graphBase() {
  const version = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
  return `https://graph.facebook.com/${version}`;
}

// Send a freeform text reply on an existing WhatsApp conversation. The Cloud
// API only allows freeform replies inside the 24-hour customer-care window;
// outside that window the request will fail and we record the message with
// status: "failed".
export const sendText = action({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ externalId: string | undefined }> => {
    const { orgId, userId } = await getAuthContext(ctx);
    const trimmed = args.content.trim();
    if (!trimmed) {
      throw new Error("Cannot send an empty message");
    }

    const ctxData: SendContext | null = await ctx.runQuery(
      internal.whatsappSend.internalGetSendContext,
      { conversationId: args.conversationId, orgId },
    );
    if (ctxData === null) {
      throw new Error("Conversation not found");
    }
    const { conversation, channel, customer } = ctxData;
    if (conversation.service !== "whatsapp" || channel.service !== "whatsapp") {
      throw new Error("Not a WhatsApp conversation");
    }
    if (channel.status !== "connected" || !channel.phoneNumberId) {
      throw new Error("WhatsApp channel is not connected");
    }

    const accessToken = (channel.accessToken ?? "").trim();
    if (!accessToken) {
      throw new Error("WhatsApp channel is not connected");
    }

    const url = `${graphBase()}/${channel.phoneNumberId}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      ...buildWhatsAppRecipient(customer),
      type: "text",
      text: { body: trimmed },
    };
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let body: GraphSendResponse | null;
    try {
      body = text.length ? (JSON.parse(text) as GraphSendResponse) : null;
    } catch {
      body = null;
    }

    if (!res.ok) {
      const errMsg = body?.error?.message ?? `HTTP ${res.status}`;
      await ctx.runMutation(internal.whatsappSend.internalRecordOutgoing, {
        conversationId: args.conversationId,
        channelId: channel._id,
        orgId: channel.orgId,
        orgAddress: channel.phoneNumberId,
        contactAddress: conversation.contactAddress,
        content: trimmed,
        authorUserId: userId,
        externalId: undefined,
        status: "failed",
        failureReason: errMsg,
      });
      throw new Error(`WhatsApp send failed: ${errMsg}`);
    }

    const externalId = body?.messages?.[0]?.id;
    await ctx.runMutation(internal.whatsappSend.internalRecordOutgoing, {
      conversationId: args.conversationId,
      channelId: channel._id,
      orgId: channel.orgId,
      orgAddress: channel.phoneNumberId,
      contactAddress: conversation.contactAddress,
      content: trimmed,
      authorUserId: userId,
      externalId,
      status: "sent",
    });
    return { externalId };
  },
});

type SendContext = {
  conversation: Doc<"conversations">;
  channel: Doc<"channels">;
  customer: Doc<"customers">;
};

export const internalGetSendContext = internalQuery({
  args: {
    conversationId: v.id("conversations"),
    orgId: v.string(),
  },
  handler: async (ctx, args): Promise<SendContext | null> => {
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null || conv.orgId !== args.orgId) return null;
    if (conv.service !== "whatsapp") return null;
    if (!conv.channelId) return null;
    const channel = await ctx.db.get(conv.channelId);
    if (channel === null || channel.orgId !== args.orgId) return null;
    if (channel.service !== "whatsapp") return null;
    if (!conv.customerId) return null;
    const customer = await ctx.db.get(conv.customerId);
    if (customer === null || customer.orgId !== args.orgId) return null;
    return { conversation: conv, channel, customer };
  },
});

export const internalRecordOutgoing = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    channelId: v.id("channels"),
    orgId: v.string(),
    orgAddress: v.optional(v.string()),
    contactAddress: v.string(),
    content: v.string(),
    authorUserId: v.string(),
    externalId: v.optional(v.string()),
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed"),
    ),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"messages">> => {
    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      orgId: args.orgId,
      conversationId: args.conversationId,
      channelId: args.channelId,
      service: "whatsapp",
      externalId: args.externalId,
      orgAddress: args.orgAddress ?? "",
      contactAddress: args.contactAddress,
      direction: "outgoing",
      authorUserId: args.authorUserId,
      contentType: "text",
      content: args.content,
      status: args.status,
      failureReason: args.failureReason,
      createdAt: now,
    });

    const conv = await ctx.db.get(args.conversationId);
    if (conv !== null) {
      const patch: Record<string, unknown> = {
        lastMessageAt: now,
        lastMessagePreview: args.content.slice(0, 140),
        unreadCount: 0,
        updatedAt: now,
      };
      await ctx.db.patch(args.conversationId, patch);
    }
    if (args.status === "sent" || args.status === "delivered" || args.status === "read") {
      await handleWorkflowFollowUpOutbound(ctx, messageId);
    }
    return messageId;
  },
});

type GraphSendResponse = {
  messaging_product?: string;
  contacts?: Array<{ input?: string; wa_id?: string }>;
  messages?: Array<{ id?: string }>;
  error?: { message?: string; code?: number; type?: string };
};
