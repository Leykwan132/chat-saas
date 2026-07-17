import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { createInitialWorkflowAutomationConfigs } from '../../../shared/workflowAutomations';
import {
  workflowNodeDefaultCondition,
  workflowNodeDescription,
  workflowNodeTitle,
  type WorkflowNodeKind,
} from '../../../shared/workflows';
import { getWorkflowCleanupPositions } from './workflowLayout';
import type { WorkflowGraph } from './workflowTypes';

export type WorkflowTemplateId = 'qa' | 'real-estate' | 'e-commerce';

export type WorkflowTemplate = {
  id: WorkflowTemplateId;
  name: string;
  description: string;
  graph: WorkflowGraph;
};

type TemplateNode = {
  key: string;
  kind: WorkflowNodeKind;
  title?: string;
  description?: string;
  condition?: { label: string; detail: string };
};

const when = (label: string, detail: string) => ({ label, detail });

function layoutTemplateGraph(graph: WorkflowGraph): WorkflowGraph {
  const positionByNodeId = new Map(
    getWorkflowCleanupPositions(graph, 'horizontal').map(({ nodeId, position }) => [nodeId, position]),
  );
  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      const position = positionByNodeId.get(node._id);
      if (!position) throw new Error(`Missing template layout position for ${node._id}`);
      return { ...node, positionX: position.x, positionY: position.y };
    }),
  };
}

function buildTemplate(
  id: WorkflowTemplateId,
  name: string,
  description: string,
  actions: TemplateNode[],
): WorkflowTemplate {
  const workflowId = `template-workflow:${id}` as Id<'workflows'>;
  const startId = `template-node:${id}:start` as Id<'workflowNodes'>;
  const workflow = {
    _id: workflowId,
    _creationTime: 0,
    agentId: `template-agent:${id}`,
    orgId: 'template',
    userId: 'template',
    name,
    layoutOrientation: 'horizontal',
    createdAt: 0,
    updatedAt: 0,
  } as Doc<'workflows'>;
  const startNode: Doc<'workflowNodes'> = {
    _id: startId,
    _creationTime: 0,
    workflowId,
    kind: 'start',
    title: workflowNodeTitle('start'),
    positionX: 0,
    positionY: 0,
    createdAt: 0,
    updatedAt: 0,
  };
  const nodes = actions.map<Doc<'workflowNodes'>>((action, index) => ({
    _id: `template-node:${id}:${action.key}` as Id<'workflowNodes'>,
    _creationTime: index + 1,
    workflowId,
    kind: action.kind,
    title: action.title ?? workflowNodeTitle(action.kind),
    description: action.description ?? workflowNodeDescription(action.kind),
    positionX: 0,
    positionY: 0,
    createdAt: 0,
    updatedAt: 0,
  }));
  const edges = nodes.map<Doc<'workflowEdges'>>((node, index) => {
    const condition = actions[index].condition ?? workflowNodeDefaultCondition(node.kind);
    return {
      _id: `template-edge:${id}:${index}` as Id<'workflowEdges'>,
      _creationTime: index + 1,
      workflowId,
      sourceNodeId: startId,
      targetNodeId: node._id,
      label: condition?.label,
      detail: condition?.detail,
      createdAt: 0,
      updatedAt: 0,
    };
  });
  const graph: WorkflowGraph = {
    workflow,
    automations: createInitialWorkflowAutomationConfigs(),
    nodes: [startNode, ...nodes],
    edges,
  };
  return { id, name, description, graph: layoutTemplateGraph(graph) };
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  buildTemplate('qa', 'Q&A', 'Share a helpful file, offer booking, and escalate when needed.', [
    {
      key: 'file',
      kind: 'sendFile',
      title: 'Send supporting files',
      condition: when('Needs supporting material', 'When the customer asks for a guide, document, brochure, or other supporting file.'),
    },
    {
      key: 'appointment',
      kind: 'bookAppointment',
      title: 'Book an appointment',
      condition: when('Ready to book', 'When the customer wants to schedule time for further help.'),
    },
    {
      key: 'escalation',
      kind: 'humanEscalation',
      condition: when('Needs human help', 'When the customer asks for a person or the AI cannot resolve the request safely or confidently.'),
    },
  ]),
  buildTemplate('real-estate', 'Real Estate', 'Share property media, arrange a viewing, and hand qualified leads to a person.', [
    {
      key: 'image',
      kind: 'sendImage',
      title: 'Send property photos',
      condition: when('Requests property photos', 'When the customer wants to see photos or other visual media for a property.'),
    },
    {
      key: 'file',
      kind: 'sendFile',
      title: 'Send property documents',
      condition: when('Requests property documents', 'When the customer asks for a brochure, floor plan, listing sheet, or other property document.'),
    },
    {
      key: 'appointment',
      kind: 'bookAppointment',
      title: 'Book a property viewing',
      condition: when('Ready to view', 'When the customer wants to schedule a property viewing.'),
    },
    {
      key: 'escalation',
      kind: 'humanEscalation',
      title: 'Escalate to a property agent',
      condition: when('Needs a property agent', 'When the customer asks for an agent or needs help beyond the configured property information.'),
    },
  ]),
  buildTemplate('e-commerce', 'E-commerce Product', 'Show product media, send useful files, arrange a demo, and escalate sales questions.', [
    {
      key: 'image',
      kind: 'sendImage',
      title: 'Send product images',
      condition: when('Requests product images', 'When the customer wants to see product images or other visual media.'),
    },
    {
      key: 'file',
      kind: 'sendFile',
      title: 'Send product files',
      condition: when('Requests a product guide', 'When the customer asks for a manual, specification sheet, brochure, or other product file.'),
    },
    {
      key: 'appointment',
      kind: 'bookAppointment',
      title: 'Book a product consultation',
      condition: when('Wants a consultation', 'When the customer wants to schedule time to discuss the product before purchasing.'),
    },
    {
      key: 'escalation',
      kind: 'humanEscalation',
      title: 'Escalate to a sales teammate',
      condition: when('Needs sales help', 'When the customer asks for a sales teammate or needs help beyond the configured product information.'),
    },
  ]),
];

export function createWorkflowGraphFromTemplate(
  currentGraph: WorkflowGraph,
  template: WorkflowTemplate,
) {
  const nodeIdMap = new Map<Id<'workflowNodes'>, Id<'workflowNodes'>>();
  const now = Date.now();
  const nodes = template.graph.nodes.map((node) => {
    const nodeId = `template-preview-node:${crypto.randomUUID()}` as Id<'workflowNodes'>;
    nodeIdMap.set(node._id, nodeId);
    return {
      ...node,
      _id: nodeId,
      _creationTime: now,
      workflowId: currentGraph.workflow._id,
      createdAt: now,
      updatedAt: now,
    };
  });
  const edges = template.graph.edges.map((edge) => ({
    ...edge,
    _id: `template-preview-edge:${crypto.randomUUID()}` as Id<'workflowEdges'>,
    _creationTime: now,
    workflowId: currentGraph.workflow._id,
    sourceNodeId: nodeIdMap.get(edge.sourceNodeId)!,
    targetNodeId: nodeIdMap.get(edge.targetNodeId)!,
    createdAt: now,
    updatedAt: now,
  }));
  return {
    workflow: { ...currentGraph.workflow, layoutOrientation: 'horizontal' as const },
    automations: structuredClone(currentGraph.automations),
    nodes,
    edges,
  };
}
