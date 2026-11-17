import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { findEscalationKeyword } from "../shared/escalationKeywords";
import { markConversationAnalyticsDirty } from "./analyticsDirtyRequest";

type Conversation = Doc<"conversations">;
type Message = Doc<"messages">;
type Timer = Doc<"autoDeescalationTimers">;

export function isSuccessfulHumanReply(message: Message) {
  return (
    message.direction === "outgoing" &&
    message.isHistorical !== true &&
    message.agentId === undefined &&
    message.messageKind === undefined &&
    message.workflowAutomationSource === undefined &&
    message.revokedAt === undefined &&
    (message.status === "sent" ||
      message.status === "delivered" ||
      message.status === "read")
  );
}

async function getTimer(ctx: MutationCtx, conversationId: Id<"conversations">) {
  return await ctx.db
    .query("autoDeescalationTimers")
    .withIndex("by_conversationId", (q) =>
      q.eq("conversationId", conversationId),
    )
    .unique();
}

async function cancelJob(ctx: MutationCtx, timer: Timer) {
  if (!timer.scheduledJobId) return;
  const job = await ctx.db.system.get(timer.scheduledJobId);
  if (job?.state.kind === "pending")
    await ctx.scheduler.cancel(timer.scheduledJobId);
}

async function removeTimer(ctx: MutationCtx, timer: Timer) {
  await cancelJob(ctx, timer);
  await ctx.db.delete(timer._id);
}

function ownsConversation(timer: Timer, conversation: Conversation) {
  return (
    conversation.status !== "closed" &&
    conversation.assignedAgentId === timer.agentId &&
    conversation.assignedUserId === timer.assignedUserId &&
    (timer.directTakeover
      ? conversation.escalation === undefined && !conversation.assignToAiAgent
      : conversation.escalation?.escalatedAt === timer.escalatedAt) &&
    conversation.escalation?.sourceMessageId === timer.sourceMessageId
  );
}

async function scheduleTimer(
  ctx: MutationCtx,
  conversation: Conversation,
  lastHumanReplyAt: number,
) {
  if (
    (!conversation.escalation && conversation.assignToAiAgent) ||
    !conversation.assignedAgentId ||
    conversation.status === "closed"
  )
    return null;
  const agent = await ctx.db.get(conversation.assignedAgentId);
  const config = agent?.autoDeescalation;
  if (!config?.enabled) return null;
  let previous = await getTimer(ctx, conversation._id);
  if (previous && !ownsConversation(previous, conversation)) {
    await removeTimer(ctx, previous);
    previous = null;
  }
  if (previous) await cancelJob(ctx, previous);
  const lastReplyAt = Math.max(
    lastHumanReplyAt,
    previous?.lastHumanReplyAt ??
      conversation.escalation?.escalatedAt ??
      lastHumanReplyAt,
  );
  const revision = (previous?.revision ?? 0) + 1;
  const values = {
    conversationId: conversation._id,
    agentId: conversation.assignedAgentId,
    assignedUserId: conversation.assignedUserId,
    escalatedAt:
      conversation.escalation?.escalatedAt ??
      previous?.escalatedAt ??
      lastHumanReplyAt,
    directTakeover: conversation.escalation === undefined,
    sourceMessageId: conversation.escalation?.sourceMessageId,
    lastHumanReplyAt: lastReplyAt,
    dueAt: lastReplyAt + config.inactivityMinutes * 60_000,
    revision,
    configRevision: config.activationRevision,
  };
  const timerId =
    previous?._id ?? (await ctx.db.insert("autoDeescalationTimers", values));
  const scheduledJobId = await ctx.scheduler.runAt(
    values.dueAt,
    internal.autoDeescalation.expire,
    { timerId, revision },
  );
  await ctx.db.patch(timerId, { ...values, scheduledJobId });
  return timerId;
}

export async function observeEscalationChange(
  ctx: MutationCtx,
  before: Conversation | null,
  after: Conversation | null,
) {
  const conversationId = after?._id ?? before?._id;
  if (!conversationId) return;
  const changed =
    before?.escalation?.escalatedAt !== after?.escalation?.escalatedAt ||
    before?.escalation?.sourceMessageId !==
      after?.escalation?.sourceMessageId ||
    before?.assignedAgentId !== after?.assignedAgentId ||
    before?.assignedUserId !== after?.assignedUserId ||
    before?.status !== after?.status ||
    before?.assignToAiAgent !== after?.assignToAiAgent;
  if (!changed && before !== null) return;
  const timer = await getTimer(ctx, conversationId);
  if (timer && (!after || !ownsConversation(timer, after)))
    await removeTimer(ctx, timer);
}

export async function observeHumanReply(
  ctx: MutationCtx,
  before: Message | null,
  after: Message,
) {
  if (
    !isSuccessfulHumanReply(after) ||
    (before && isSuccessfulHumanReply(before))
  )
    return;
  const conversation = await ctx.db.get(after.conversationId);
  const sentAt = before
    ? (after.statusUpdatedAt ?? Date.now())
    : after.createdAt;
  if (
    !conversation ||
    (conversation.escalation && sentAt < conversation.escalation.escalatedAt)
  )
    return;
  const timerId = await scheduleTimer(ctx, conversation, sentAt);
  if (timerId && after.contentType === "text" && after.mediaUrl === undefined) {
    await ctx.scheduler.runAfter(
      0,
      internal.autoDeescalation.processHumanReply,
      {
        messageId: after._id,
        timerId,
        sentAt,
        activationRevision: (await ctx.db.get(timerId))!.configRevision,
      },
    );
  }
}

async function resumeConversation(
  ctx: MutationCtx,
  conversation: Conversation,
  reason: "timer" | "keyword",
) {
  await ctx.db.patch(conversation._id, {
    status: "open",
    escalation: undefined,
    assignToAiAgent: true,
    updatedAt: Date.now(),
  });
  const actions: Array<"escalation_resolved" | "ai_enabled"> =
    conversation.escalation
      ? ["escalation_resolved", "ai_enabled"]
      : ["ai_enabled"];
  for (const action of actions) {
    await ctx.runMutation(internal.conversationLogs.logEvent, {
      conversationId: conversation._id,
      action,
      actor: { type: "system", name: "Auto de-escalation" },
      metadata: { reason },
    });
  }
  await markConversationAnalyticsDirty(ctx, {
    conversationId: conversation._id,
  });
}

export async function expireTimer(
  ctx: MutationCtx,
  timerId: Id<"autoDeescalationTimers">,
  revision: number,
) {
  const timer = await ctx.db.get(timerId);
  if (!timer || timer.revision !== revision) return;
  const conversation = await ctx.db.get(timer.conversationId);
  const agent = await ctx.db.get(timer.agentId);
  if (
    !conversation ||
    !ownsConversation(timer, conversation) ||
    !agent?.autoDeescalation?.enabled ||
    agent.autoDeescalation.activationRevision !== timer.configRevision
  ) {
    await removeTimer(ctx, timer);
    return;
  }
  if (Date.now() < timer.dueAt) return;
  await resumeConversation(ctx, conversation, "timer");
}

export async function processHumanReply(
  ctx: MutationCtx,
  messageId: Id<"messages">,
  timerId: Id<"autoDeescalationTimers">,
  sentAt: number,
  activationRevision: number,
) {
  const message = await ctx.db.get(messageId);
  const timer = await ctx.db.get(timerId);
  if (
    !timer ||
    timer.configRevision !== activationRevision ||
    !message ||
    message.conversationId !== timer.conversationId ||
    !isSuccessfulHumanReply(message) ||
    message.contentType !== "text" ||
    message.mediaUrl !== undefined
  )
    return;
  const conversation = await ctx.db.get(message.conversationId);
  if (
    !conversation ||
    !ownsConversation(timer, conversation) ||
    sentAt < timer.escalatedAt
  )
    return;
  const agent = await ctx.db.get(timer.agentId);
  const config = agent?.autoDeescalation;
  if (!config?.enabled || config.activationRevision !== timer.configRevision)
    return;
  if (findEscalationKeyword(message.content, config.keywords) !== undefined) {
    await resumeConversation(ctx, conversation, "keyword");
  }
}
