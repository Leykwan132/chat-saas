import type { Doc, Id } from '../../../convex/_generated/dataModel';
import {
  isWorkflowTerminalNodeKind,
  type AddableWorkflowNodeKind,
  workflowNodeDefaultCondition,
  workflowNodeDescription,
  workflowNodeTitle,
} from '../../../shared/workflows';
import { getWorkflowCleanupPositions } from './workflowLayout';
import type { WorkflowGraph, WorkflowLayoutOrientation } from './workflowTypes';

const DRAFT_NODE_PREFIX = 'draft-node:';
const DRAFT_EDGE_PREFIX = 'draft-edge:';

type EditableNodeFields = Pick<
  Doc<'workflowNodes'>,
  'title' | 'description' | 'notes' | 'allowedAppointmentServiceIds' | 'positionX' | 'positionY'
>;

type EditableEdgeFields = Pick<Doc<'workflowEdges'>, 'label' | 'detail'>;

function draftId<T extends 'workflowNodes' | 'workflowEdges'>(prefix: string) {
  return `${prefix}${crypto.randomUUID()}` as Id<T>;
}

function cloneGraph(graph: WorkflowGraph): WorkflowGraph {
  return {
    workflow: { ...graph.workflow },
    nodes: graph.nodes.map((node) => ({
      ...node,
      allowedAppointmentServiceIds: node.allowedAppointmentServiceIds
        ? [...node.allowedAppointmentServiceIds]
        : undefined,
    })),
    edges: graph.edges.map((edge) => ({ ...edge })),
    automations: {
      reminder: {
        ...graph.automations.reminder,
        selections: { ...graph.automations.reminder.selections },
        timingOptionIds: [...graph.automations.reminder.timingOptionIds],
        customTimingOptions: graph.automations.reminder.customTimingOptions.map((option) => ({ ...option })),
        template: graph.automations.reminder.template
          ? { ...graph.automations.reminder.template }
          : undefined,
      },
      followUp: {
        ...graph.automations.followUp,
        selections: { ...graph.automations.followUp.selections },
        audienceFilters: [...graph.automations.followUp.audienceFilters],
        sameTemplate: graph.automations.followUp.sameTemplate
          ? { ...graph.automations.followUp.sameTemplate }
          : undefined,
        attemptTemplates: graph.automations.followUp.attemptTemplates.map((template) => ({ ...template })),
      },
    },
  };
}

function canonicalGraph(graph: WorkflowGraph) {
  return {
    layoutOrientation: graph.workflow.layoutOrientation ?? 'horizontal',
    nodes: graph.nodes.map((node) => ({
      id: node._id,
      kind: node.kind,
      title: node.title,
      description: node.description,
      notes: node.notes,
      allowedAppointmentServiceIds: [...(node.allowedAppointmentServiceIds ?? [])].sort(),
      positionX: node.positionX,
      positionY: node.positionY,
    })).sort((left, right) => left.id.localeCompare(right.id)),
    edges: graph.edges.map((edge) => ({
      id: edge._id,
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: edge.targetNodeId,
      label: edge.label,
      detail: edge.detail,
    })).sort((left, right) => left.id.localeCompare(right.id)),
    automations: graph.automations,
  };
}

export function createWorkflowDraft(graph: WorkflowGraph) {
  return cloneGraph(graph);
}

export function workflowDraftsEqual(first: WorkflowGraph, second: WorkflowGraph) {
  return JSON.stringify(canonicalGraph(first)) === JSON.stringify(canonicalGraph(second));
}

export function isDraftWorkflowNodeId(nodeId: Id<'workflowNodes'>) {
  return nodeId.startsWith(DRAFT_NODE_PREFIX);
}

export function addDraftNodeAfter(
  graph: WorkflowGraph,
  sourceNodeId: Id<'workflowNodes'>,
  kind: AddableWorkflowNodeKind,
) {
  const sourceNode = graph.nodes.find((node) => node._id === sourceNodeId);
  if (!sourceNode || isWorkflowTerminalNodeKind(sourceNode.kind)) return graph;
  const siblingCount = graph.edges.filter((edge) => edge.sourceNodeId === sourceNodeId).length;
  const nodeId = draftId<'workflowNodes'>(DRAFT_NODE_PREFIX);
  const edgeId = draftId<'workflowEdges'>(DRAFT_EDGE_PREFIX);
  const now = Date.now();
  const condition = workflowNodeDefaultCondition(kind);
  const node: Doc<'workflowNodes'> = {
    _id: nodeId,
    _creationTime: now,
    workflowId: graph.workflow._id,
    kind,
    title: workflowNodeTitle(kind),
    description: workflowNodeDescription(kind),
    positionX: sourceNode.positionX + 300,
    positionY: sourceNode.positionY + siblingCount * 150,
    createdAt: now,
    updatedAt: now,
  };
  const edge: Doc<'workflowEdges'> = {
    _id: edgeId,
    _creationTime: now,
    workflowId: graph.workflow._id,
    sourceNodeId,
    targetNodeId: nodeId,
    label: condition?.label,
    detail: condition?.detail,
    createdAt: now,
    updatedAt: now,
  };
  return { ...cloneGraph(graph), nodes: [...graph.nodes, node], edges: [...graph.edges, edge] };
}

export function updateDraftNode(
  graph: WorkflowGraph,
  nodeId: Id<'workflowNodes'>,
  patch: Partial<EditableNodeFields>,
) {
  return {
    ...cloneGraph(graph),
    nodes: graph.nodes.map((node) => node._id === nodeId ? { ...node, ...patch } : { ...node }),
  };
}

export function updateDraftEdge(
  graph: WorkflowGraph,
  edgeId: Id<'workflowEdges'>,
  patch: Partial<EditableEdgeFields>,
) {
  return {
    ...cloneGraph(graph),
    edges: graph.edges.map((edge) => edge._id === edgeId ? { ...edge, ...patch } : { ...edge }),
  };
}

export function updateDraftAutomations(
  graph: WorkflowGraph,
  automations: WorkflowGraph['automations'],
) {
  return cloneGraph({ ...graph, automations });
}

export function connectDraftNodes(
  graph: WorkflowGraph,
  sourceNodeId: Id<'workflowNodes'>,
  targetNodeId: Id<'workflowNodes'>,
) {
  if (sourceNodeId === targetNodeId) return graph;
  if (graph.edges.some((edge) => edge.sourceNodeId === sourceNodeId && edge.targetNodeId === targetNodeId)) return graph;
  const now = Date.now();
  return {
    ...cloneGraph(graph),
    edges: [...graph.edges, {
      _id: draftId<'workflowEdges'>(DRAFT_EDGE_PREFIX),
      _creationTime: now,
      workflowId: graph.workflow._id,
      sourceNodeId,
      targetNodeId,
      createdAt: now,
      updatedAt: now,
    }],
  };
}

export function removeDraftEdge(graph: WorkflowGraph, edgeId: Id<'workflowEdges'>) {
  return { ...cloneGraph(graph), edges: graph.edges.filter((edge) => edge._id !== edgeId) };
}

export function removeDraftNode(graph: WorkflowGraph, nodeId: Id<'workflowNodes'>) {
  const node = graph.nodes.find((item) => item._id === nodeId);
  if (!node || node.kind === 'start') return graph;
  const incoming = graph.edges.filter((edge) => edge.targetNodeId === nodeId);
  const outgoing = graph.edges.filter((edge) => edge.sourceNodeId === nodeId);
  const remainingEdges = graph.edges.filter(
    (edge) => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId,
  );
  const now = Date.now();
  const bridgedEdges = incoming.flatMap((sourceEdge) => outgoing.flatMap((targetEdge) => {
    const duplicate = remainingEdges.some(
      (edge) => edge.sourceNodeId === sourceEdge.sourceNodeId && edge.targetNodeId === targetEdge.targetNodeId,
    );
    if (duplicate || sourceEdge.sourceNodeId === targetEdge.targetNodeId) return [];
    return [{
      _id: draftId<'workflowEdges'>(DRAFT_EDGE_PREFIX),
      _creationTime: now,
      workflowId: graph.workflow._id,
      sourceNodeId: sourceEdge.sourceNodeId,
      targetNodeId: targetEdge.targetNodeId,
      label: targetEdge.label,
      detail: targetEdge.detail,
      createdAt: now,
      updatedAt: now,
    } satisfies Doc<'workflowEdges'>];
  }));
  return {
    ...cloneGraph(graph),
    nodes: graph.nodes.filter((item) => item._id !== nodeId),
    edges: [...remainingEdges, ...bridgedEdges],
  };
}

export function arrangeDraftWorkflow(
  graph: WorkflowGraph,
  orientation: WorkflowLayoutOrientation,
) {
  const positionByNodeId = new Map(
    getWorkflowCleanupPositions(graph, orientation).map((item) => [item.nodeId, item.position]),
  );
  return {
    workflow: { ...graph.workflow, layoutOrientation: orientation },
    automations: structuredClone(graph.automations),
    nodes: graph.nodes.map((node) => {
      const position = positionByNodeId.get(node._id);
      return position ? { ...node, positionX: position.x, positionY: position.y } : { ...node };
    }),
    edges: graph.edges.map((edge) => ({ ...edge })),
  };
}
