import { v } from 'convex/values';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { internal } from './_generated/api';
import { ingestChannelMessage } from './chat/threads';
import { inboxPromptContent } from '../shared/inboxAttachments';
import { inboxAiReplyPool } from './inboxPools';
import { markConversationAnalyticsDirty } from './analyticsDirtyRequest';
import { cancelOrScheduleWorkflowFollowUpForMessages } from './workflowAutomationMessageActivity';
import { canProcessWorkspaceActivity } from './teamDeletion/access';

async function resolvePublicSession(
  ctx: QueryCtx | MutationCtx,
  args: { publicKey: string; visitorId: string; sessionId: string },
) {
  const session = await ctx.db
    .query('avatarSessions')
    .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
    .unique();
  if (!session || session.visitorId !== args.visitorId) throw new Error('Avatar session not found');
  const configuration = await ctx.db.get(session.configurationId);
  if (!configuration || configuration.publicKey !== args.publicKey) {
    throw new Error('Avatar session not found');
  }
  if (
    !configuration.enabled ||
    !(await canProcessWorkspaceActivity(ctx, configuration.orgId))
  ) {
    throw new Error('Workspace unavailable');
  }
  return { session, configuration };
}

async function recordEventOnce(
  ctx: MutationCtx,
  args: { sessionId: string; eventId: string; eventType: string; sourceEventId?: string },
) {
  const existing = await ctx.db
    .query('avatarEvents')
    .withIndex('by_eventId', (q) => q.eq('eventId', args.eventId))
    .unique();
  if (existing) return false;
  await ctx.db.insert('avatarEvents', {
    sessionId: args.sessionId,
    eventId: args.eventId,
    eventType: args.eventType,
    ...(args.sourceEventId !== undefined ? { sourceEventId: args.sourceEventId } : {}),
    createdAt: Date.now(),
  });
  return true;
}

export const receiveTranscript = mutation({
  args: {
    publicKey: v.string(),
    visitorId: v.string(),
    sessionId: v.string(),
    eventId: v.string(),
    sourceEventId: v.optional(v.string()),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const { session, configuration } = await resolvePublicSession(ctx, args);
    if (!await recordEventOnce(ctx, {
      sessionId: args.sessionId,
      eventId: args.eventId,
      eventType: 'user.transcription',
      sourceEventId: args.sourceEventId,
    })) return { accepted: false, conversationId: session.conversationId };

    const text = args.text.trim();
    if (!text) throw new Error('Transcript is required');
    const receivedAt = Date.now();
    const result = await ingestChannelMessage(ctx, {
      channelId: configuration.channelId,
      externalId: `avatar:${args.eventId}`,
      contactAddress: args.visitorId,
      contactName: 'Avatar visitor',
      direction: 'incoming',
      content: text,
      contentType: 'text',
      timestampMs: receivedAt,
      assignedAgentId: configuration.agentId,
    });
    await ctx.db.patch(session._id, { conversationId: result.conversationId, updatedAt: receivedAt });
    if (!result.skipped) {
      await markConversationAnalyticsDirty(ctx, {
        conversationId: result.conversationId,
        earliestDirtyMessageAt: receivedAt,
      });
      await cancelOrScheduleWorkflowFollowUpForMessages(ctx, {
        conversationId: result.conversationId,
        direction: 'incoming',
        isHistorical: false,
        messageIds: result.messageIds,
      });
    }
    if (result.shouldEnqueueAi && result.agentMessageId) {
      await inboxAiReplyPool.enqueueAction(ctx, internal.chat.inbox.generateAiReplyWorker, {
        conversationId: result.conversationId,
        promptContent: inboxPromptContent(text),
        promptMessageId: result.agentMessageId,
        avatarSourceEventId: args.eventId,
      });
    }
    return { accepted: true, conversationId: result.conversationId };
  },
});

export const listMessages = query({
  args: { publicKey: v.string(), visitorId: v.string(), sessionId: v.string() },
  handler: async (ctx, args) => {
    const { session } = await resolvePublicSession(ctx, args);
    if (!session.conversationId) return [];
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversationId_and_createdAt', (q) => q.eq('conversationId', session.conversationId!))
      .order('desc')
      .take(80);
    return messages.reverse().map((message) => ({
      id: message._id,
      direction: message.direction,
      content: message.content,
      contentType: message.contentType,
      sourceEventId: message.sourceEventId,
      createdAt: message.createdAt,
    }));
  },
});

export const recordEvent = mutation({
  args: {
    publicKey: v.string(),
    visitorId: v.string(),
    sessionId: v.string(),
    eventId: v.string(),
    eventType: v.string(),
    sourceEventId: v.optional(v.string()),
    endReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { session } = await resolvePublicSession(ctx, args);
    const inserted = await recordEventOnce(ctx, args);
    if (args.eventType === 'session.stopped') {
      const stoppedAt = Date.now();
      await ctx.db.patch(session._id, {
        status: 'stopped',
        stoppedAt,
        durationMs: Math.max(0, stoppedAt - session.startedAt),
        endReason: args.endReason,
        updatedAt: stoppedAt,
      });
    } else if (args.eventType === 'session.start_failed') {
      const stoppedAt = Date.now();
      await ctx.db.patch(session._id, {
        status: 'failed',
        stoppedAt,
        durationMs: Math.max(0, stoppedAt - session.startedAt),
        endReason: args.endReason,
        updatedAt: stoppedAt,
      });
    }
    return inserted;
  },
});
