import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { getAuthContext } from "./authUtils";
import type { Id } from "./_generated/dataModel";
import {
  createThreadForConversation,
  saveUserMessage,
} from "./chat/threads";
import { logConversationEvent } from "./conversationLogs";

const WHATSAPP_DEMO_ACCESS_SENTINEL = "__whatsapp_demo__";
const WHATSAPP_DEMO_CONVERSATION_TAG = "whatsapp_demo";
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

const WELCOME_COPY =
  "This is a demo WhatsApp thread for the Cloud API sample number. Outbound messages from the composer use WHATSAPP_DEMO_ACCESS_TOKEN on Convex (freeform text inside Meta’s customer-care window). Open Channels, click your connected WhatsApp number, then Message templates to create templates via Convex (token never leaves the server).";

// Idempotent: ensures one demo WhatsApp channel + one demo conversation for
// review / Meta approval flows. Skips if the org already has a non-demo
// WhatsApp channel connected with a real system user token.
export const ensureInbox = mutation({
  args: {},
  handler: async (
    ctx,
  ): Promise<
    | { status: "ready"; channelId: Id<"channels">; conversationId: Id<"conversations"> }
    | { status: "skipped_real_whatsapp" }
    | { status: "no_organization" }
  > => {
    const { orgId, userId } = await getAuthContext(ctx);
    if (!orgId) {
      return { status: "no_organization" };
    }

    const existing = (
      await ctx.db
        .query("channels")
        .withIndex("by_orgId_and_service", (q) =>
          q.eq("orgId", orgId).eq("service", "whatsapp"),
        )
        .collect()
    ).find((c) => c.phoneNumberId === WHATSAPP_DEMO_PHONE_NUMBER_ID) ?? null;

    if (existing !== null) {
      const token = existing.accessToken?.trim() ?? "";
      const hasNonDemoCredentials =
        token.length > 0 && token !== WHATSAPP_DEMO_ACCESS_SENTINEL;
      if (hasNonDemoCredentials) {
        return { status: "skipped_real_whatsapp" };
      }
    }

    const now = Date.now();
    const channelPatch = {
      wabaId: WHATSAPP_DEMO_WABA_ID,
      phoneNumberId: WHATSAPP_DEMO_PHONE_NUMBER_ID,
      displayPhoneNumber: "Demo — WhatsApp Cloud API",
      accessToken: WHATSAPP_DEMO_ACCESS_SENTINEL,
      tokenExpiresAt: undefined,
      status: "connected" as const,
      progressStep: undefined,
      lastError: undefined,
      connectedByUserId: userId,
      updatedAt: now,
    };

    let channelId: Id<"channels">;
    if (existing === null) {
      channelId = await ctx.db.insert("channels", {
        orgId,
        service: "whatsapp",
        ...channelPatch,
        createdAt: now,
      });
    } else {
      channelId = existing._id;
      await ctx.db.patch(channelId, channelPatch);
    }

    const existingConv = await ctx.db
      .query("conversations")
      .withIndex("by_channel_and_contactAddress", (q) =>
        q.eq("channelId", channelId).eq("contactAddress", WHATSAPP_DEMO_RECIPIENT),
      )
      .unique();

    if (existingConv !== null) {
      const tags = existingConv.tags ?? [];
      if (!tags.includes(WHATSAPP_DEMO_CONVERSATION_TAG)) {
        await ctx.db.patch(existingConv._id, {
          tags: [...tags, WHATSAPP_DEMO_CONVERSATION_TAG],
          updatedAt: now,
        });
      }
      return {
        status: "ready",
        channelId,
        conversationId: existingConv._id,
      };
    }

    const threadId = await createThreadForConversation(ctx, {
      orgId,
      contactName: "Demo customer",
      contactAddress: WHATSAPP_DEMO_RECIPIENT,
      service: "whatsapp",
      userId,
    });

    const agentMessageId = await saveUserMessage(ctx, threadId, WELCOME_COPY, now);

    const conversationId = await ctx.db.insert("conversations", {
      orgId,
      channelId,
      service: "whatsapp",
      orgAddress: WHATSAPP_DEMO_PHONE_NUMBER_ID,
      contactAddress: WHATSAPP_DEMO_RECIPIENT,
      contactName: "Demo customer",
      status: "open",
      tags: [WHATSAPP_DEMO_CONVERSATION_TAG],
      assignToAiAgent: true,
      threadId,
      lastMessageAt: now,
      lastMessagePreview: WELCOME_COPY.slice(0, 140),
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await logConversationEvent(ctx, {
      conversationId,
      action: "thread_created",
      actor: {
        type: "user",
        userId,
      },
      metadata: {
        service: "whatsapp",
      },
    });

    await ctx.db.insert("messages", {
      orgId,
      conversationId,
      channelId,
      service: "whatsapp",
      externalId: undefined,
      orgAddress: WHATSAPP_DEMO_PHONE_NUMBER_ID,
      contactAddress: WHATSAPP_DEMO_RECIPIENT,
      direction: "incoming",
      contentType: "text",
      content: WELCOME_COPY,
      agentMessageId,
      createdAt: now,
    });

    return { status: "ready", channelId, conversationId };
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
