import type { Id, TableNames } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const PAGE_SIZE = 50;
async function deleteRows<T extends TableNames>(
  ctx: MutationCtx,
  rows: ReadonlyArray<{ _id: Id<T> }>,
): Promise<boolean> {
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length > 0;
}
async function deleteAvatarDescendants(
  ctx: MutationCtx,
  orgId: string,
): Promise<boolean> {
  const configurations = await ctx.db
    .query("avatarConfigurations")
    .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
    .take(PAGE_SIZE);
  for (const configuration of configurations) {
    const sessions = await ctx.db
      .query("avatarSessions")
      .withIndex("by_configurationId_and_startedAt", (q) =>
        q.eq("configurationId", configuration._id),
      )
      .take(PAGE_SIZE);
    for (const session of sessions) {
      const events = await ctx.db
        .query("avatarEvents")
        .withIndex("by_sessionId_and_createdAt", (q) =>
          q.eq("sessionId", session.sessionId),
        )
        .take(PAGE_SIZE);
      if (await deleteRows(ctx, events)) {
        return true;
      }
      await ctx.db.delete(session._id);
      return true;
    }
  }
  return false;
}
async function deleteInboundMediaDescendants(
  ctx: MutationCtx,
  orgId: string,
): Promise<boolean> {
  const conversations = await ctx.db
    .query("conversations")
    .withIndex("by_orgId_and_lastMessageAt", (q) => q.eq("orgId", orgId))
    .take(PAGE_SIZE);
  for (const conversation of conversations) {
    const batches = await ctx.db
      .query("inboundMediaBatches")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", conversation._id),
      )
      .take(PAGE_SIZE);
    for (const batch of batches) {
      const items = await ctx.db
        .query("inboundMediaBatchItems")
        .withIndex("by_batchId", (q) => q.eq("batchId", batch._id))
        .take(PAGE_SIZE);
      if (await deleteRows(ctx, items)) {
        return true;
      }
      await ctx.db.delete(batch._id);
      return true;
    }
  }
  return false;
}
async function deleteConversationDescendants(
  ctx: MutationCtx,
  orgId: string,
): Promise<boolean> {
  const conversations = await ctx.db
    .query("conversations")
    .withIndex("by_orgId_and_lastMessageAt", (q) => q.eq("orgId", orgId))
    .take(PAGE_SIZE);
  for (const conversation of conversations) {
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
  }
  return false;
}
async function deleteScheduleDescendants(
  ctx: MutationCtx,
  agentId: Id<"agents">,
): Promise<boolean> {
  const schedules = await ctx.db
    .query("userSchedules")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .take(PAGE_SIZE);
  for (const schedule of schedules) {
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
  return false;
}

async function deleteAgentDescendants(
  ctx: MutationCtx,
  orgId: string,
): Promise<boolean> {
  const agents = await ctx.db
    .query("agents")
    .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
    .take(PAGE_SIZE);
  for (const agent of agents) {
    if (await deleteScheduleDescendants(ctx, agent._id)) return true;

    const settings = await ctx.db
      .query("leadAssignmentSettings")
      .withIndex("by_agentId", (q) => q.eq("agentId", agent._id))
      .take(PAGE_SIZE);
    if (await deleteRows(ctx, settings)) return true;

    const services = await ctx.db
      .query("appointmentServices")
      .withIndex("by_agentId_and_sortOrder", (q) =>
        q.eq("agentId", agent._id),
      )
      .take(PAGE_SIZE);
    if (await deleteRows(ctx, services)) return true;

    const bookings = await ctx.db
      .query("appointmentBookingSessions")
      .withIndex("by_agentId_and_updatedAt", (q) =>
        q.eq("agentId", agent._id),
      )
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
  }
  return false;
}

async function deleteWorkflowDescendants(
  ctx: MutationCtx,
  orgId: string,
): Promise<boolean> {
  const workflows = await ctx.db
    .query("workflows")
    .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
    .take(PAGE_SIZE);
  for (const workflow of workflows) {
    const nodes = await ctx.db
      .query("workflowNodes")
      .withIndex("by_workflowId", (q) =>
        q.eq("workflowId", workflow._id),
      )
      .take(PAGE_SIZE);
    if (await deleteRows(ctx, nodes)) return true;
    const edges = await ctx.db
      .query("workflowEdges")
      .withIndex("by_workflowId", (q) =>
        q.eq("workflowId", workflow._id),
      )
      .take(PAGE_SIZE);
    if (await deleteRows(ctx, edges)) return true;
  }
  return false;
}

async function deleteImportDescendants(
  ctx: MutationCtx,
  orgId: string,
): Promise<boolean> {
  const jobs = await ctx.db
    .query("customerImportJobs")
    .withIndex("by_orgId_and_createdAt", (q) => q.eq("orgId", orgId))
    .take(PAGE_SIZE);
  for (const job of jobs) {
    const rows = await ctx.db
      .query("customerImportRows")
      .withIndex("by_jobId", (q) => q.eq("jobId", job._id))
      .take(PAGE_SIZE);
    if (await deleteRows(ctx, rows)) return true;
  }
  return false;
}

async function deleteWhatsappAccountUpdates(
  ctx: MutationCtx,
  orgId: string,
): Promise<boolean> {
  const channels = await ctx.db
    .query("channels")
    .withIndex("by_orgId_and_service", (q) => q.eq("orgId", orgId))
    .take(PAGE_SIZE);
  for (const channel of channels) {
    const wabaId = channel.wabaId;
    if (!wabaId) continue;
    const updates = await ctx.db
      .query("whatsappAccountUpdates")
      .withIndex("by_wabaId", (q) => q.eq("wabaId", wabaId))
      .take(PAGE_SIZE);
    if (await deleteRows(ctx, updates)) return true;
  }
  return false;
}

export async function deleteDescendantPage(
  ctx: MutationCtx,
  orgId: string,
): Promise<boolean> {
  return (
    (await deleteAvatarDescendants(ctx, orgId)) ||
    (await deleteInboundMediaDescendants(ctx, orgId)) ||
    (await deleteConversationDescendants(ctx, orgId)) ||
    (await deleteAgentDescendants(ctx, orgId)) ||
    (await deleteWorkflowDescendants(ctx, orgId)) ||
    (await deleteImportDescendants(ctx, orgId)) ||
    (await deleteWhatsappAccountUpdates(ctx, orgId))
  );
}
