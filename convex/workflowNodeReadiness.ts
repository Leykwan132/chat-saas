import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { workflowNodeDescription } from '../shared/workflows';
import { MediaUploadPurpose } from '../shared/mediaUploadPurpose';
import { MAX_WORKFLOW_EDGES } from './workflowCore';

const MAX_RUNTIME_MEDIA = 500;
const MAX_RUNTIME_SERVICES = 100;
const MAX_WORKFLOW_NODES = 100;

type DbCtx = Pick<QueryCtx, 'db'> | Pick<MutationCtx, 'db'>;

export type WorkflowNodeReadinessFacts = {
  readyMediaNodeIds: Set<Id<'workflowNodes'>>;
  activeAppointmentServiceIds: Set<Id<'appointmentServices'>>;
  configuredConditionNodeIds: Set<Id<'workflowNodes'>>;
};

function hasConfiguredMessage(node: Doc<'workflowNodes'>) {
  const message = node.description?.trim();
  return Boolean(message) && message !== workflowNodeDescription('sendText');
}

function hasActiveAllowedService(
  node: Doc<'workflowNodes'>,
  activeAppointmentServiceIds: Set<Id<'appointmentServices'>>,
) {
  if (node.allowedAppointmentServiceIds === undefined) {
    return activeAppointmentServiceIds.size > 0;
  }
  return node.allowedAppointmentServiceIds.some((serviceId) =>
    activeAppointmentServiceIds.has(serviceId),
  );
}

export function getWorkflowNodeReadiness(
  node: Doc<'workflowNodes'>,
  facts: WorkflowNodeReadinessFacts,
) {
  return getWorkflowNodeReadinessIssueCount(node, facts) === 0;
}

export function getWorkflowNodeReadinessIssueCount(
  node: Doc<'workflowNodes'>,
  facts: WorkflowNodeReadinessFacts,
) {
  if (node.kind === 'start' || node.kind === 'humanEscalation') return 0;

  let count = facts.configuredConditionNodeIds.has(node._id) ? 0 : 1;
  if (node.kind === 'sendText') {
    return count + (hasConfiguredMessage(node) ? 0 : 1);
  }
  if (node.kind === 'sendImage' || node.kind === 'sendFile') {
    return count + (facts.readyMediaNodeIds.has(node._id) ? 0 : 1);
  }
  if (node.kind === 'bookAppointment') {
    if (!hasActiveAllowedService(node, facts.activeAppointmentServiceIds)) count += 1;
  }
  return count;
}

export async function getWorkflowNodeReadinessFactsForAgent(
  ctx: DbCtx,
  agentId: Id<'agents'>,
): Promise<WorkflowNodeReadinessFacts> {
  const workflow = await ctx.db.query('workflows')
    .withIndex('by_agentId', (q) => q.eq('agentId', agentId))
    .unique();
  const [mediaRows, services, edges] = await Promise.all([
    ctx.db.query('mediaUploads')
      .withIndex('by_agentId', (q) => q.eq('agentId', agentId))
      .take(MAX_RUNTIME_MEDIA),
    ctx.db.query('appointmentServices')
      .withIndex('by_agentId_and_isActive', (q) => q.eq('agentId', agentId).eq('isActive', true))
      .take(MAX_RUNTIME_SERVICES),
    workflow === null
      ? Promise.resolve([])
      : ctx.db.query('workflowEdges')
        .withIndex('by_workflowId', (q) => q.eq('workflowId', workflow._id))
        .take(MAX_WORKFLOW_EDGES + 1),
  ]);
  if (edges.length > MAX_WORKFLOW_EDGES) {
    throw new Error('Workflow edge limit exceeded');
  }

  return {
    readyMediaNodeIds: new Set(mediaRows.flatMap((row) => (
      row.purpose === MediaUploadPurpose.WorkflowSendMedia &&
      row.status === 'ready' &&
      row.workflowNodeId !== undefined
        ? [row.workflowNodeId]
        : []
    ))),
    activeAppointmentServiceIds: new Set(
      services
        .filter((service) => service.archivedAt === undefined)
        .map((service) => service._id),
    ),
    configuredConditionNodeIds: new Set(
      edges
        .filter((edge) => Boolean(edge.detail?.trim()))
        .map((edge) => edge.targetNodeId),
    ),
  };
}

export async function refreshWorkflowNodeReadinessForAgent(
  ctx: MutationCtx,
  agentId: Id<'agents'>,
) {
  const workflow = await ctx.db.query('workflows')
    .withIndex('by_agentId', (q) => q.eq('agentId', agentId))
    .unique();
  if (workflow === null) return;

  const [nodes, facts] = await Promise.all([
    ctx.db.query('workflowNodes')
      .withIndex('by_workflowId', (q) => q.eq('workflowId', workflow._id))
      .take(MAX_WORKFLOW_NODES),
    getWorkflowNodeReadinessFactsForAgent(ctx, agentId),
  ]);
  for (const node of nodes) {
    const readinessIssueCount = getWorkflowNodeReadinessIssueCount(node, facts);
    const isReady = readinessIssueCount === 0;
    if (
      node.isReady !== isReady ||
      node.readinessIssueCount !== readinessIssueCount
    ) {
      await ctx.db.patch(node._id, { isReady, readinessIssueCount });
    }
  }
}
