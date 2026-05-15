import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthContext } from "./authUtils";

const DEFAULT_GRAPH_VERSION = "v25.0";

function graphBase() {
  const version = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
  return `https://graph.facebook.com/${version}`;
}

// Send a plain-text Messenger reply on an existing Page conversation. Uses the
// Page access token on the channel row; recipient PSID is `conversation.contactAddress`
// (same natural key as webhooks and sync ingest).
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
    if ([...trimmed].length > 2000) {
      throw new Error("Messenger text messages must be 2000 characters or less");
    }

    const ctxData: SendContext | null = await ctx.runQuery(
      internal.messengerSend.internalGetSendContext,
      { conversationId: args.conversationId, orgId },
    );
    if (ctxData === null) {
      throw new Error("Conversation not found");
    }
    const { conversation, channel } = ctxData;
    if (
      conversation.service !== "messenger" ||
      channel.service !== "messenger"
    ) {
      throw new Error("Not a Messenger conversation");
    }
    if (
      channel.status !== "connected" ||
      !channel.accessToken?.trim() ||
      !channel.pageId
    ) {
      throw new Error("Messenger channel is not connected");
    }

    const pageId = channel.pageId;
    const url = `${graphBase()}/me/messages`;
    const payload = {
      recipient: { id: conversation.contactAddress },
      messaging_type: "RESPONSE",
      message: { text: trimmed },
    };
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channel.accessToken.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let body: GraphSendResponse | null = null;
    try {
      body = text.length ? (JSON.parse(text) as GraphSendResponse) : null;
    } catch {
      body = null;
    }

    if (!res.ok) {
      const errMsg = body?.error?.message ?? `HTTP ${res.status}`;
      await ctx.runMutation(internal.messengerSend.internalRecordOutgoing, {
        conversationId: args.conversationId,
        channelId: channel._id,
        orgId: channel.orgId,
        orgAddress: pageId,
        contactAddress: conversation.contactAddress,
        content: trimmed,
        authorUserId: userId,
        externalId: undefined,
        status: "failed",
        failureReason: errMsg,
      });
      throw new Error(`Messenger send failed: ${errMsg}`);
    }

    const externalId = body?.message_id;
    await ctx.runMutation(internal.messengerSend.internalRecordOutgoing, {
      conversationId: args.conversationId,
      channelId: channel._id,
      orgId: channel.orgId,
      orgAddress: pageId,
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
};

export const internalGetSendContext = internalQuery({
  args: {
    conversationId: v.id("conversations"),
    orgId: v.string(),
  },
  handler: async (ctx, args): Promise<SendContext | null> => {
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null || conv.orgId !== args.orgId) return null;
    if (conv.service !== "messenger") return null;
    if (!conv.channelId) return null;
    const channel = await ctx.db.get(conv.channelId);
    if (channel === null || channel.orgId !== args.orgId) return null;
    if (channel.service !== "messenger") return null;
    return { conversation: conv, channel };
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
      service: "messenger",
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
      await ctx.db.patch(args.conversationId, {
        lastMessageAt: now,
        lastMessagePreview: args.content.slice(0, 140),
        unreadCount: 0,
        updatedAt: now,
      });
    }
    return messageId;
  },
});

type GraphSendResponse = {
  recipient_id?: string;
  message_id?: string;
  error?: { message?: string; code?: number; type?: string };
};
