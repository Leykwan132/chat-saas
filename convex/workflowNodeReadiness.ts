import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { workflowNodeDescription } from '../shared/workflows';

const MAX_RUNTIME_MEDIA = 500;
const MAX_RUNTIME_SERVICES = 100;
const MAX_WORKFLOW_NODES = 100;
const MAX_ROUTING_SCHEDULES = 100;

type DbCtx = Pick<QueryCtx, 'db'> | Pick<MutationCtx, 'db'>;

export type WorkflowNodeReadinessFacts = {
  readyMediaNodeIds: Set<Id<'workflowNodes'>>;
  activeAppointmentServiceIds: Set<Id<'appointmentServices'>>;
  hasAcceptingLeadMember: boolean;
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
  if (node.kind === 'sendText') return hasConfiguredMessage(node);
  if (node.kind === 'sendImage' || node.kind === 'sendFile') {
    return facts.readyMediaNodeIds.has(node._id);
  }
  if (node.kind === 'bookAppointment') {
    return (
      facts.hasAcceptingLeadMember &&
      hasActiveAllowedService(node, facts.activeAppointmentServiceIds)
    );
  }
  return true;
}

export async function getWorkflowNodeReadinessFactsForAgent(
  ctx: DbCtx,
  agentId: Id<'agents'>,
): Promise<WorkflowNodeReadinessFacts> {
  const [mediaRows, services, schedules] = await Promise.all([
    ctx.db.query('mediaUploads')
      .withIndex('by_agentId', (q) => q.eq('agentId', agentId))
      .take(MAX_RUNTIME_MEDIA),
    ctx.db.query('appointmentServices')
      .withIndex('by_agentId_and_isActive', (q) => q.eq('agentId', agentId).eq('isActive', true))
      .take(MAX_RUNTIME_SERVICES),
    ctx.db.query('userSchedules')
      .withIndex('by_agentId', (q) => q.eq('agentId', agentId))
      .take(MAX_ROUTING_SCHEDULES),
  ]);

  return {
    readyMediaNodeIds: new Set(mediaRows.flatMap((row) => (
      row.purpose === 'workflowSendMedia' &&
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
    hasAcceptingLeadMember: schedules.some((schedule) => schedule.enabled),
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
    const isReady = getWorkflowNodeReadiness(node, facts);
    if (node.isReady !== isReady) {
      await ctx.db.patch(node._id, { isReady });
    }
  }
}
