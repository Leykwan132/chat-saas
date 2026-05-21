import { v } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { components } from "../_generated/api";
import {
  createThread,
  saveMessage,
  Agent,
  stepCountIs,
  createTool,
} from "@convex-dev/agent";
import { openRouterModel } from "../llm/openRouter";
import { z } from "zod";
import { internal } from "../_generated/api";
import {
  INBOX_ORDER_SPACER_TEXT,
  type InboxOutboundMeta,
} from "./inboxMessageMapping";

const UNKNOWN_AGENT_NAME = "Unknown agent";

export async function resolveAssignedAgentName(
  ctx: MutationCtx,
  assignedAgentId: Id<"agents"> | undefined,
): Promise<string> {
  if (assignedAgentId === undefined) {
    return UNKNOWN_AGENT_NAME;
  }
  const agent = await ctx.db.get(assignedAgentId);
  const name = agent?.name?.trim();
  return name && name.length > 0 ? name : UNKNOWN_AGENT_NAME;
}

export function orgThreadUserId(orgId: string): string {
  return `org:${orgId}`;
}

export function conversationThreadTitle(
  contactName: string | undefined,
  contactAddress: string,
  service: string,
): string {
  return `${contactName ?? contactAddress} - ${service}`;
}

export async function createThreadForConversation(
  ctx: MutationCtx,
  args: {
    orgId: string;
    contactName?: string;
    contactAddress: string;
    service: string;
    userId?: string;
  },
): Promise<string> {
  const userId = args.userId ?? orgThreadUserId(args.orgId);
  const title = conversationThreadTitle(
    args.contactName,
    args.contactAddress,
    args.service,
  );
  return await createThread(ctx, components.agent, { userId, title });
}

export async function saveUserMessage(
  ctx: MutationCtx,
  threadId: string,
  content: string,
  sentAt: number = Date.now(),
): Promise<string> {
  const { messageId } = await saveMessage(ctx, components.agent, {
    threadId,
    message: { role: "user", content },
    metadata: { sentAt } as Record<string, unknown>,
  });
  return messageId;
}

/**
 * Each outbound assistant message needs a distinct `order` in the agent
 * component. Consecutive assistant saves share an order and get merged in the
 * UI. We insert a hidden user "spacer" turn first, then attach the assistant
 * reply to that turn via `promptMessageId`.
 */
type HumanReplyImage = { url: string; mimeType: string };

type HumanReplyMultimodalContent = Array<
  { type: "text"; text: string } | { type: "file"; data: string; mediaType: string }
>;

function buildHumanReplyTextAndImagesContent(
  text: string,
  images: HumanReplyImage[],
): HumanReplyMultimodalContent {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Text is required when saving text and images together");
  }
  if (images.length === 0) {
    throw new Error("At least one image is required when saving text and images together");
  }

  const imageParts = images.map((img) => ({
    type: "file" as const,
    data: img.url,
    mediaType: img.mimeType,
  }));

  return [{ type: "text" as const, text: trimmed }, ...imageParts];
}

function buildHumanReplyContent(
  text: string,
  images: HumanReplyImage[],
): string | HumanReplyMultimodalContent {
  const trimmed = text.trim();
  const imageParts = images.map((img) => ({
    type: "file" as const,
    data: img.url,
    mediaType: img.mimeType,
  }));

  if (imageParts.length === 0) {
    return trimmed;
  }
  if (trimmed.length === 0) {
    return imageParts;
  }
  return buildHumanReplyTextAndImagesContent(trimmed, images);
}

async function saveAssistantWithOwnOrder(
  ctx: MutationCtx,
  args: {
    threadId: string;
    content: string | HumanReplyMultimodalContent;
    sentAt: number;
    outbound: InboxOutboundMeta;
    messageMetadata?: Record<string, unknown>;
  },
): Promise<string> {
  const { messageId: spacerId } = await saveMessage(ctx, components.agent, {
    threadId: args.threadId,
    message: { role: "user", content: INBOX_ORDER_SPACER_TEXT },
    metadata: { inboxOrderSpacer: true, sentAt: args.sentAt } as Record<
      string,
      unknown
    >,
  });

  const { messageId } = await saveMessage(ctx, components.agent, {
    threadId: args.threadId,
    agentName: args.outbound.agentName,
    message: { role: "assistant", content: args.content },
    promptMessageId: spacerId,
    metadata: {
      sentAt: args.sentAt,
      inboxOutbound: args.outbound,
      ...args.messageMetadata,
    } as Record<string, unknown>,
  });
  return messageId;
}

export async function saveHumanReply(
  ctx: MutationCtx,
  threadId: string,
  content: string,
  opts: {
    assignedAgentId: Id<"agents"> | undefined;
    authorUserId?: string;
    sentAt?: number;
    images?: HumanReplyImage[];
  },
): Promise<string> {
  const agentName = await resolveAssignedAgentName(ctx, opts.assignedAgentId);
  const replyContent = buildHumanReplyContent(content, opts.images ?? []);
  return await saveAssistantWithOwnOrder(ctx, {
    threadId,
    content: replyContent,
    sentAt: opts.sentAt ?? Date.now(),
    outbound: {
      agentName,
      sentByAi: false,
      ...(opts.authorUserId !== undefined
        ? { authorUserId: opts.authorUserId }
        : {}),
    },
  });
}

/** One agent-thread message with image file part(s) and text (inbox caption + attachments). */
export async function saveHumanReplyTextAndImages(
  ctx: MutationCtx,
  threadId: string,
  text: string,
  images: HumanReplyImage[],
  opts: {
    assignedAgentId: Id<"agents"> | undefined;
    authorUserId?: string;
    sentAt?: number;
    clientIds?: string[];
  },
): Promise<string> {
  const agentName = await resolveAssignedAgentName(ctx, opts.assignedAgentId);
  const replyContent = buildHumanReplyTextAndImagesContent(text, images);
  const sentAt = opts.sentAt ?? Date.now();

  return await saveAssistantWithOwnOrder(ctx, {
    threadId,
    content: replyContent,
    sentAt,
    outbound: {
      agentName,
      sentByAi: false,
      ...(opts.authorUserId !== undefined
        ? { authorUserId: opts.authorUserId }
        : {}),
    },
    messageMetadata:
      opts.clientIds !== undefined && opts.clientIds.length > 0
        ? { clientIds: opts.clientIds }
        : undefined,
  });
}

export async function saveAiReply(
  ctx: MutationCtx,
  threadId: string,
  content: string,
  assignedAgentId: Id<"agents"> | undefined,
  sentAt: number = Date.now(),
  opts?: {
    messageMetadata?: Record<string, unknown>;
  },
): Promise<string> {
  const agentName = await resolveAssignedAgentName(ctx, assignedAgentId);
  return await saveAssistantWithOwnOrder(ctx, {
    threadId,
    content,
    sentAt,
    outbound: {
      agentName,
      sentByAi: true,
    },
    messageMetadata: opts?.messageMetadata,
  });
}

export { inferMediaMimeType } from "./mediaUrlExtractor";

export function buildAgent(
  agent: { name: string; model: string; systemPrompt: string },
  agentId: Id<"agents">,
  enableCitations: boolean = false,
  mediaCollections: string[] = [],
) {
  const tools = {
    fetchContext: createTool({
      description:
        "MUST be called before answering ANY user question. Searches the knowledge base (uploaded documents, Q&A pairs, web references) for relevant context. Always call this first — even if you think you know the answer.",
      inputSchema: z.object({
        query: z.string().describe("The exact user original query"),
      }),
      execute: async (ctx, { query }) => {
        const result = await ctx.runAction(internal.cloudflare.internalSearch, {
          agentId,
          query,
        });
        return result;
      },
    }),
    sendMedia: createTool({
      description:
        "Retrieves media assets (images, PDFs) from a specific collection to send to the customer. Call when the customer's question relates to an available media collection. You MUST include the returned clientId values in your response formatted as [MEDIA:clientId] so they are sent as attachments.",
      inputSchema: z.object({
        collectionName: z.string().describe("The exact collection name to retrieve media from"),
      }),
      execute: async (ctx, { collectionName }) => {
        const result = await ctx.runQuery(
          internal.knowledgeBaseImages.internalListReadyByCollection,
          { agentId, collectionName },
        );
        return result;
      },
    }),
  };

  const citationBlock = enableCitations
    ? `\n\nWhen responding, include:
- A comprehensive paragraph with inline citations marked as [1], [2], etc.
- 2-3 citations with realistic source information
- Each citation MUST have a {title: "", url: "", description: ""} JSON object. If ANY of them doesn't exist, leave it as empty string "" for that key. 
- If it's a file, the URL value must start with https://kilobot.app/{{fileName}}
- The description key MUST contain a short summary of the content from the source. 
- Make the content informative and the sources credible
Format citations as numbered references within the text. Use only sources found via \`fetchContext\` — do not fabricate sources.
- This is citations section, not references. Must use the keyword Citations.`
    : "";

  const mediaBlock = mediaCollections.length > 0
    ? `\n\n## Send Media to Customer
You have media collections that can be sent directly to the customer as attachments.
Available collections: ${mediaCollections.map(c => `"${c}"`).join(", ")}

When the customer asks about something that matches one of these collections:
1. Call \`sendMedia\` with the exact collection name.
2. Include the returned clientId values in your response using the format: [MEDIA:clientId]
3. If \`fetchContext\` returned no relevant text, send the media with one short, friendly sentence to identify it (e.g. from the collection name). Do NOT describe what the file shows, what it is useful for, or any details not in \`fetchContext\`.
Do NOT fabricate clientIds or URLs. Only use clientIds returned by the \`sendMedia\` tool.
If \`sendMedia\` returns assets for a matching collection, that counts as a successful answer — never say you couldn't find anything.`
    : "";

  const toneBlock = `\n\n## Tone
- Be warm, friendly, and conversational — like a helpful colleague, not a robot or search engine.
- Use natural, approachable phrasing. Brief is fine, but never sound cold, stiff, or overly formal.
- When you can help, sound glad to assist. When you can't, say so kindly (e.g. "Sorry, I'm not sure about that" or "I don't have that info — let me know if there's something else I can help with").
- Friendliness comes from how you say things, not from adding extra facts you don't have.`;

  const groundingBlock = `\n\n## Grounding — REQUIRED
- Only state facts that come directly from \`fetchContext\` results or explicit tool metadata (collection name, filename, etc.).
- Do NOT invent details, generic explanations, or filler about attachments or topics.
- Do NOT describe media contents, room layouts, dimensions, benefits, or implications unless \`fetchContext\` provided that information.
- Do NOT pad responses with obvious or generic statements. Prefer short, direct replies.
- Never mention internal tools, searches, or a "knowledge base" to the user.
- If tools returned nothing useful, reply briefly and honestly — but stay friendly. Do not guess or elaborate.`;

  const toolSteps = mediaCollections.length > 0
    ? `  ### Steps for every response:
  1. Call \`fetchContext\` with the user's original query
  2. If the question matches an available media collection, call \`sendMedia\` with the exact collection name
  3. Read the returned context and any media assets carefully
  4. Reply using ONLY what the tools returned. If only media was found, send it with a brief, friendly label — nothing more.
  5. Only if BOTH \`fetchContext\` returned nothing relevant AND \`sendMedia\` returned no matching assets: give a short, natural reply that you don't have that information`
    : `  ### Steps for every response:
  1. Call \`fetchContext\` with the user's original query
  2. Read the returned context carefully
  3. If relevant context is found: answer using only that context
  4. If no relevant context is found: give a short, natural reply that you don't have that information. Do not guess or add filler`;

  const instructions = `${agent.systemPrompt}

  ## Tool Usage — REQUIRED
  You have a \`fetchContext\` tool that searches the user's knowledge base. You MUST call it before responding to any question — no exceptions. Please pass the exact user original prompt to the \`fetchContext\` tool. Do not rely on your training data alone.

${toolSteps}${toneBlock}${groundingBlock}
  ${citationBlock}${mediaBlock}`;

  return new Agent(components.agent, {
    name: agent.name,
    languageModel: openRouterModel(agent.model),
    instructions,
    stopWhen: stepCountIs(6),
    tools,
    rawRequestResponseHandler: async () => {
      // console.log("request", request);
      // console.log("response", response);
    },
  });
}

export function normalizeLabel(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

export function resolveSyncMessageDirection(
  channel: Doc<"channels">,
  message: {
    from?: { id?: string; name?: string; username?: string };
  },
): boolean {
  const channelLabel = normalizeLabel(channel.displayUsername);
  const fromName = normalizeLabel(
    message.from?.name ?? message.from?.username,
  );
  const isOutgoingByName =
    channelLabel.length > 0 && fromName.length > 0 && fromName === channelLabel;

  const isOutgoingById =
    (channel.pageId !== undefined && message.from?.id === channel.pageId) ||
    (channel.igUserId !== undefined && message.from?.id === channel.igUserId);

  return isOutgoingByName || isOutgoingById;
}

export function businessAgentName(channel: Doc<"channels">): string {
  return channel.displayUsername?.trim() || "Support Team";
}

const contentTypeValidator = v.union(
  v.literal("text"),
  v.literal("image"),
  v.literal("audio"),
  v.literal("video"),
  v.literal("document"),
  v.literal("unknown"),
);

const directionValidator = v.union(
  v.literal("incoming"),
  v.literal("outgoing"),
);

export const ingestChannelMessageArgs = {
  channelId: v.id("channels"),
  externalId: v.optional(v.string()),
  contactAddress: v.string(),
  contactName: v.optional(v.string()),
  direction: directionValidator,
  content: v.string(),
  contentType: v.optional(contentTypeValidator),
  timestampMs: v.number(),
  isHistorical: v.optional(v.boolean()),
  assignedAgentId: v.optional(v.id("agents")),
  authorUserId: v.optional(v.string()),
  humanAgentName: v.optional(v.string()),
};

export type IngestChannelMessageArgs = {
  channelId: Id<"channels">;
  externalId?: string;
  contactAddress: string;
  contactName?: string;
  direction: "incoming" | "outgoing";
  content: string;
  contentType?: Doc<"messages">["contentType"];
  timestampMs: number;
  isHistorical?: boolean;
  assignedAgentId?: Id<"agents">;
  authorUserId?: string;
  humanAgentName?: string;
};

export async function ingestChannelMessage(
  ctx: MutationCtx,
  args: IngestChannelMessageArgs,
): Promise<{
  conversationId: Id<"conversations">;
  skipped: boolean;
  shouldEnqueueAi?: boolean;
}> {
  if (args.externalId) {
    const existingLedger = await ctx.db
      .query("messages")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();
    if (existingLedger !== null) {
      return {
        conversationId: existingLedger.conversationId,
        skipped: true,
        shouldEnqueueAi: false,
      };
    }
  }

  const channel = await ctx.db.get(args.channelId);
  if (channel === null) {
    throw new Error("Channel not found");
  }

  const service = channel.service;
  if (
    service !== "whatsapp" &&
    service !== "instagram" &&
    service !== "messenger"
  ) {
    throw new Error(`Unsupported channel service: ${service}`);
  }

  const customerId: Id<"customers"> = await ctx.runMutation(
    internal.customers.internalUpsertFromWebhook,
    {
      orgId: channel.orgId,
      service,
      contactAddress: args.contactAddress,
      profileName: args.contactName,
    },
  );

  const orgAddress =
    channel.phoneNumberId ?? channel.igUserId ?? channel.pageId ?? "";

  const { conversationId, threadId } = await upsertInboxConversation(ctx, {
    orgId: channel.orgId,
    channelId: channel._id,
    service,
    orgAddress,
    contactAddress: args.contactAddress,
    contactName: args.contactName,
    customerId,
    lastMessageAt: args.timestampMs,
    preview: args.content.slice(0, 140),
    isIncoming: args.direction === "incoming",
    assignedAgentId: args.assignedAgentId,
  });

  let agentMessageId: string | undefined;
  const trimmedContent = args.content.trim();
  if (trimmedContent.length > 0) {
    if (args.direction === "incoming") {
      agentMessageId = await saveUserMessage(
        ctx,
        threadId,
        trimmedContent,
        args.timestampMs,
      );
    } else {
      const conv = await ctx.db.get(conversationId);
      agentMessageId = await saveHumanReply(ctx, threadId, trimmedContent, {
        assignedAgentId: conv?.assignedAgentId ?? args.assignedAgentId,
        authorUserId: args.authorUserId,
        sentAt: args.timestampMs,
      });
    }
  }

  await ctx.db.insert("messages", {
    orgId: channel.orgId,
    conversationId,
    channelId: channel._id,
    service,
    externalId: args.externalId,
    orgAddress,
    contactAddress: args.contactAddress,
    direction: args.direction,
    authorUserId: args.authorUserId,
    contentType: args.contentType ?? "text",
    content: args.content,
    agentMessageId,
    status: args.direction === "outgoing" ? "sent" : undefined,
    createdAt: args.timestampMs,
  });

  await ctx.runMutation(internal.customers.internalSetLastConversation, {
    customerId,
    conversationId,
  });

  return {
    conversationId,
    skipped: false,
    shouldEnqueueAi:
      !args.isHistorical &&
      args.direction === "incoming" &&
      Boolean(agentMessageId && trimmedContent.length > 0),
  };
}

async function upsertInboxConversation(
  ctx: MutationCtx,
  args: {
    orgId: string;
    channelId: Id<"channels">;
    service: "whatsapp" | "instagram" | "messenger";
    orgAddress: string;
    contactAddress: string;
    contactName?: string;
    customerId: Id<"customers">;
    lastMessageAt: number;
    preview: string;
    isIncoming: boolean;
    assignedAgentId?: Id<"agents">;
  },
): Promise<{ conversationId: Id<"conversations">; threadId: string }> {
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
    const threadId = await createThreadForConversation(ctx, {
      orgId: args.orgId,
      contactName: args.contactName,
      contactAddress: args.contactAddress,
      service: args.service,
    });

    const conversationId = await ctx.db.insert("conversations", {
      orgId: args.orgId,
      channelId: args.channelId,
      service: args.service,
      orgAddress: args.orgAddress,
      contactAddress: args.contactAddress,
      contactName: args.contactName,
      customerId: args.customerId,
      status: "open",
      tags: [],
      assignToAiAgent: true,
      assignedAgentId: args.assignedAgentId,
      threadId,
      lastMessageAt: args.lastMessageAt,
      lastMessagePreview: args.preview,
      lastCustomerMessageAt: args.isIncoming ? args.lastMessageAt : undefined,
      unreadCount: args.isIncoming ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    });

    return { conversationId, threadId };
  }

  const patch: Record<string, unknown> = {
    lastMessageAt: args.lastMessageAt,
    lastMessagePreview: args.preview,
    unreadCount: args.isIncoming ? existing.unreadCount + 1 : existing.unreadCount,
    updatedAt: now,
  };
  if (args.isIncoming) {
    patch.lastCustomerMessageAt = args.lastMessageAt;
  }
  if (!existing.contactName && args.contactName) {
    patch.contactName = args.contactName;
  }
  if (!existing.customerId) {
    patch.customerId = args.customerId;
  }
  if (existing.status === "closed") patch.status = "open";
  if (!existing.assignedAgentId && args.assignedAgentId) {
    patch.assignedAgentId = args.assignedAgentId;
  }
  await ctx.db.patch(existing._id, patch);

  return { conversationId: existing._id, threadId: existing.threadId };
}
