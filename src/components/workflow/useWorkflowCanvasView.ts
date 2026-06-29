import { useCallback, useEffect, useMemo, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { Id } from '../../../convex/_generated/dataModel';
import type { WorkflowFlowEdge, WorkflowFlowNode } from './workflowTypes';
import {
  getWorkflowCanvasViewElements,
  type WorkflowCanvasView,
} from './workflowCanvasViews';

type UseWorkflowCanvasViewArgs = {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
  onSelectNode: (nodeId?: Id<'workflowNodes'>) => void;
  onClearSelectedEdge: () => void;
};

function getWorkflowFitViewPadding(view: WorkflowCanvasView) {
  return view === 'messageHandling' ? 0.25 : 0.45;
}

export function useWorkflowCanvasView({
  nodes,
  edges,
  onSelectNode,
  onClearSelectedEdge,
}: UseWorkflowCanvasViewArgs) {
  const { fitView } = useReactFlow<WorkflowFlowNode, WorkflowFlowEdge>();
  const [activeView, setActiveView] = useState<WorkflowCanvasView>('messageHandling');
  const visibleElements = useMemo(
    () => getWorkflowCanvasViewElements(nodes, edges, activeView),
    [activeView, edges, nodes],
  );
  const [localNodes, setLocalNodes] = useState<WorkflowFlowNode[]>(visibleElements.nodes);
  const [localEdges, setLocalEdges] = useState<WorkflowFlowEdge[]>(visibleElements.edges);

  useEffect(() => setLocalNodes(visibleElements.nodes), [visibleElements.nodes]);
  useEffect(() => setLocalEdges(visibleElements.edges), [visibleElements.edges]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      void fitView({ padding: getWorkflowFitViewPadding(activeView), duration: 220 });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeView, fitView]);

  const handleViewChange = useCallback(
    (view: WorkflowCanvasView) => {
      if (view === activeView) return;
      onClearSelectedEdge();
      onSelectNode(undefined);
      setActiveView(view);
    },
    [activeView, onClearSelectedEdge, onSelectNode],
  );

  return {
    activeView,
    handleViewChange,
    localEdges,
    localNodes,
    setLocalEdges,
    setLocalNodes,
  };
}
