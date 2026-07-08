import { expect, test } from 'vitest';
import type { Id } from '../../../convex/_generated/dataModel';
import { getLandingPreviewSection } from './landingAppPreviewData';
import { createLandingWorkflowGraph } from './landingWorkflowMockGraph';
import {
  addLandingPreviewWorkflowNode,
  removeLandingPreviewWorkflowEdge,
  updateLandingPreviewWorkflowNode,
} from './landingWorkflowPreviewGraph';

const baseGraph = () => createLandingWorkflowGraph(getLandingPreviewSection('workflow').workflow);

test('landing workflow preview adds selected nodes locally after a plus menu choice', () => {
  const graph = baseGraph();
  const sourceNodeId = graph.nodes[0]._id;

  const result = addLandingPreviewWorkflowNode(graph, sourceNodeId, 'sendText');

  expect(result.nodeId).toBe('landing-preview-node-entry-sendText-4');
  expect(result.graph.nodes).toHaveLength(4);
  expect(result.graph.nodes.at(-1)).toMatchObject({
    _id: result.nodeId,
    kind: 'sendText',
    title: 'Send message',
    description: 'Write the exact message the AI should send when this workflow condition matches.',
  });
  expect(result.graph.edges.at(-1)).toMatchObject({
    sourceNodeId,
    targetNodeId: result.nodeId,
    label: 'Send message',
  });
});

test('landing workflow preview updates the local inspector node and edge values', () => {
  const graph = baseGraph();
  const result = addLandingPreviewWorkflowNode(graph, graph.nodes[1]._id, 'bookAppointment');
  const nextGraph = updateLandingPreviewWorkflowNode(result.graph, result.nodeId, {
    conditionDetail: 'When the lead wants a weekday showroom tour.',
    conditionName: 'Visit ready',
    description: 'Offer the best available showroom slot.',
    name: 'Schedule visit',
  });

  expect(nextGraph.nodes.find((node) => node._id === result.nodeId)).toMatchObject({
    title: 'Schedule visit',
    description: 'Offer the best available showroom slot.',
  });
  expect(nextGraph.edges.find((edge) => edge.targetNodeId === result.nodeId)).toMatchObject({
    label: 'Visit ready',
    detail: 'When the lead wants a weekday showroom tour.',
  });
});

test('landing workflow preview removes local edges without backend calls', () => {
  const graph = baseGraph();
  const edgeId = graph.edges[0]._id as Id<'workflowEdges'>;

  expect(removeLandingPreviewWorkflowEdge(graph, edgeId).edges.map((edge) => edge._id)).not.toContain(edgeId);
});
