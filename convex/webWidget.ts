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
import {
  activateWebWidgetMode,
  removeTraditionalWidgetIcon,
  saveTraditionalWidgetIcon,
  updateTraditionalWidgetSettings,
} from "./webWidgetTraditional";
import { ingestChannelMessage } from "./chat/threads";
import { inboxPromptContent } from "../shared/inboxAttachments";
import { inboxAiReplyPool } from "./inboxPools";
import {
  webWidgetLayoutValidator,
  webWidgetModeValidator,
  webWidgetThemeValidator,
} from "./webWidgetValidators";
import { markConversationAnalyticsDirty } from "./analyticsDirtyRequest";
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

export const updateTraditionalSettings = mutation({
  args: {
    agentId: v.id("agents"),
    label: v.optional(v.string()),
    prefillMessage: v.optional(v.string()),
    hidePoweredBy: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await updateTraditionalWidgetSettings(ctx, args);
    return null;
  },
});

export const activateMode = mutation({
  args: {
    agentId: v.id("agents"),
    mode: webWidgetModeValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await activateWebWidgetMode(ctx, args);
    return null;
  },
});

export const saveTraditionalIcon = mutation({
  args: {
    agentId: v.id("agents"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await saveTraditionalWidgetIcon(ctx, args);
    return null;
  },
});

export const removeTraditionalIcon = mutation({
  args: {
    agentId: v.id("agents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await removeTraditionalWidgetIcon(ctx, args.agentId);
    return null;
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
    mode: v.optional(webWidgetModeValidator),
  },
  handler: async (ctx, args) => {
    return await publicConfigForSettings(
      ctx,
      await getEnabledSettingsByPublicKey(ctx, args.publicKey),
      args.mode,
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
    mode: v.optional(webWidgetModeValidator),
  },
  handler: async (ctx, args) => {
    return await publicConfigForSettings(
      ctx,
      await getEnabledSettingsByPublicKey(ctx, args.publicKey),
      args.mode,
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
  const receivedAt = Date.now();
  const result = await ingestChannelMessage(ctx, {
    channelId: settings.channelId,
    contactAddress: args.visitorId,
    contactName: "Website visitor",
    direction: "incoming",
    content: trimmed,
    contentType: "text",
    timestampMs: receivedAt,
    assignedAgentId: settings.agentId,
  });

  if (!result.skipped) {
    await markConversationAnalyticsDirty(ctx, {
      conversationId: result.conversationId,
      earliestDirtyMessageAt: receivedAt,
    });
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
