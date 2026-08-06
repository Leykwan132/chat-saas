import type { Id, TableNames } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { deleteSubscriptionsForAgent } from "../telegramNotifications/subscriptionAccess";

const PAGE_SIZE = 50;

async function deleteRows<T extends TableNames>(
  ctx: MutationCtx,
  rows: ReadonlyArray<{ _id: Id<T> }>,
): Promise<boolean> {
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length > 0;
}

async function deleteAvatarPage(
  ctx: MutationCtx,
  orgId: string,
): Promise<boolean> {
  const configuration = await ctx.db
    .query("avatarConfigurations")
    .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
    .first();
  if (!configuration) return false;
  const session = await ctx.db
    .query("avatarSessions")
    .withIndex("by_configurationId_and_startedAt", (q) =>
      q.eq("configurationId", configuration._id),
    )
    .first();
  if (!session) {
    await ctx.db.delete(configuration._id);
    return true;
  }
  const events = await ctx.db
    .query("avatarEvents")
    .withIndex("by_sessionId_and_createdAt", (q) =>
      q.eq("sessionId", session.sessionId),
    )
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, events)) return true;
  await ctx.db.delete(session._id);
  return true;
}

async function deleteConversationPage(
  ctx: MutationCtx,
  orgId: string,
): Promise<boolean> {
  const conversation = await ctx.db
    .query("conversations")
    .withIndex("by_orgId_and_lastMessageAt", (q) => q.eq("orgId", orgId))
    .first();
  if (!conversation) return false;
  const batch = await ctx.db
    .query("inboundMediaBatches")
    .withIndex("by_conversationId", (q) =>
      q.eq("conversationId", conversation._id),
    )
    .first();
  if (batch) {
    const items = await ctx.db
      .query("inboundMediaBatchItems")
      .withIndex("by_batchId", (q) => q.eq("batchId", batch._id))
      .take(PAGE_SIZE);
    if (await deleteRows(ctx, items)) return true;
    await ctx.db.delete(batch._id);
    return true;
  }
  const refreshRequests = await ctx.db
    .query("conversationAnalyticsRefreshRequests")
    .withIndex("by_conversationId", (q) =>
      q.eq("conversationId", conversation._id),
    )
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, refreshRequests)) return true;
  const dirtyRequests = await ctx.db
    .query("conversationAnalyticsDirtyRequests")
    .withIndex("by_conversationId", (q) =>
      q.eq("conversationId", conversation._id),
    )
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, dirtyRequests)) return true;
  const projectionStates = await ctx.db
    .query("conversationAnalyticsProjectionStates")
    .withIndex("by_conversationId", (q) =>
      q.eq("conversationId", conversation._id),
    )
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, projectionStates)) return true;
  const timers = await ctx.db
    .query("workflowFollowUpTimers")
    .withIndex("by_conversationId", (q) =>
      q.eq("conversationId", conversation._id),
    )
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, timers)) return true;
  const bookings = await ctx.db
    .query("appointmentBookingSessions")
    .withIndex("by_conversationId", (q) =>
      q.eq("conversationId", conversation._id),
    )
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, bookings)) return true;
  await ctx.db.delete(conversation._id);
  return true;
}

async function deleteSchedulePage(
  ctx: MutationCtx,
  agentId: Id<"agents">,
): Promise<boolean> {
  const schedule = await ctx.db
    .query("userSchedules")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .first();
  if (!schedule) return false;
  const shifts = await ctx.db
    .query("userShifts")
    .withIndex("by_userScheduleId", (q) =>
      q.eq("userScheduleId", schedule._id),
    )
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, shifts)) return true;
  const timeOff = await ctx.db
    .query("userTimeOff")
    .withIndex("by_userScheduleId", (q) =>
      q.eq("userScheduleId", schedule._id),
    )
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, timeOff)) return true;
  await ctx.db.delete(schedule._id);
  return true;
}

async function deleteAgentPage(
  ctx: MutationCtx,
  orgId: string,
): Promise<boolean> {
  const agent = await ctx.db
    .query("agents")
    .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
    .first();
  if (!agent) return false;
  if (await deleteSchedulePage(ctx, agent._id)) return true;
  const settings = await ctx.db
    .query("leadAssignmentSettings")
    .withIndex("by_agentId", (q) => q.eq("agentId", agent._id))
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, settings)) return true;
  const services = await ctx.db
    .query("appointmentServices")
    .withIndex("by_agentId_and_sortOrder", (q) => q.eq("agentId", agent._id))
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, services)) return true;
  const bookings = await ctx.db
    .query("appointmentBookingSessions")
    .withIndex("by_agentId_and_updatedAt", (q) => q.eq("agentId", agent._id))
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, bookings)) return true;
  const usage = await ctx.db
    .query("rawAgentUsage")
    .withIndex("by_agentId", (q) => q.eq("agentId", agent._id))
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, usage)) return true;
  const costs = await ctx.db
    .query("workflowAutomationCostTotals")
    .withIndex("by_agentId_and_automationKind", (q) =>
      q.eq("agentId", agent._id),
    )
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, costs)) return true;
  const operations = await ctx.db
    .query("workflowAutomationOperations")
    .withIndex("by_agentId_and_automationKind_and_status", (q) =>
      q.eq("agentId", agent._id),
    )
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, operations)) return true;
  const templateUsage = await ctx.db
    .query("workflowTemplateUsage")
    .withIndex("by_agentId_and_templateId", (q) =>
      q.eq("agentId", agent._id),
    )
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, templateUsage)) return true;
  await deleteSubscriptionsForAgent(ctx, agent._id);
  await ctx.db.delete(agent._id);
  return true;
}

async function deleteWorkflowPage(
  ctx: MutationCtx,
  orgId: string,
): Promise<boolean> {
  const workflow = await ctx.db
    .query("workflows")
    .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
    .first();
  if (!workflow) return false;
  const nodes = await ctx.db
    .query("workflowNodes")
    .withIndex("by_workflowId", (q) => q.eq("workflowId", workflow._id))
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, nodes)) return true;
  const edges = await ctx.db
    .query("workflowEdges")
    .withIndex("by_workflowId", (q) => q.eq("workflowId", workflow._id))
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, edges)) return true;
  await ctx.db.delete(workflow._id);
  return true;
}

async function deleteImportPage(
  ctx: MutationCtx,
  orgId: string,
): Promise<boolean> {
  const job = await ctx.db
    .query("customerImportJobs")
    .withIndex("by_orgId_and_createdAt", (q) => q.eq("orgId", orgId))
    .first();
  if (!job) return false;
  const rows = await ctx.db
    .query("customerImportRows")
    .withIndex("by_jobId", (q) => q.eq("jobId", job._id))
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, rows)) return true;
  await ctx.db.delete(job._id);
  return true;
}

async function deleteChannelPage(
  ctx: MutationCtx,
  orgId: string,
): Promise<boolean> {
  const channel = await ctx.db
    .query("channels")
    .withIndex("by_orgId_and_service", (q) => q.eq("orgId", orgId))
    .first();
  if (!channel) return false;
  if (channel.wabaId) {
    const updates = await ctx.db
      .query("whatsappAccountUpdates")
      .withIndex("by_wabaId", (q) => q.eq("wabaId", channel.wabaId!))
      .take(PAGE_SIZE);
    if (await deleteRows(ctx, updates)) return true;
  }
  await ctx.db.delete(channel._id);
  return true;
}

export async function deleteDescendantPage(
  ctx: MutationCtx,
  orgId: string,
): Promise<boolean> {
  return (
    (await deleteAvatarPage(ctx, orgId)) ||
    (await deleteConversationPage(ctx, orgId)) ||
    (await deleteAgentPage(ctx, orgId)) ||
    (await deleteWorkflowPage(ctx, orgId)) ||
    (await deleteImportPage(ctx, orgId)) ||
    (await deleteChannelPage(ctx, orgId))
  );
}
