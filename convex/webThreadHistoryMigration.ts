import { Migrations } from "@convex-dev/migrations";
import { listMessages } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import type { DataModel, Doc } from "./_generated/dataModel";
import {
  createThreadForConversation,
  saveAiReply,
  saveHumanReply,
  saveUserMessage,
} from "./chat/threads";
import { inferMediaMimeType } from "./chat/mediaUrlExtractor";

const migrations = new Migrations<DataModel>(components.migrations);

export const MAX_WEB_THREAD_BACKFILL_MESSAGES = 200;

type BackfillLedgerMessage = { agentMessageId?: string };

export function getWebThreadBackfillDecision({
  service,
  ledgerMessages,
  threadMessageIds,
}: {
  service: string;
  ledgerMessages: BackfillLedgerMessage[];
  threadMessageIds: string[];
}): "skip" | "complete" | "backfill" {
  if (service !== "web") return "skip";
  if (ledgerMessages.length > MAX_WEB_THREAD_BACKFILL_MESSAGES) {
    throw new Error(`Web conversation exceeds the safe limit of ${MAX_WEB_THREAD_BACKFILL_MESSAGES} messages`);
  }
  const threadMessageIdSet = new Set(threadMessageIds);
  const allLedgerMessagesArePresent = ledgerMessages.every(
    (message) =>
      message.agentMessageId !== undefined &&
      threadMessageIdSet.has(message.agentMessageId),
  );
  if (allLedgerMessagesArePresent) return "complete";
  if (threadMessageIds.length > 0) {
    throw new Error("Web conversation has a partial Agent thread");
  }
  return "backfill";
}

function messageText(message: Doc<"messages">): string {
  if (message.contentType === "text" || message.contentType === "unknown") {
    return message.content;
  }
  if (message.contentType === "image" && message.mediaUrl !== undefined) {
    return message.content === message.mediaUrl ? "" : message.content;
  }
  throw new Error(`Unsupported legacy web message content type: ${message.contentType}`);
}

function imageAttachment(message: Doc<"messages">) {
  if (message.contentType !== "image" || message.mediaUrl === undefined) {
    return undefined;
  }
  return { url: message.mediaUrl, mimeType: inferMediaMimeType(message.mediaUrl) };
}

async function saveLegacyWebMessage(
  ctx: Parameters<typeof saveUserMessage>[0],
  conversation: Doc<"conversations">,
  message: Doc<"messages">,
) {
  const text = messageText(message);
  const image = imageAttachment(message);
  if (message.direction === "incoming") {
    return await saveUserMessage(
      ctx,
      conversation.threadId,
      text,
      message.createdAt,
      image ? [image] : undefined,
    );
  }
  if (message.agentId !== undefined) {
    if (image !== undefined) {
      throw new Error("Cannot backfill an AI image message without its original thread metadata");
    }
    return await saveAiReply(
      ctx,
      conversation.threadId,
      text,
      conversation.assignedAgentId,
      message.createdAt,
    );
  }
  return await saveHumanReply(ctx, conversation.threadId, text, {
    assignedAgentId: conversation.assignedAgentId,
    authorUserId: message.authorUserId,
    sentAt: message.createdAt,
    images: image ? [image] : undefined,
    channelName: "Web",
  });
}

export const backfillWebConversationThreads = migrations.define({
  table: "conversations",
  batchSize: 5,
  migrateOne: async (ctx, conversation) => {
    if (
      conversation.service !== "web" ||
      conversation.threadHistoryBackfilledAt !== undefined
    ) {
      return;
    }
    const existingThread = await ctx.runQuery(
      components.agent.threads.getThread,
      { threadId: conversation.threadId },
    );
    const threadId = existingThread === null
      ? await createThreadForConversation(ctx, {
          orgId: conversation.orgId,
          contactName: conversation.contactName,
          contactAddress: conversation.contactAddress,
          service: conversation.service,
          userId: conversation.userId,
        })
      : conversation.threadId;
    if (threadId !== conversation.threadId) {
      await ctx.db.patch(conversation._id, { threadId, updatedAt: Date.now() });
    }
    const targetConversation = { ...conversation, threadId };
    const ledgerMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) =>
        q.eq("conversationId", conversation._id),
      )
      .order("asc")
      .take(MAX_WEB_THREAD_BACKFILL_MESSAGES + 1);
    const threadMessages = await listMessages(ctx, components.agent, {
      threadId,
      paginationOpts: {
        cursor: null,
        numItems: MAX_WEB_THREAD_BACKFILL_MESSAGES + 1,
      },
    });
    const decision = getWebThreadBackfillDecision({
      service: conversation.service,
      ledgerMessages,
      threadMessageIds: threadMessages.page.map((message) => message._id),
    });
    if (decision === "backfill") {
      for (const message of ledgerMessages) {
        const agentMessageId = await saveLegacyWebMessage(ctx, targetConversation, message);
        await ctx.db.patch(message._id, { agentMessageId });
      }
    }
    return { threadHistoryBackfilledAt: Date.now() };
  },
});

export const runBackfillWebConversationThreads = migrations.runner(
  internal.webThreadHistoryMigration.backfillWebConversationThreads,
);
