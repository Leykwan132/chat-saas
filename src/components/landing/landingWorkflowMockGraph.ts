import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type { WorkflowNodeKind } from '../../../shared/workflows';
import type {
  LandingPreviewWorkflow,
  LandingPreviewWorkflowNode,
} from './landingAppPreviewData';
import type { WorkflowGraph } from '../workflow/workflowTypes';

const mockTimestamp = 1_783_468_800_000;
const mockWorkflowId = 'landing-preview-workflow' as Id<'workflows'>;

const kindMap = {
  start: 'start',
  ai: 'updateLeadsStatus',
  message: 'sendText',
  booking: 'bookAppointment',
  handoff: 'humanEscalation',
  file: 'sendFile',
  image: 'sendImage',
} satisfies Record<LandingPreviewWorkflowNode['kind'], WorkflowNodeKind>;

function workflowNodeId(id: string) {
  return `landing-workflow-node-${id}` as Id<'workflowNodes'>;
}

function workflowEdgeId(id: string) {
  return `landing-workflow-edge-${id}` as Id<'workflowEdges'>;
}

function getNodePosition(index: number, totalNodes: number) {
  if (totalNodes === 3) {
    const positions = [
      { x: 360, y: 72 },
      { x: 168, y: 284 },
      { x: 552, y: 284 },
    ];

    return positions[index];
  }

  if (index === 0) {
    return { x: 520, y: 40 };
  }

  return {
    x: (index - 1) * 320,
    y: 300,
  };
}

export function createLandingWorkflowGraph(workflow: LandingPreviewWorkflow): WorkflowGraph {
  const workflowDoc: Doc<'workflows'> = {
    _id: mockWorkflowId,
    _creationTime: mockTimestamp,
    agentId: 'landing-preview-agent' as Id<'agents'>,
    orgId: 'landing-preview-org',
    userId: 'landing-preview-user',
    name: 'Landing preview workflow',
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  };

  return {
    workflow: workflowDoc,
    nodes: workflow.nodes.map((node, index) => {
      const position = getNodePosition(index, workflow.nodes.length);
      return {
        _id: workflowNodeId(node.id),
        _creationTime: mockTimestamp + index,
        workflowId: mockWorkflowId,
        kind: kindMap[node.kind],
        title: node.title,
        description: node.description,
        positionX: position.x,
        positionY: position.y,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      } satisfies Doc<'workflowNodes'>;
    }),
    edges: workflow.edges.map((edge, index) => ({
      _id: workflowEdgeId(edge.id),
      _creationTime: mockTimestamp + index,
      workflowId: mockWorkflowId,
      sourceNodeId: workflowNodeId(edge.source),
      targetNodeId: workflowNodeId(edge.target),
      label: edge.label,
      detail: edge.label,
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
    }) satisfies Doc<'workflowEdges'>),
  };
}
