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
import { google } from "@ai-sdk/google";
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
): Promise<string> {
  const { messageId } = await saveMessage(ctx, components.agent, {
    threadId,
    message: { role: "user", content },
  });
  return messageId;
}

/**
 * Each outbound assistant message needs a distinct `order` in the agent
 * component. Consecutive assistant saves share an order and get merged in the
 * UI. We insert a hidden user "spacer" turn first, then attach the assistant
 * reply to that turn via `promptMessageId`.
 */
async function saveAssistantWithOwnOrder(
  ctx: MutationCtx,
  args: {
    threadId: string;
    content: string;
    outbound: InboxOutboundMeta;
  },
): Promise<string> {
  const { messageId: spacerId } = await saveMessage(ctx, components.agent, {
    threadId: args.threadId,
    message: { role: "user", content: INBOX_ORDER_SPACER_TEXT },
    metadata: { inboxOrderSpacer: true } as Record<string, unknown>,
  });

  const { messageId } = await saveMessage(ctx, components.agent, {
    threadId: args.threadId,
    agentName: args.outbound.agentName,
    message: { role: "assistant", content: args.content },
    promptMessageId: spacerId,
    metadata: { inboxOutbound: args.outbound } as Record<string, unknown>,
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
  },
): Promise<string> {
  const agentName = await resolveAssignedAgentName(ctx, opts.assignedAgentId);
  return await saveAssistantWithOwnOrder(ctx, {
    threadId,
    content,
    outbound: {
      agentName,
      sentByAi: false,
      ...(opts.authorUserId !== undefined
        ? { authorUserId: opts.authorUserId }
        : {}),
    },
  });
}

export async function saveAiReply(
  ctx: MutationCtx,
  threadId: string,
  content: string,
  assignedAgentId: Id<"agents"> | undefined,
): Promise<string> {
  const agentName = await resolveAssignedAgentName(ctx, assignedAgentId);
  return await saveAssistantWithOwnOrder(ctx, {
    threadId,
    content,
    outbound: {
      agentName,
      sentByAi: true,
    },
  });
}

export function buildAgent(
  agent: { name: string; model: string; systemPrompt: string },
  agentId: Id<"agents">,
  enableCitations: boolean = false,
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

  const instructions = `${agent.systemPrompt}

  ## Tool Usage — REQUIRED
  You have a \`fetchContext\` tool that searches the user's knowledge base. You MUST call it before responding to any question — no exceptions. Please pass the exact user original prompt to the \`fetchContext\` tool. Do not rely on your training data alone.

  ### Steps for every response:
  1. Call \`fetchContext\` with the user's original query
  2. Read the returned context carefully
  3. If relevant context is found: base your answer on it
  4. If no relevant context is found: explicitly tell the user ("I couldn't find relevant information in the company knowledge base") only then supplement with general knowledge
  ${citationBlock}`;

  return new Agent(components.agent, {
    name: agent.name,
    languageModel: google(agent.model),
    instructions,
    stopWhen: stepCountIs(6),
    tools,
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
      agentMessageId = await saveUserMessage(ctx, threadId, trimmedContent);
    } else {
      const conv = await ctx.db.get(conversationId);
      agentMessageId = await saveHumanReply(ctx, threadId, trimmedContent, {
        assignedAgentId: conv?.assignedAgentId ?? args.assignedAgentId,
        authorUserId: args.authorUserId,
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
