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

function graphVersion() {
  return process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
}

function instagramGraphBase() {
  return `https://graph.instagram.com/${graphVersion()}`;
}

/** Strip BOM, quotes, and accidental `Bearer ` prefix from dashboard/env pastes. */
function normalizeMetaAccessToken(raw: string | undefined): string {
  if (raw === undefined) return "";
  let t = raw.trim();
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1).trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  if (t.toLowerCase().startsWith("bearer ")) {
    t = t.slice(7).trim();
  }
  return t;
}

// POST graph.instagram.com/<META_GRAPH_API_VERSION>/me/messages with
// { message, recipient } (same key order as Meta’s curl).
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
    const bytes = new TextEncoder().encode(trimmed).length;
    if (bytes > 1000) {
      throw new Error("Instagram text messages must be 1000 bytes or less (UTF-8)");
    }

    const ctxData: SendContext | null = await ctx.runQuery(
      internal.instagramSend.internalGetSendContext,
      { conversationId: args.conversationId, orgId },
    );
    if (ctxData === null) {
      throw new Error("Conversation not found");
    }
    const { conversation, channel } = ctxData;
    if (channel.status !== "connected" || !channel.igUserId) {
      throw new Error("Instagram channel is not connected");
    }

    const accessToken = normalizeMetaAccessToken(channel.accessToken);
    if (!accessToken) {
      throw new Error("Instagram channel is not connected");
    }

    const url = `${instagramGraphBase()}/me/messages`;
    const payload = {
      message: { text: trimmed },
      recipient: { id: conversation.contactAddress },
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
    let body: GraphSendResponse | null = null;
    try {
      body = text.length ? (JSON.parse(text) as GraphSendResponse) : null;
    } catch {
      body = null;
    }

    if (!res.ok) {
      const errMsg = body?.error?.message ?? `HTTP ${res.status}`;
      await ctx.runMutation(internal.instagramSend.internalRecordOutgoing, {
        conversationId: args.conversationId,
        channelId: channel._id,
        orgId: channel.orgId,
        orgAddress: channel.igUserId,
        contactAddress: conversation.contactAddress,
        content: trimmed,
        authorUserId: userId,
        externalId: undefined,
        status: "failed",
        failureReason: errMsg,
      });
      throw new Error(`Instagram send failed: ${errMsg}`);
    }

    const externalId = body?.message_id ?? body?.id;
    await ctx.runMutation(internal.instagramSend.internalRecordOutgoing, {
      conversationId: args.conversationId,
      channelId: channel._id,
      orgId: channel.orgId,
      orgAddress: channel.igUserId,
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
    if (conv.service !== "instagram") return null;
    if (!conv.channelId) return null;
    const channel = await ctx.db.get(conv.channelId);
    if (channel === null || channel.orgId !== args.orgId) return null;
    if (channel.service !== "instagram") return null;
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
      service: "instagram",
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
  id?: string;
  error?: { message?: string; code?: number; type?: string };
};
