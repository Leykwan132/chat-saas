import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { getWorkflowLayoutNodeSize } from './workflowLayout';
import type {
  WorkflowEdgeRoutePoint,
  WorkflowGraph,
  WorkflowLayoutOrientation,
} from './workflowTypes';

const DIRECT_EDGE_Y_TOLERANCE = 24;
const EDGE_NODE_CLEARANCE = 32;
const EDGE_LEAD_DISTANCE = 45;
const EDGE_MIN_DETOUR_DISTANCE = 96;
const EDGE_INTERSECTION_PENALTY = 1000;

type NodeRect = {
  nodeId: Id<'workflowNodes'>;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

type EdgeEndpoint = {
  x: number;
  y: number;
};

function getNodeRect(node: Doc<'workflowNodes'>): NodeRect {
  const size = getWorkflowLayoutNodeSize(node);

  return {
    nodeId: node._id,
    left: node.positionX,
    right: node.positionX + size.width,
    top: node.positionY,
    bottom: node.positionY + size.height,
    centerX: node.positionX + size.width / 2,
    centerY: node.positionY + size.height / 2,
  };
}

function crossesHorizontalCorridor(
  rect: NodeRect,
  y: number,
  left: number,
  right: number,
) {
  return (
    y >= rect.top - EDGE_NODE_CLEARANCE &&
    y <= rect.bottom + EDGE_NODE_CLEARANCE &&
    rect.left < right &&
    rect.right > left
  );
}

function countHorizontalIntersections(
  rects: NodeRect[],
  y: number,
  left: number,
  right: number,
) {
  return rects.filter((rect) => (
    crossesHorizontalCorridor(rect, y, left, right)
  )).length;
}

function getDetourY(
  source: EdgeEndpoint,
  blockers: NodeRect[],
  obstacleRects: NodeRect[],
  left: number,
  right: number,
) {
  const topY = Math.min(...blockers.map((rect) => rect.top)) - EDGE_NODE_CLEARANCE;
  const bottomY = Math.max(...blockers.map((rect) => rect.bottom)) + EDGE_NODE_CLEARANCE;
  const topScore = (
    Math.abs(source.y - topY) +
    countHorizontalIntersections(obstacleRects, topY, left, right) * EDGE_INTERSECTION_PENALTY
  );
  const bottomScore = (
    Math.abs(source.y - bottomY) +
    countHorizontalIntersections(obstacleRects, bottomY, left, right) * EDGE_INTERSECTION_PENALTY
  );

  return topScore <= bottomScore ? topY : bottomY;
}

function getHorizontalDetour(
  source: EdgeEndpoint,
  target: EdgeEndpoint,
  obstacleRects: NodeRect[],
): WorkflowEdgeRoutePoint[] | undefined {
  const distanceX = target.x - source.x;
  if (distanceX < EDGE_MIN_DETOUR_DISTANCE) return undefined;
  if (Math.abs(source.y - target.y) > DIRECT_EDGE_Y_TOLERANCE) return undefined;

  const blockers = obstacleRects.filter((rect) => (
    crossesHorizontalCorridor(rect, source.y, source.x, target.x)
  ));
  if (blockers.length === 0) return undefined;

  const leadDistance = Math.min(EDGE_LEAD_DISTANCE, Math.max(16, distanceX / 4));
  const sourceLeadX = source.x + leadDistance;
  const targetLeadX = target.x - leadDistance;
  const detourY = getDetourY(source, blockers, obstacleRects, source.x, target.x);

  return [
    { x: sourceLeadX, y: source.y },
    { x: sourceLeadX, y: detourY },
    { x: targetLeadX, y: detourY },
    { x: targetLeadX, y: target.y },
  ];
}

export function getWorkflowEdgeRoutes(
  graph: WorkflowGraph,
  orientation: WorkflowLayoutOrientation = 'horizontal',
) {
  if (orientation === 'vertical') return new Map<Id<'workflowEdges'>, WorkflowEdgeRoutePoint[]>();

  const rectsByNodeId = new Map(
    graph.nodes.map((node) => [node._id, getNodeRect(node)]),
  );
  const routes = new Map<Id<'workflowEdges'>, WorkflowEdgeRoutePoint[]>();

  for (const edge of graph.edges) {
    const sourceRect = rectsByNodeId.get(edge.sourceNodeId);
    const targetRect = rectsByNodeId.get(edge.targetNodeId);
    if (!sourceRect || !targetRect) continue;

    const obstacleRects = [...rectsByNodeId.values()].filter((rect) => (
      rect.nodeId !== sourceRect.nodeId &&
      rect.nodeId !== targetRect.nodeId
    ));
    const source = { x: sourceRect.right, y: sourceRect.centerY };
    const target = { x: targetRect.left, y: targetRect.centerY };
    const routePoints = getHorizontalDetour(source, target, obstacleRects);

    if (routePoints) {
      routes.set(edge._id, routePoints);
    }
  }

  return routes;
}
