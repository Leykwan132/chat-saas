import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { getAuthContext } from "./authUtils";
import type { Doc } from "./_generated/dataModel";

export const WHATSAPP_DEMO_ACCESS_SENTINEL = "__whatsapp_demo__";
export const WHATSAPP_DEMO_CONVERSATION_TAG = "whatsapp_demo";
export const WHATSAPP_DEMO_PHONE_NUMBER_ID = "1121402084386768";
const WHATSAPP_DEMO_WABA_ID = "1457383175576319";
const WHATSAPP_DEMO_RECIPIENT = "60129499394";
const WHATSAPP_DEMO_TEMPLATE_LANGUAGE = "en_US";
const WHATSAPP_DEMO_TEMPLATE_NAME = "jaspers_market_plain_text_v1";

const DEFAULT_GRAPH_VERSION = "v25.0";

function graphVersion() {
  return process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
}

function graphBase() {
  return `https://graph.facebook.com/${graphVersion()}`;
}

function requireDemoAccessToken(): string {
  const token = process.env.WHATSAPP_DEMO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "WHATSAPP_DEMO_ACCESS_TOKEN is not set on this Convex deployment.",
    );
  }
  return token;
}

export function isDemoInboxChannel(
  channel: Pick<Doc<"channels">, "accessToken" | "phoneNumberId">,
): boolean {
  return (
    channel.accessToken === WHATSAPP_DEMO_ACCESS_SENTINEL ||
    channel.phoneNumberId === WHATSAPP_DEMO_PHONE_NUMBER_ID
  );
}

export function isDemoInboxConversation(
  conversation: Pick<Doc<"conversations">, "tags">,
): boolean {
  return (conversation.tags ?? []).includes(WHATSAPP_DEMO_CONVERSATION_TAG);
}

// Idempotent: removes seeded WhatsApp demo channel rows and their inbox threads.
export const clearInboxSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await getAuthContext(ctx);
    if (!orgId || orgId === "personal") {
      return { deletedConversations: 0, deletedChannels: 0 };
    }

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_orgId_and_service", (q) => q.eq("orgId", orgId))
      .collect();
    const demoChannels = channels.filter(isDemoInboxChannel);
    const demoChannelIds = new Set(demoChannels.map((channel) => channel._id));

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_orgId_and_lastMessageAt", (q) => q.eq("orgId", orgId))
      .collect();
    const demoConversations = conversations.filter(
      (conversation) =>
        isDemoInboxConversation(conversation) ||
        (conversation.channelId !== undefined &&
          demoChannelIds.has(conversation.channelId)),
    );

    for (const conversation of demoConversations) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversationId_and_createdAt", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .collect();
      for (const message of messages) {
        await ctx.db.delete(message._id);
      }

      const logs = await ctx.db
        .query("conversationLogs")
        .withIndex("by_conversationId", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .collect();
      for (const log of logs) {
        await ctx.db.delete(log._id);
      }

      await ctx.db.delete(conversation._id);
    }

    for (const channel of demoChannels) {
      await ctx.db.delete(channel._id);
    }

    return {
      deletedConversations: demoConversations.length,
      deletedChannels: demoChannels.length,
    };
  },
});

async function readGraphJson(res: Response): Promise<string> {
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text.length ? JSON.parse(text) : text;
  } catch {
    // keep raw
  }
  const formatted =
    typeof body === "string" ? body : JSON.stringify(body, null, 2);
  if (!res.ok) {
    throw new Error(`Graph API ${res.status}: ${formatted}`);
  }
  return formatted;
}

/** Create a WhatsApp message template via Cloud API (token from Convex env only). */
export const createDemoMessageTemplate = action({
  args: {
    name: v.string(),
    language: v.string(),
    category: v.string(),
    bodyText: v.string(),
    wabaId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ result: string }> => {
    await getAuthContext(ctx);
    const token = requireDemoAccessToken();
    const wabaId = args.wabaId?.trim() || WHATSAPP_DEMO_WABA_ID;
    const res = await fetch(
      `${graphBase()}/${wabaId}/message_templates`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: args.name.trim(),
          category: args.category.trim() || "UTILITY",
          language: args.language.trim() || WHATSAPP_DEMO_TEMPLATE_LANGUAGE,
          components: [{ type: "BODY", text: args.bodyText.trim() }],
        }),
      },
    );
    const result = await readGraphJson(res);
    return { result };
  },
});

/** List message templates for the demo WABA (token from Convex env only). */
export const listDemoMessageTemplates = action({
  args: { wabaId: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ result: string }> => {
    await getAuthContext(ctx);
    const token = requireDemoAccessToken();
    const wabaId = args.wabaId?.trim() || WHATSAPP_DEMO_WABA_ID;
    const res = await fetch(`${graphBase()}/${wabaId}/message_templates`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await readGraphJson(res);
    return { result };
  },
});

/** Send the pre-approved sample template message (demo number / recipient). */
export const sendDemoTemplateMessage = action({
  args: {
    templateName: v.optional(v.string()),
    templateLanguage: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ result: string }> => {
    await getAuthContext(ctx);
    const token = requireDemoAccessToken();
    const res = await fetch(
      `${graphBase()}/${WHATSAPP_DEMO_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: WHATSAPP_DEMO_RECIPIENT,
          type: "template",
          template: {
            name: args.templateName?.trim() || WHATSAPP_DEMO_TEMPLATE_NAME,
            language: {
              code:
                args.templateLanguage?.trim() || WHATSAPP_DEMO_TEMPLATE_LANGUAGE,
            },
          },
        }),
      },
    );
    const result = await readGraphJson(res);
    return { result };
  },
});
