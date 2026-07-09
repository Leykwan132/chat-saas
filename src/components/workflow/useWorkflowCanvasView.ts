import { useCallback, useEffect, useMemo, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { Id } from '../../../convex/_generated/dataModel';
import type { WorkflowFlowEdge, WorkflowFlowNode } from './workflowTypes';
import {
  getWorkflowCanvasViewElements,
  type WorkflowCanvasView,
} from './workflowCanvasViews';
import type { WorkflowLayoutOrientation } from './workflowTypes';

type UseWorkflowCanvasViewArgs = {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
  arrangeFocusRequest?: number;
  layoutOrientation: WorkflowLayoutOrientation;
  onSelectNode: (nodeId?: Id<'workflowNodes'>) => void;
  onClearSelectedEdge: () => void;
};

function getWorkflowFitViewPadding(view: WorkflowCanvasView) {
  return view === 'messageHandling' ? 0.25 : 0.45;
}

function getWorkflowOrientationFitViewPadding(view: WorkflowCanvasView) {
  return view === 'messageHandling' ? 0.4 : 0.55;
}

export function useWorkflowCanvasView({
  nodes,
  edges,
  arrangeFocusRequest = 0,
  layoutOrientation,
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

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => setLocalNodes(visibleElements.nodes));

    return () => window.cancelAnimationFrame(frameId);
  }, [visibleElements.nodes]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => setLocalEdges(visibleElements.edges));

    return () => window.cancelAnimationFrame(frameId);
  }, [visibleElements.edges]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      void fitView({ padding: getWorkflowFitViewPadding(activeView), duration: 220 });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeView, fitView]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fitView({
        padding: getWorkflowOrientationFitViewPadding(activeView),
        duration: 360,
      });
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [activeView, fitView, layoutOrientation]);

  useEffect(() => {
    if (arrangeFocusRequest === 0) return undefined;

    const timeoutId = window.setTimeout(() => {
      void fitView({ padding: getWorkflowFitViewPadding(activeView), duration: 320 });
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [activeView, arrangeFocusRequest, fitView]);

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
