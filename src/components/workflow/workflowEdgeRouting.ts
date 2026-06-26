import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { getWorkflowLayoutNodeSize } from './workflowLayout';
import type {
  WorkflowEdgeRoutePoint,
  WorkflowGraph,
} from './workflowTypes';

const DIRECT_EDGE_X_TOLERANCE = 24;
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
  };
}

function crossesVerticalCorridor(
  rect: NodeRect,
  x: number,
  top: number,
  bottom: number,
) {
  return (
    x >= rect.left - EDGE_NODE_CLEARANCE &&
    x <= rect.right + EDGE_NODE_CLEARANCE &&
    rect.top < bottom &&
    rect.bottom > top
  );
}

function countVerticalIntersections(
  rects: NodeRect[],
  x: number,
  top: number,
  bottom: number,
) {
  return rects.filter((rect) => (
    crossesVerticalCorridor(rect, x, top, bottom)
  )).length;
}

function getDetourX(
  source: EdgeEndpoint,
  blockers: NodeRect[],
  obstacleRects: NodeRect[],
  top: number,
  bottom: number,
) {
  const leftX = Math.min(...blockers.map((rect) => rect.left)) - EDGE_NODE_CLEARANCE;
  const rightX = Math.max(...blockers.map((rect) => rect.right)) + EDGE_NODE_CLEARANCE;
  const leftScore = (
    Math.abs(source.x - leftX) +
    countVerticalIntersections(obstacleRects, leftX, top, bottom) * EDGE_INTERSECTION_PENALTY
  );
  const rightScore = (
    Math.abs(source.x - rightX) +
    countVerticalIntersections(obstacleRects, rightX, top, bottom) * EDGE_INTERSECTION_PENALTY
  );

  return leftScore <= rightScore ? leftX : rightX;
}

function getVerticalDetour(
  source: EdgeEndpoint,
  target: EdgeEndpoint,
  obstacleRects: NodeRect[],
): WorkflowEdgeRoutePoint[] | undefined {
  const distanceY = target.y - source.y;
  if (distanceY < EDGE_MIN_DETOUR_DISTANCE) return undefined;
  if (Math.abs(source.x - target.x) > DIRECT_EDGE_X_TOLERANCE) return undefined;

  const blockers = obstacleRects.filter((rect) => (
    crossesVerticalCorridor(rect, source.x, source.y, target.y)
  ));
  if (blockers.length === 0) return undefined;

  const leadDistance = Math.min(EDGE_LEAD_DISTANCE, Math.max(16, distanceY / 4));
  const sourceLeadY = source.y + leadDistance;
  const targetLeadY = target.y - leadDistance;
  const detourX = getDetourX(source, blockers, obstacleRects, source.y, target.y);

  return [
    { x: source.x, y: sourceLeadY },
    { x: detourX, y: sourceLeadY },
    { x: detourX, y: targetLeadY },
    { x: target.x, y: targetLeadY },
  ];
}

export function getWorkflowEdgeRoutes(graph: WorkflowGraph) {
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
    const source = { x: sourceRect.centerX, y: sourceRect.bottom };
    const target = { x: targetRect.centerX, y: targetRect.top };
    const routePoints = getVerticalDetour(source, target, obstacleRects);

    if (routePoints) {
      routes.set(edge._id, routePoints);
    }
  }

  return routes;
}
