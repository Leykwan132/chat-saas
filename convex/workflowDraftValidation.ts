import type { Id } from './_generated/dataModel';
import type { WorkflowNodeKind } from '../shared/workflows';
import { isWorkflowTerminalNodeKind } from '../shared/workflows';
import { MAX_WORKFLOW_EDGES, MAX_WORKFLOW_NODES } from './workflowCore';

export type WorkflowDraftNodeInput = {
  clientId: string;
  persistedNodeId?: Id<'workflowNodes'>;
  kind: WorkflowNodeKind;
  title: string;
  description?: string;
  notes?: string;
  allowedAppointmentServiceIds?: Id<'appointmentServices'>[];
  positionX: number;
  positionY: number;
};

export type WorkflowDraftEdgeInput = {
  sourceClientId: string;
  targetClientId: string;
  label?: string;
  detail?: string;
};

export function validateWorkflowDraft(
  nodes: WorkflowDraftNodeInput[],
  edges: WorkflowDraftEdgeInput[],
) {
  if (nodes.length > MAX_WORKFLOW_NODES) throw new Error('Workflow node limit reached');
  if (edges.length > MAX_WORKFLOW_EDGES) throw new Error('Workflow edge limit reached');
  const nodeByClientId = new Map(nodes.map((node) => [node.clientId, node]));
  if (nodeByClientId.size !== nodes.length) throw new Error('Workflow node identifiers must be unique');
  if (nodes.filter((node) => node.kind === 'start').length !== 1) {
    throw new Error('Workflow must contain exactly one entry node');
  }
  const persistedIds = nodes.flatMap((node) => node.persistedNodeId ? [node.persistedNodeId] : []);
  if (new Set(persistedIds).size !== persistedIds.length) {
    throw new Error('Persisted workflow node identifiers must be unique');
  }
  for (const node of nodes) {
    if (!node.clientId.trim()) throw new Error('Workflow node identifier is required');
    if (!node.title.trim()) throw new Error('Workflow node title is required');
    if (!Number.isFinite(node.positionX) || !Number.isFinite(node.positionY)) {
      throw new Error('Workflow node positions must be finite');
    }
  }
  const edgeKeys = new Set<string>();
  for (const edge of edges) {
    const source = nodeByClientId.get(edge.sourceClientId);
    const target = nodeByClientId.get(edge.targetClientId);
    if (!source || !target) throw new Error('Workflow edge references an unknown node');
    if (source.clientId === target.clientId) throw new Error('Cannot connect a node to itself');
    if (isWorkflowTerminalNodeKind(source.kind)) throw new Error('Cannot connect from a terminal node');
    if (target.kind === 'start') throw new Error('Cannot connect to the entry node');
    if (!edge.detail?.trim()) throw new Error('Condition detail is required');
    const edgeKey = `${source.clientId}\u0000${target.clientId}`;
    if (edgeKeys.has(edgeKey)) throw new Error('Workflow edges must be unique');
    edgeKeys.add(edgeKey);
  }
}
