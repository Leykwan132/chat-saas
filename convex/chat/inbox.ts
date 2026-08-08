import { v } from "convex/values";
import {
  query,
  internalMutation,
  internalAction,
  internalQuery,
  type MutationCtx,
} from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { INBOX_IMAGE_PLACEHOLDER } from "../../shared/inboxAttachments";
import { components } from "../_generated/api";
import { syncStreams, vStreamArgs } from "@convex-dev/agent";
import { messageDocsToInboxUIMessages, listMessages, getChannelName } from "./inboxMessageMapping";
import { paginationOptsValidator } from "convex/server";
import { getAuthContext } from "../authUtils";
import {
  ingestChannelMessage,
  ingestChannelMessageArgs,
  saveHumanReply,
  saveHumanReplyTextAndImages,
  buildAgent,
  saveAiReply,
  inferMediaMimeType,
} from "./threads";
import { metaIndicatorPool } from "../inboxPools";
import { toChannelMediaItems } from "./aiReplyMedia";
import {
  generateWorkflowActionPlan,
  hasWorkflowActionMatches,
  resolveWorkflowActionPlanMedia,
  resolveWorkflowActionPlanText,
  workflowActionPlanReplyPromptArgs,
} from "./workflowActionPlanner";
import { checkAiFeature } from "../plans";
import { logConversationEvent } from "../conversationLogs";
import { recordAiAssistedConversationAggregate } from "../agentOverviewAggregates";
import { normalizeCustomerFacingResponseFormatting } from "./responseFormatting";
import { aiReplyOutputSchema } from "./aiReplyOutput";
import type { ChannelMediaItem } from "./channelSend";
import {
  ensureWorkflowForAgent,
  workflowHasHumanEscalationNode,
} from "../workflowCore";
import { handleWorkflowFollowUpOutbound } from "../workflowFollowUpRuntime";
import { markConversationAnalyticsDirty } from "../analyticsDirtyRequest";
import { canProcessWorkspaceActivity } from "../teamDeletion/access";
import { notifyHumanEscalation } from "../telegramNotifications/events";

const channelMediaItemValidator = v.object({
  url: v.string(),
  mediaType: v.string(),
  filename: v.optional(v.string()),
});

function contentTypeForMediaItem(item: ChannelMediaItem) {
  const mediaType = item.mediaType ?? inferMediaMimeType(item.url);
  if (mediaType.startsWith("image/")) return "image" as const;
  if (mediaType.startsWith("video/")) return "video" as const;
  if (
    mediaType === "application/pdf" ||
    mediaType.includes("wordprocessingml") ||
    mediaType.includes("spreadsheetml") ||
    mediaType.includes("presentationml") ||
    mediaType === "application/msword" ||
    mediaType === "application/vnd.ms-excel" ||
    mediaType === "application/vnd.ms-powerpoint"
  ) {
    return "document" as const;
  }
  return "file" as const;
}

export const internalIngestChannelMessage = internalMutation({
  args: ingestChannelMessageArgs,
  handler: async (ctx, args) => {
    return await ingestChannelMessage(ctx, args);
  },
});

export const internalIngestHistoricalChannelMessage = internalMutation({
  args: ingestChannelMessageArgs,
  handler: async (ctx, args) => {
    return await ingestChannelMessage(ctx, args);
  },
});

async function latestIncomingExternalId(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
): Promise<string | undefined> {
  const recent = await ctx.db
    .query("messages")
    .withIndex("by_conversationId_and_createdAt", (q) =>
      q.eq("conversationId", conversationId),
    )
    .order("desc")
    .take(50);
  return recent.find((m) => m.direction === "incoming" && m.externalId)
    ?.externalId;
}

function replyPersistResult(
  agentMessageId: string,
  markedRead: boolean,
  latestInboundExternalId?: string,
) {
  return latestInboundExternalId
    ? { agentMessageId, markedRead, latestInboundExternalId }
    : { agentMessageId, markedRead };
}

export const internalPersistHumanReply = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    authorUserId: v.string(),
    externalId: v.optional(v.string()),
    images: v.optional(
      v.array(
        v.object({
          publicUrl: v.string(),
          mediaType: v.string(),
        }),
      ),
    ),
    clientIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null) {
      throw new Error("Conversation not found");
    }
    if (!(await canProcessWorkspaceActivity(ctx, conv.orgId))) {
      throw new Error("Workspace unavailable");
    }
    if (conv.assignedAgentId === undefined) {
      throw new Error("Conversation has no assigned agent");
    }

    const channel = conv.channelId ? await ctx.db.get(conv.channelId) : null;
    const orgAddress =
      channel?.phoneNumberId ?? channel?.igUserId ?? channel?.pageId ?? conv.orgAddress;

    const trimmed = args.content.trim();
    const images = args.images ?? [];
    const sentAt = Date.now();
    const humanReplyImages = images.map((img) => ({
      url: img.publicUrl,
      mimeType: img.mediaType,
    }));

    const agentMessageId =
      trimmed.length > 0 && humanReplyImages.length > 0
        ? await saveHumanReplyTextAndImages(
            ctx,
            conv.threadId,
            trimmed,
            humanReplyImages,
            {
              assignedAgentId: conv.assignedAgentId,
              authorUserId: args.authorUserId,
              sentAt,
              clientIds: args.clientIds,
              channelName: channel ? getChannelName(channel) : undefined,
            },
          )
        : await saveHumanReply(ctx, conv.threadId, trimmed, {
            assignedAgentId: conv.assignedAgentId,
            authorUserId: args.authorUserId,
            sentAt,
            images: humanReplyImages,
            channelName: channel ? getChannelName(channel) : undefined,
          });

    const now = Date.now();
    let latestMessageId: Id<"messages"> | undefined;
    for (const img of images) {
      latestMessageId = await ctx.db.insert("messages", {
        orgId: conv.orgId,
        conversationId: conv._id,
        channelId: conv.channelId,
        service: conv.service,
        externalId: args.externalId,
        orgAddress,
        contactAddress: conv.contactAddress,
        direction: "outgoing",
        authorUserId: args.authorUserId,
        contentType: "image",
        content: img.publicUrl,
        mediaUrl: img.publicUrl,
        agentMessageId,
        status: "sent",
        createdAt: now,
      });
    }

    if (trimmed.length > 0) {
      latestMessageId = await ctx.db.insert("messages", {
        orgId: conv.orgId,
        conversationId: conv._id,
        channelId: conv.channelId,
        service: conv.service,
        externalId: args.externalId,
        orgAddress,
        contactAddress: conv.contactAddress,
        direction: "outgoing",
        authorUserId: args.authorUserId,
        contentType: "text",
        content: trimmed,
        agentMessageId,
        status: "sent",
        createdAt: now,
      });
    }

    const preview =
      trimmed.length > 0
        ? trimmed.slice(0, 140)
        : images.length > 0
          ? "Image"
          : "";

    const markedRead = conv.unreadCount > 0;
    const patch: Partial<Doc<"conversations">> = {
      lastMessageAt: now,
      unreadCount: 0,
      updatedAt: now,
    };
    if (preview && preview.trim() !== "") {
      patch.lastMessagePreview = preview;
    }
    if (conv.status === "requires_user_input") {
      patch.status = "open";
      patch.escalation = undefined;
    }
    await ctx.db.patch(conv._id, patch);
    await markConversationAnalyticsDirty(ctx, {
      conversationId: conv._id,
      earliestDirtyMessageAt: now,
    });
    if (latestMessageId) await handleWorkflowFollowUpOutbound(ctx, latestMessageId);

    return replyPersistResult(
      agentMessageId,
      markedRead,
      markedRead ? await latestIncomingExternalId(ctx, conv._id) : undefined,
    );
  },
});

export const internalPersistAiReply = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    threadId: v.string(),
    content: v.string(),
    externalId: v.optional(v.string()),
    llmModel: v.optional(v.string()),
    creditsCharged: v.optional(v.number()),
    sourceEventId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null) return null;
    if (!(await canProcessWorkspaceActivity(ctx, conv.orgId))) return null;

    const normalizedContent = normalizeCustomerFacingResponseFormatting(args.content);
    const trimmed = normalizedContent.trim();
    const now = Date.now();
    const messageMetadata =
      args.llmModel !== undefined
        ? {
            llmModel: args.llmModel,
            creditsCharged: args.creditsCharged ?? 0,
          }
        : undefined;

    const agentMessageId = await saveAiReply(
      ctx,
      args.threadId,
      trimmed,
      conv.assignedAgentId,
      now,
      { messageMetadata },
    );

    const channel = conv.channelId ? await ctx.db.get(conv.channelId) : null;
    const orgAddress =
      channel?.phoneNumberId ?? channel?.igUserId ?? channel?.pageId ?? conv.orgAddress;

    const messageId = await ctx.db.insert("messages", {
      orgId: conv.orgId,
      conversationId: conv._id,
      channelId: conv.channelId,
      service: conv.service,
      externalId: args.externalId,
      orgAddress,
      contactAddress: conv.contactAddress,
      direction: "outgoing",
      agentId: conv.assignedAgentId,
      contentType: "text",
      content: trimmed,
      agentMessageId,
      sourceEventId: args.sourceEventId,
      llmModel: args.llmModel,
      creditsCharged: args.creditsCharged,
      status: "sent",
      createdAt: now,
    });
    if (conv.assignedAgentId !== undefined) {
      await recordAiAssistedConversationAggregate(ctx, {
        conversation: conv,
        agentId: conv.assignedAgentId,
        timestamp: now,
      });
    }

    const markedRead = conv.unreadCount > 0;
    const patch: Partial<Doc<"conversations">> = {
      lastMessageAt: now,
      unreadCount: 0,
      updatedAt: now,
    };
    const preview = trimmed.slice(0, 140);
    if (preview && preview.trim() !== "") {
      patch.lastMessagePreview = preview;
    }
    await ctx.db.patch(conv._id, patch);
    await markConversationAnalyticsDirty(ctx, {
      conversationId: conv._id,
      earliestDirtyMessageAt: now,
    });
    await handleWorkflowFollowUpOutbound(ctx, messageId);

    return replyPersistResult(
      agentMessageId,
      markedRead,
      markedRead ? await latestIncomingExternalId(ctx, conv._id) : undefined,
    );
  },
});

export const internalPersistAiMediaReply = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    threadId: v.string(),
    mediaUrls: v.array(v.string()),
    mediaItems: v.optional(v.array(channelMediaItemValidator)),
    externalIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null) return null;
    if (!(await canProcessWorkspaceActivity(ctx, conv.orgId))) return null;

    const now = Date.now();
    const channel = conv.channelId ? await ctx.db.get(conv.channelId) : null;
    const orgAddress =
      channel?.phoneNumberId ?? channel?.igUserId ?? channel?.pageId ?? conv.orgAddress;

    const mediaItems = args.mediaItems ?? args.mediaUrls.map((url) => ({
      url,
      mediaType: inferMediaMimeType(url),
    }));
    const inboxAttachments = mediaItems.map((item) => ({
      url: item.url,
      mediaType: item.mediaType ?? inferMediaMimeType(item.url),
      type: "image" as const,
    }));
    const agentMessageId = await saveAiReply(
      ctx,
      args.threadId,
      INBOX_IMAGE_PLACEHOLDER,
      conv.assignedAgentId,
      now,
      { inboxAttachments },
    );
    let latestMessageId: Id<"messages"> | undefined;

    for (let i = 0; i < mediaItems.length; i++) {
      const item = mediaItems[i]!;
      const externalId = args.externalIds[i] ?? undefined;
      latestMessageId = await ctx.db.insert("messages", {
        orgId: conv.orgId,
        conversationId: conv._id,
        channelId: conv.channelId,
        service: conv.service,
        externalId,
        orgAddress,
        contactAddress: conv.contactAddress,
        direction: "outgoing",
        agentId: conv.assignedAgentId,
        contentType: contentTypeForMediaItem(item),
        content: item.url,
        mediaUrl: item.url,
        agentMessageId,
        status: "sent",
        createdAt: now,
      });
    }
    if (conv.assignedAgentId !== undefined) {
      await recordAiAssistedConversationAggregate(ctx, {
        conversation: conv,
        agentId: conv.assignedAgentId,
        timestamp: now,
      });
    }

    const markedRead = conv.unreadCount > 0;
    await ctx.db.patch(conv._id, {
      lastMessageAt: now,
      lastMessagePreview: "📎 Media",
      unreadCount: 0,
      updatedAt: now,
    });
    await markConversationAnalyticsDirty(ctx, {
      conversationId: conv._id,
      earliestDirtyMessageAt: now,
    });
    if (latestMessageId) await handleWorkflowFollowUpOutbound(ctx, latestMessageId);

    return replyPersistResult(
      agentMessageId,
      markedRead,
      markedRead ? await latestIncomingExternalId(ctx, conv._id) : undefined,
    );
  },
});

export const internalEscalateConversation = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    question: v.string(),
    context: v.string(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv?.assignedAgentId) return;

    const agent = await ctx.db.get(conv.assignedAgentId);
    if (agent === null) {
      return;
    }
    const workflow = await ensureWorkflowForAgent(ctx, agent);
    const escalationAvailable = await workflowHasHumanEscalationNode(ctx, workflow._id);
    if (!escalationAvailable) {
      return;
    }
    const now = Date.now();
    await ctx.db.patch(args.conversationId, {
      status: "requires_user_input",
      assignToAiAgent: false,
      escalation: {
        question: args.question,
        context: args.context,
        escalatedAt: now,
      },
      updatedAt: now,
    });
    await logConversationEvent(ctx, {
      conversationId: args.conversationId,
      action: "escalation_raised",
      actor: {
        type: "ai",
        name: agent.name,
        agentId: agent._id,
      },
      metadata: {
        question: args.question,
      },
    });
    await markConversationAnalyticsDirty(ctx, {
      conversationId: args.conversationId,
    });
    await notifyHumanEscalation(ctx, agent._id, args.conversationId, agent.name);
  },
});

export const generateAiReplyWorker = internalAction({
  args: {
    conversationId: v.id("conversations"),
    promptContent: v.optional(v.string()),
    promptMessageId: v.optional(v.string()),
    inboundExternalId: v.optional(v.string()),
    avatarSourceEventId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.promptMessageId && !args.promptContent) {
      throw new Error("Either promptMessageId or promptContent must be provided");
    }
    const conv = await ctx.runQuery(internal.chat.inbox.internalGetConversation, {
      conversationId: args.conversationId,
    });
    if (
      conv === null ||
      !conv.assignToAiAgent ||
      !conv.assignedAgentId
    ) {
      return;
    }
    if (
      !(await ctx.runQuery(internal.teamDeletion.access.canProcess, {
        orgId: conv.orgId,
      }))
    ) {
      return;
    }

    const agent = await ctx.runQuery(internal.agents.internalGet, {
      agentId: conv.assignedAgentId,
    });
    if (!agent) return;

    const stripeInfo = await ctx.runQuery(internal.plans.getTeamStripePlan, {
      workosOrgId: agent.orgId,
      userId: agent.userId,
    });

    if (
      conv.service !== "web" &&
      conv.service !== "avatar" &&
      !checkAiFeature(stripeInfo.plan, "auto_reply")
    ) {
      console.warn("AI reply skipped: auto-reply feature disabled for plan tier", {
        billingUserId: agent.userId,
        plan: stripeInfo.plan,
      });
      return;
    }

    const creditCheck = await ctx.runQuery(internal.credits.internalCheckCredits, {
      workosUserId: agent.userId,
      modelId: agent.model,
    });
    if (!creditCheck.ok) {
      console.error("AI reply skipped: insufficient credits or unavailable model", {
        conversationId: args.conversationId,
        reason: creditCheck.reason,
        billingUserId: agent.userId,
      });
      return;
    }

    const activeBooking = await ctx.runQuery(internal.appointmentBooking.services.listActiveServices, {
      agentId: conv.assignedAgentId,
    });
    await ctx.runMutation(internal.workflowMigrations.ensureLegacyHumanEscalationForAgent, {
      agentId: conv.assignedAgentId,
    });
    const workflowRuntimeContext = await ctx.runQuery(internal.workflowRuntimeContext.loadForAgent, {
      agentId: conv.assignedAgentId,
    });
    const configuredAgent = buildAgent(
      agent,
      conv.assignedAgentId,
      false,
      conv._id,
      activeBooking.services,
      workflowRuntimeContext,
    );

    let typingActive = false;
    const turnTypingOff = async () => {
      if (!typingActive) return;
      try {
        await ctx.runAction(
          internal.chat.inboxActions.internalSendMetaTypingOff,
          { conversationId: conv._id },
        );
      } catch (error) {
        console.warn("Failed to turn off Meta typing indicator", {
          conversationId: conv._id,
          service: conv.service,
          error,
        });
      } finally {
        typingActive = false;
      }
    };

    try {
      try {
        const typingOnResult: { ok: boolean } = await ctx.runAction(
          internal.chat.inboxActions.internalSendMetaTypingOn,
          {
            conversationId: conv._id,
            messageExternalId: args.inboundExternalId,
          },
        );
        typingActive = typingOnResult.ok;
      } catch (error) {
        console.warn("Failed to turn on Meta typing indicator", {
          conversationId: conv._id,
          service: conv.service,
          error,
        });
      }

      const workflowActionPlan = await generateWorkflowActionPlan(
        ctx,
        configuredAgent,
        conv.threadId,
        args,
        workflowRuntimeContext,
      );
      const hasMatches = hasWorkflowActionMatches(workflowActionPlan);
      const plannedMediaItems = hasMatches
        ? resolveWorkflowActionPlanMedia(workflowActionPlan, workflowRuntimeContext)
        : [];
      const plannedWorkflowText = hasMatches
        ? resolveWorkflowActionPlanText(workflowActionPlan, workflowRuntimeContext)
        : null;

      let responseMessages: string[];

      if (hasMatches && plannedWorkflowText !== null) {
        const plannedMessage = plannedWorkflowText.trim();
        responseMessages = plannedMessage ? [plannedMessage] : [];
      } else {
        const result = await configuredAgent.generateObject(
          ctx,
          { threadId: conv.threadId },
          {
            ...workflowActionPlanReplyPromptArgs(
              args,
              workflowActionPlan,
              workflowRuntimeContext,
            ),
            schema: aiReplyOutputSchema,
          },
          { storageOptions: { saveMessages: "none" } },
        );
        responseMessages = result.object.messages
          .map(normalizeCustomerFacingResponseFormatting)
          .map((message) => message.trim());
        if (responseMessages.some((message) => !message)) {
          throw new Error("Generated AI reply contains an empty customer message");
        }
      }

      const convAfterGeneration = await ctx.runQuery(
        internal.chat.inbox.internalGetConversation,
        { conversationId: args.conversationId },
      );
      if (
        convAfterGeneration?.status === "requires_user_input" &&
        convAfterGeneration.escalation
      ) {
        return;
      }
      if (
        !(await ctx.runQuery(internal.teamDeletion.access.canProcess, {
          orgId: conv.orgId,
        }))
      ) {
        return;
      }

      const allMediaItems = plannedMediaItems;
      const channelMediaItems = toChannelMediaItems(allMediaItems);

      const allMediaUrls = allMediaItems.map((item) => item.url);
      if (responseMessages.length === 0 && allMediaItems.length === 0) return;

      let usage: { llmModel: string; creditsCharged: number };
      try {
        usage = await ctx.runMutation(internal.credits.internalDeductCredits, {
          workosUserId: agent.userId,
          modelId: agent.model,
          conversationId: conv._id,
          agentId: conv.assignedAgentId,
          reason: `AI reply in ${conv.service} conversation`,
        });
      } catch (error) {
        console.error("AI reply skipped: credit deduction failed", {
          conversationId: args.conversationId,
          error,
        });
        return;
      }

      await turnTypingOff();

      const enqueueMetaMarkSeenIfRead = async (
        persistResult: {
          markedRead: boolean;
          latestInboundExternalId?: string;
        } | null,
      ) => {
        if (!persistResult?.markedRead) return;
        await metaIndicatorPool.enqueueAction(
          ctx,
          internal.chat.inboxActions.internalSendMetaMarkSeen,
          {
            conversationId: conv._id,
            messageExternalId: persistResult.latestInboundExternalId,
          },
        );
      };

      const outboundMessages = responseMessages.length > 0 ? responseMessages : [""];
      for (const [messageIndex, content] of outboundMessages.entries()) {
        const includesMedia = messageIndex === 0 && allMediaUrls.length > 0;
        const sendResult: {
          ok: boolean;
          error?: string;
          policy?: string;
          textExternalId?: string;
          mediaExternalIds?: string[];
        } = await ctx.runAction(
          internal.chat.inboxActions.internalSendAiReply,
          {
            conversationId: conv._id,
            content,
            mediaUrls: includesMedia ? allMediaUrls : [],
            mediaItems: includesMedia ? channelMediaItems : [],
            allowHumanAgentTag: false,
          },
        );

        if (!sendResult.ok) {
          console.error(
            "AI reply not sent to channel:",
            sendResult.error,
            { conversationId: conv._id, service: conv.service, messageIndex },
          );
          return;
        }

        if (content) {
          const persistResult: {
            markedRead: boolean;
            latestInboundExternalId?: string;
          } | null = await ctx.runMutation(internal.chat.inbox.internalPersistAiReply, {
            conversationId: conv._id,
            threadId: conv.threadId,
            content,
            externalId: sendResult.textExternalId,
            llmModel: usage.llmModel,
            creditsCharged: messageIndex === 0 ? usage.creditsCharged : 0,
            sourceEventId: args.avatarSourceEventId,
          });
          await enqueueMetaMarkSeenIfRead(persistResult);
        }

        if (includesMedia) {
          const persistResult: {
            markedRead: boolean;
            latestInboundExternalId?: string;
          } | null = await ctx.runMutation(
            internal.chat.inbox.internalPersistAiMediaReply,
            {
              conversationId: conv._id,
              threadId: conv.threadId,
              mediaUrls: allMediaUrls,
              mediaItems: channelMediaItems,
              externalIds: sendResult.mediaExternalIds ?? [],
            },
          );
          await enqueueMetaMarkSeenIfRead(persistResult);
        }
      }
    } finally {
      await turnTypingOff();
    }
  },
});

export const internalGetSendContext = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null || !conv.channelId) return null;
    const channel = await ctx.db.get(conv.channelId);
    if (channel === null) return null;
    return { conversation: conv, channel };
  },
});

export const internalGetOrgByWorkosId = internalQuery({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("teams")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.orgId))
      .unique();
  },
});

export const internalGetConversation = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

export const internalMarkSyncLeadLabeled = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null || conv.syncLeadLabeledAt !== undefined) {
      return;
    }
    await ctx.db.patch(args.conversationId, {
      syncLeadLabeledAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const listThreadMessagesForInbox = query({
  args: {
    threadId: v.string(),
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (
      conv === null ||
      conv.orgId !== orgId ||
      conv.threadId !== args.threadId
    ) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
        streams: undefined,
      };
    }

    const paginated = await listMessages(ctx, components.agent, args);
    const streams = await syncStreams(ctx, components.agent, args);
    return {
      ...paginated,
      page: await messageDocsToInboxUIMessages(
        ctx,
        args.conversationId,
        paginated.page,
      ),
      streams,
    };
  },
});

export const internalGetMessagesForSummary = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .take(100);
  },
});
