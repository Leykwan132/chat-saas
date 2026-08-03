import {
  BaseEdge,
  EdgeLabelRenderer,
  Position,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { ClipboardList } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import type { WorkflowFlowEdge } from './workflowTypes';

export function WorkflowEdge({
  sourceX,
  sourceY,
  sourcePosition = Position.Right,
  targetX,
  targetY,
  targetPosition = Position.Left,
  markerEnd,
  markerStart,
  label,
  interactionWidth,
  style,
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

  const conditionButton = (
    <button
      type="button"
      className="relative z-10 flex max-w-48 items-center gap-1.5 truncate rounded-full bg-black px-2.5 py-1 text-xs font-medium text-white"
    >
      <span className="sr-only">Condition:</span>
      <ClipboardList className="size-3 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );

  return (
    <>
      <BaseEdge
        path={path}
        labelX={labelX}
        labelY={labelY}
        interactionWidth={interactionWidth}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={style}
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
            {data?.conditionDetail ? (
              <Tooltip>
                <TooltipTrigger asChild>{conditionButton}</TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap text-left">
                  {data.conditionDetail}
                </TooltipContent>
              </Tooltip>
            ) : conditionButton}
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
  const detour = routePoints[1] ?? sourceLead;
  const targetLead = routePoints[routePoints.length - 1];
  const isHorizontal = sourceLead.y === source.y;
  const labelPoint = isHorizontal
    ? { x: (sourceLead.x + targetLead.x) / 2, y: detour.y }
    : { x: detour.x, y: (sourceLead.y + targetLead.y) / 2 };
  const path = [
    `M ${source.x} ${source.y}`,
    ...routePoints.map((point) => `L ${point.x} ${point.y}`),
    `L ${target.x} ${target.y}`,
  ].join(' ');

  return [path, labelPoint.x, labelPoint.y];
}
