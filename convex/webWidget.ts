import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import {
  ensureWidgetForAgent,
  generateWidgetIconUploadUrl,
  getWidgetForAgent,
  removeWidgetIcon,
  saveWidgetIcon,
  updateWidgetSettings,
} from "./webWidgetAdmin";
import {
  getEnabledSettingsByPublicKey,
  listMessagesForVisitor,
  publicConfigForSettings,
} from "./webWidgetCore";
import { ingestChannelMessage } from "./chat/threads";
import { inboxPromptContent } from "../shared/inboxAttachments";
import { inboxAiReplyPool } from "./inboxPools";
import {
  webWidgetLayoutValidator,
  webWidgetThemeValidator,
} from "./webWidgetValidators";
import { requestConversationAnalyticsRefresh } from "./analyticsRefreshRequest";
import { cancelOrScheduleWorkflowFollowUpForMessages } from "./workflowAutomationMessageActivity";

type ReceiveWidgetMessageArgs = {
  publicKey: string;
  visitorId: string;
  content: string;
  pageUrl?: string;
};

export const getForAgent = query({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    return await getWidgetForAgent(ctx, args.agentId);
  },
});

export const ensureForAgent = mutation({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    return await ensureWidgetForAgent(ctx, args.agentId);
  },
});

export const updateSettings = mutation({
  args: {
    agentId: v.id("agents"),
    agentDisplayName: v.optional(v.string()),
    placeholder: v.optional(v.string()),
    layout: v.optional(webWidgetLayoutValidator),
    theme: v.optional(webWidgetThemeValidator),
    hidePoweredBy: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await updateWidgetSettings(ctx, args);
  },
});

export const generateIconUploadUrl = mutation({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    return await generateWidgetIconUploadUrl(ctx, args.agentId);
  },
});

export const saveIcon = mutation({
  args: {
    agentId: v.id("agents"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await saveWidgetIcon(ctx, args);
  },
});

export const removeIcon = mutation({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    await removeWidgetIcon(ctx, args.agentId);
  },
});

export const publicGetConfig = query({
  args: {
    publicKey: v.string(),
  },
  handler: async (ctx, args) => {
    return await publicConfigForSettings(
      ctx,
      await getEnabledSettingsByPublicKey(ctx, args.publicKey),
    );
  },
});

export const publicListMessages = query({
  args: {
    publicKey: v.string(),
    visitorId: v.string(),
  },
  handler: async (ctx, args) => {
    return await listMessagesForVisitor(ctx, args);
  },
});

export const publicReceiveMessage = mutation({
  args: {
    publicKey: v.string(),
    visitorId: v.string(),
    content: v.string(),
    pageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await receiveWidgetMessage(ctx, args);
  },
});

export const internalGetConfig = internalQuery({
  args: {
    publicKey: v.string(),
  },
  handler: async (ctx, args) => {
    return await publicConfigForSettings(
      ctx,
      await getEnabledSettingsByPublicKey(ctx, args.publicKey),
    );
  },
});

export const internalListMessages = internalQuery({
  args: {
    publicKey: v.string(),
    visitorId: v.string(),
  },
  handler: async (ctx, args) => {
    return await listMessagesForVisitor(ctx, args);
  },
});

export const internalReceiveMessage = internalMutation({
  args: {
    publicKey: v.string(),
    visitorId: v.string(),
    content: v.string(),
    pageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await receiveWidgetMessage(ctx, args);
  },
});

async function receiveWidgetMessage(
  ctx: MutationCtx,
  args: ReceiveWidgetMessageArgs,
) {
  const settings = await getEnabledSettingsByPublicKey(ctx, args.publicKey);
  const trimmed = args.content.trim();
  if (!trimmed) {
    throw new Error("Message is required");
  }
  const result = await ingestChannelMessage(ctx, {
    channelId: settings.channelId,
    contactAddress: args.visitorId,
    contactName: "Website visitor",
    direction: "incoming",
    content: trimmed,
    contentType: "text",
    timestampMs: Date.now(),
    assignedAgentId: settings.agentId,
  });

  if (!result.skipped) {
    await requestConversationAnalyticsRefresh(ctx, result.conversationId);
    await cancelOrScheduleWorkflowFollowUpForMessages(ctx, {
      conversationId: result.conversationId,
      direction: "incoming",
      isHistorical: false,
      messageIds: result.messageIds,
    });
  }

  if (result.shouldEnqueueAi) {
    await inboxAiReplyPool.enqueueAction(
      ctx,
      internal.chat.inbox.generateAiReplyWorker,
      {
        conversationId: result.conversationId,
        promptContent: inboxPromptContent(trimmed),
        promptMessageId: result.agentMessageId,
      },
    );
  }

  return {
    conversationId: result.conversationId,
    agentMessageId: result.agentMessageId,
  };
}
