import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { findEscalationKeyword } from "../shared/escalationKeywords";
import { markConversationAnalyticsDirty } from "./analyticsDirtyRequest";
import { autoResumeConfig, ownsAutoResumeTimer } from "./autoResumeTimerState";

type Conversation = Doc<"conversations">;
type Message = Doc<"messages">;
type Timer = Doc<"autoDeescalationTimers">;

export function isSuccessfulHumanReply(message: Message) {
  return (
    message.direction === "outgoing" &&
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

async function scheduleTimer(
  ctx: MutationCtx,
  conversation: Conversation,
  lastHumanReplyAt: number,
) {
  if (
    conversation.manualAiResumeAt !== undefined ||
    !conversation.assignedAgentId ||
    conversation.status === "closed"
  )
    return null;
  const scope: Timer["scope"] = conversation.escalation ? undefined : "normal";
  const agent = await ctx.db.get(conversation.assignedAgentId);
  const config = autoResumeConfig(agent, scope);
  if (!config?.enabled) return null;
  let previous = await getTimer(ctx, conversation._id);
  if (previous && !ownsAutoResumeTimer(previous, conversation)) {
    await removeTimer(ctx, previous);
    previous = null;
  }
  if (previous) await cancelJob(ctx, previous);
  const lastReplyAt = Math.max(
    lastHumanReplyAt,
    previous?.lastHumanReplyAt ?? lastHumanReplyAt,
  );
  const revision = (previous?.revision ?? 0) + 1;
  const values = {
    conversationId: conversation._id,
    agentId: conversation.assignedAgentId,
    assignedUserId: conversation.assignedUserId,
    scope,
    escalatedAt: conversation.escalation?.escalatedAt,
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
  if (
    after?.manualAiResumeAt !== undefined &&
    before !== null &&
    (after.assignToAiAgent ||
      after.status === "closed" ||
      before.assignedAgentId !== after.assignedAgentId ||
      before.assignedUserId !== after.assignedUserId ||
      before.escalation?.escalatedAt !== after.escalation?.escalatedAt)
  )
    await ctx.db.patch(after._id, { manualAiResumeAt: undefined });

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
  if (
    timer &&
    (!after || after.assignToAiAgent || !ownsAutoResumeTimer(timer, after))
  )
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
    sentAt < (conversation.escalation?.escalatedAt ?? conversation.createdAt)
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
  const escalated = conversation.escalation !== undefined;
  await ctx.db.patch(conversation._id, {
    ...(escalated ? { status: "open" as const, escalation: undefined } : {}),
    assignToAiAgent: true,
    updatedAt: Date.now(),
  });
  const actions = escalated
    ? (["escalation_resolved", "ai_enabled"] as const)
    : (["ai_enabled"] as const);
  for (const action of actions) {
    await ctx.runMutation(internal.conversationLogs.logEvent, {
      conversationId: conversation._id,
      action,
      actor: {
        type: "system",
        name: escalated ? "Auto de-escalation" : "Auto resume",
      },
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
  const config = autoResumeConfig(agent, timer.scope);
  if (
    !conversation ||
    conversation.manualAiResumeAt !== undefined ||
    conversation.assignToAiAgent ||
    !ownsAutoResumeTimer(timer, conversation) ||
    !config?.enabled ||
    config.activationRevision !== timer.configRevision
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
    conversation.manualAiResumeAt !== undefined ||
    conversation.assignToAiAgent ||
    !ownsAutoResumeTimer(timer, conversation) ||
    sentAt < (timer.escalatedAt ?? conversation.createdAt)
  )
    return;
  const agent = await ctx.db.get(timer.agentId);
  const config = autoResumeConfig(agent, timer.scope);
  if (!config?.enabled || config.activationRevision !== timer.configRevision)
    return;
  if (findEscalationKeyword(message.content, config.keywords) !== undefined) {
    await resumeConversation(ctx, conversation, "keyword");
  }
}
