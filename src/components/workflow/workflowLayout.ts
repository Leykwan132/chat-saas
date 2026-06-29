import {
  Graph,
  layout,
  type EdgeLabel,
  type GraphLabel,
  type NodeLabel,
} from '@dagrejs/dagre';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  isWorkflowTerminalNodeKind,
  workflowNodeDisplayTitle,
} from '../../../shared/workflows';
import type { WorkflowGraph } from './workflowTypes';

const NODE_MIN_WIDTH = 176;
const NODE_DESCRIPTION_WIDTH = 220;
const NODE_MAX_WIDTH = 300;
const NODE_MIN_HEIGHT = 80;
const NODE_DESCRIPTION_HEIGHT = 126;
const TITLE_CHARACTER_WIDTH = 11;
const DESCRIPTION_CHARACTER_WIDTH = 7;
const NODE_HORIZONTAL_PADDING = 72;
const NODE_DESCRIPTION_MAX_TEXT_WIDTH = 260;
const NODE_DESCRIPTION_HORIZONTAL_PADDING = 48;
const NODE_COLLISION_GAP = 56;
const RANK_Y_TOLERANCE = 24;
const NODE_CONTROL_BUTTON_WIDTH = 36;
const NODE_CONTROL_OFFSET = 16;
const NODE_CONTROL_GAP = 8;

export type WorkflowCleanupPosition = {
  nodeId: Id<'workflowNodes'>;
  position: {
    x: number;
    y: number;
  };
};

type WorkflowLayoutPosition = WorkflowCleanupPosition & {
  width: number;
  height: number;
  centerY: number;
};

export function getWorkflowLayoutNodeSize(node: WorkflowGraph['nodes'][number]) {
  const title = workflowNodeDisplayTitle(node.kind, node.title);
  const titleWidth = title.length * TITLE_CHARACTER_WIDTH + NODE_HORIZONTAL_PADDING;
  const descriptionWidth = node.description
    ? Math.min(
      node.description.length * DESCRIPTION_CHARACTER_WIDTH,
      NODE_DESCRIPTION_MAX_TEXT_WIDTH,
    ) + NODE_DESCRIPTION_HORIZONTAL_PADDING
    : 0;
  const minWidth = node.description ? NODE_DESCRIPTION_WIDTH : NODE_MIN_WIDTH;

  return {
    width: Math.min(NODE_MAX_WIDTH, Math.max(minWidth, titleWidth, descriptionWidth)),
    height: node.description ? NODE_DESCRIPTION_HEIGHT : NODE_MIN_HEIGHT,
  };
}

function getWorkflowNodeControlRailWidth(node: WorkflowGraph['nodes'][number]) {
  const controlCount = Number(!isWorkflowTerminalNodeKind(node.kind)) +
    Number(node.kind !== 'start' && node.kind !== 'end');
  if (controlCount === 0) return 0;

  return (
    NODE_CONTROL_OFFSET +
    controlCount * NODE_CONTROL_BUTTON_WIDTH +
    (controlCount - 1) * NODE_CONTROL_GAP
  );
}

export function getWorkflowCleanupNodeSize(node: WorkflowGraph['nodes'][number]) {
  const size = getWorkflowLayoutNodeSize(node);

  return {
    ...size,
    width: size.width + getWorkflowNodeControlRailWidth(node),
  };
}

function resolveRowOverlaps(items: WorkflowLayoutPosition[]) {
  if (items.length < 2) return items;

  const sorted = [...items].sort((a, b) => a.position.x - b.position.x);
  const originalLeft = Math.min(...sorted.map((item) => item.position.x));
  const originalRight = Math.max(...sorted.map((item) => item.position.x + item.width));
  let previousRight = Number.NEGATIVE_INFINITY;

  const adjusted = sorted.map((item) => {
    const x = Math.max(item.position.x, previousRight + NODE_COLLISION_GAP);
    previousRight = x + item.width;
    return {
      ...item,
      position: {
        ...item.position,
        x,
      },
    };
  });

  const adjustedLeft = Math.min(...adjusted.map((item) => item.position.x));
  const adjustedRight = Math.max(...adjusted.map((item) => item.position.x + item.width));
  const centerOffset = (originalLeft + originalRight - adjustedLeft - adjustedRight) / 2;

  return adjusted.map((item) => ({
    ...item,
    position: {
      ...item.position,
      x: item.position.x + centerOffset,
    },
  }));
}

function resolveLayoutOverlaps(items: WorkflowLayoutPosition[]) {
  const rankGroups = new Map<number, WorkflowLayoutPosition[]>();

  for (const item of items) {
    const rankKey = Math.round(item.centerY / RANK_Y_TOLERANCE);
    rankGroups.set(rankKey, [...(rankGroups.get(rankKey) ?? []), item]);
  }

  return [...rankGroups.values()].flatMap(resolveRowOverlaps);
}

export function getWorkflowCleanupPositions(
  graph: WorkflowGraph,
): WorkflowCleanupPosition[] {
  const layoutGraph = new Graph<GraphLabel, NodeLabel, EdgeLabel>()
    .setDefaultEdgeLabel(() => ({}))
    .setGraph({
      rankdir: 'TB',
      ranksep: 90,
      nodesep: 80,
      edgesep: 32,
      marginx: 0,
      marginy: 0,
    });

  const nodeSizeById = new Map<
    Id<'workflowNodes'>,
    ReturnType<typeof getWorkflowLayoutNodeSize>
  >();

  for (const node of graph.nodes) {
    const size = getWorkflowLayoutNodeSize(node);
    nodeSizeById.set(node._id, size);
    layoutGraph.setNode(node._id, size);
  }

  for (const edge of graph.edges) {
    layoutGraph.setEdge(edge.sourceNodeId, edge.targetNodeId);
  }

  layout(layoutGraph);

  const positions = graph.nodes.flatMap<WorkflowLayoutPosition>((node) => {
    const layoutNode = layoutGraph.node(node._id);
    const size = nodeSizeById.get(node._id);
    if (
      !layoutNode ||
      !size ||
      layoutNode.x === undefined ||
      layoutNode.y === undefined
    ) {
      return [];
    }

    return [{
      nodeId: node._id,
      position: {
        x: layoutNode.x - size.width / 2,
        y: layoutNode.y - size.height / 2,
      },
      width: getWorkflowCleanupNodeSize(node).width,
      height: size.height,
      centerY: layoutNode.y,
    }];
  });

  const positionByNodeId = new Map(
    resolveLayoutOverlaps(positions).map((item) => [item.nodeId, item]),
  );

  return graph.nodes.flatMap((node) => {
    const item = positionByNodeId.get(node._id);
    if (!item) return [];

    return [{
      nodeId: item.nodeId,
      position: item.position,
    }];
  });
}
