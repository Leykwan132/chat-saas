import { useCallback, useMemo, useState } from 'react';
import type { Id } from '../../../convex/_generated/dataModel';
import type { AddableWorkflowNodeKind } from '../../../shared/workflows';
import { WorkflowCanvas } from '../workflow/WorkflowCanvas';
import { WorkflowInspector } from '../workflow/WorkflowInspector';
import { workflowGraphToFlow } from '../workflow/workflowFlowModel';
import {
  getNextWorkflowLayoutOrientation,
  getWorkflowCleanupPositions,
  type WorkflowLayoutOrientation,
} from '../workflow/workflowLayout';
import type { LandingPreviewWorkflow as LandingPreviewWorkflowData } from './landingAppPreviewData';
import { createLandingWorkflowGraph } from './landingWorkflowMockGraph';
import {
  addLandingPreviewWorkflowNode,
  connectLandingPreviewWorkflowNodes,
  moveLandingPreviewWorkflowNode,
  removeLandingPreviewWorkflowEdge,
  removeLandingPreviewWorkflowNode,
  updateLandingPreviewWorkflowNode,
} from './landingWorkflowPreviewGraph';

export function LandingAppPreviewWorkflow({
  workflow,
}: {
  workflow: LandingPreviewWorkflowData;
}) {
  const [previewPortalContainer, setPreviewPortalContainer] = useState<HTMLDivElement | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<Id<'workflowNodes'>>();
  const [graph, setGraph] = useState(() => createLandingWorkflowGraph(workflow));
  const [layoutOrientation, setLayoutOrientation] =
    useState<WorkflowLayoutOrientation>('vertical');
  const initialGraph = useMemo(() => createLandingWorkflowGraph(workflow), [workflow]);

  const handleAddNode = useCallback(
    (nodeId: Id<'workflowNodes'>, kind: AddableWorkflowNodeKind) => {
      const result = addLandingPreviewWorkflowNode(graph, nodeId, kind);
      setGraph(result.graph);
      setSelectedNodeId(result.nodeId);
    },
    [graph],
  );
  const handleRemoveNode = useCallback((nodeId: Id<'workflowNodes'>) => {
    setGraph((currentGraph) => removeLandingPreviewWorkflowNode(currentGraph, nodeId));
    setSelectedNodeId(undefined);
  }, []);
  const handleSaveNode = useCallback(
    (values: Parameters<typeof updateLandingPreviewWorkflowNode>[2]) => {
      if (!selectedNodeId) return;
      setGraph((currentGraph) => (
        updateLandingPreviewWorkflowNode(currentGraph, selectedNodeId, values)
      ));
    },
    [selectedNodeId],
  );
  const handleNodeMoved = useCallback((nodeId: Id<'workflowNodes'>, position: { x: number; y: number }) => {
    setGraph((currentGraph) => moveLandingPreviewWorkflowNode(currentGraph, nodeId, position));
  }, []);
  const handleNodesConnected = useCallback(
    (sourceNodeId: Id<'workflowNodes'>, targetNodeId: Id<'workflowNodes'>) => {
      setGraph((currentGraph) => (
        connectLandingPreviewWorkflowNodes(currentGraph, sourceNodeId, targetNodeId)
      ));
    },
    [],
  );
  const handleEdgeRemoved = useCallback((edgeId: Id<'workflowEdges'>) => {
    setGraph((currentGraph) => removeLandingPreviewWorkflowEdge(currentGraph, edgeId));
  }, []);
  const handleReset = useCallback(() => {
    setGraph(initialGraph);
    setSelectedNodeId(undefined);
  }, [initialGraph]);
  const handleArrange = useCallback(() => {
    const nextOrientation = getNextWorkflowLayoutOrientation(layoutOrientation);
    const positionByNodeId = new Map(
      getWorkflowCleanupPositions(graph, nextOrientation).map((item) => [item.nodeId, item.position]),
    );
    setGraph((currentGraph) => ({
      ...currentGraph,
      nodes: currentGraph.nodes.map((node) => {
        const position = positionByNodeId.get(node._id);
        return position
          ? { ...node, positionX: position.x, positionY: position.y }
          : node;
      }),
    }));
    setLayoutOrientation(nextOrientation);
  }, [graph, layoutOrientation]);
  const flow = useMemo(
    () => workflowGraphToFlow(
      graph,
      handleAddNode,
      handleRemoveNode,
      selectedNodeId,
      layoutOrientation,
      false,
      'compact',
    ),
    [graph, handleAddNode, handleRemoveNode, layoutOrientation, selectedNodeId],
  );
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return undefined;
    return graph.nodes.find((node) => node._id === selectedNodeId);
  }, [graph.nodes, selectedNodeId]);
  const selectedConditionEdge = useMemo(() => {
    if (!selectedNodeId || selectedNode?.kind === 'start') return undefined;
    return graph.edges.find((edge) => edge.targetNodeId === selectedNodeId);
  }, [graph.edges, selectedNode?.kind, selectedNodeId]);

  return (
    <div
      ref={setPreviewPortalContainer}
      data-preview-section-content
      className="relative flex min-h-0 flex-1 overflow-hidden bg-background"
    >
      <WorkflowCanvas
        nodes={flow.nodes}
        edges={flow.edges}
        onSelectNode={setSelectedNodeId}
        onNodeMoved={handleNodeMoved}
        onNodesConnected={handleNodesConnected}
        onEdgeRemoved={handleEdgeRemoved}
        layoutOrientation={layoutOrientation}
        onCleanup={handleReset}
        onArrange={handleArrange}
        onReset={handleReset}
        isDirty={false}
        isSaving={false}
        onSave={handleReset}
        onTemplateApply={handleReset}
        showCleanup={false}
        showTemplates={false}
        automations={graph.automations}
        onAutomationsChange={() => undefined}
        dataMode="local"
      />
      <WorkflowInspector
        node={selectedNode}
        conditionEdge={selectedConditionEdge}
        contentClassName="!absolute !left-1/2 !top-1/2 !z-50 !max-h-[calc(100%-2rem)] !max-w-[min(calc(100%-2rem),820px)]"
        overlayClassName="absolute inset-0 z-40 bg-black/15 backdrop-blur-[1px]"
        portalContainer={previewPortalContainer}
        onSave={handleSaveNode}
        onRemove={() => {
          if (selectedNodeId) handleRemoveNode(selectedNodeId);
        }}
        onClose={() => setSelectedNodeId(undefined)}
      />
    </div>
  );
}
