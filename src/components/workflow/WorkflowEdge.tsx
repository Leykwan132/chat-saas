import {
  BaseEdge,
  EdgeLabelRenderer,
  Position,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import type { WorkflowFlowEdge } from './workflowTypes';

export function WorkflowEdge({
  sourceX,
  sourceY,
  sourcePosition = Position.Bottom,
  targetX,
  targetY,
  targetPosition = Position.Top,
  markerEnd,
  markerStart,
  label,
  interactionWidth,
  style,
  selected,
  data,
}: EdgeProps<WorkflowFlowEdge>) {
  const [path, labelX, labelY] = data?.routePoints?.length
    ? getRoutedEdgePath(
      { x: sourceX, y: sourceY },
      data.routePoints,
      { x: targetX, y: targetY },
    )
    : getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

  return (
    <>
      <BaseEdge
        path={path}
        labelX={labelX}
        labelY={labelY}
        interactionWidth={interactionWidth}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 2.5 : style?.strokeWidth,
        }}
        className="workflow-edge"
      />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute z-50"
            onClick={(event) => {
              event.stopPropagation();
              data?.onSelectTargetNode?.();
            }}
            style={{
              pointerEvents: 'all',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              isolation: 'isolate',
            }}
          >
            <button
              type="button"
              className="relative z-10 flex max-w-48 truncate rounded-full bg-black px-2.5 py-1 text-xs font-medium text-white"
            >
              <span className="sr-only">Condition:</span>
              <span className="min-w-0 truncate">If: {label}</span>
            </button>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

function getRoutedEdgePath(
  source: { x: number; y: number },
  routePoints: { x: number; y: number }[],
  target: { x: number; y: number },
): [string, number, number] {
  const sourceLead = routePoints[0];
  const detourX = routePoints[1]?.x ?? source.x;
  const targetLead = routePoints[routePoints.length - 1];
  const midpointY = (sourceLead.y + targetLead.y) / 2;
  const path = [
    `M ${source.x} ${source.y}`,
    `C ${source.x} ${sourceLead.y} ${detourX} ${sourceLead.y} ${detourX} ${midpointY}`,
    `C ${detourX} ${targetLead.y} ${target.x} ${targetLead.y} ${target.x} ${target.y}`,
  ].join(' ');
  const labelPoint = {
    x: detourX,
    y: midpointY,
  };

  return [path, labelPoint.x, labelPoint.y];
}
