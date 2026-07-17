import { useCallback, useState } from 'react';
import {
  applyNodeChanges,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type NodeChange,
  type OnConnect,
  type OnEdgesDelete,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Id } from '../../../convex/_generated/dataModel';
import { WorkflowBackground } from './WorkflowBackground';
import { WorkflowToolbar } from './WorkflowToolbar';
import { WorkflowDraftActions } from './WorkflowDraftActions';
import { WorkflowTemplatePreviewOverlay } from './WorkflowTemplatePreviewOverlay';
import { WorkflowAutomationStateProvider } from './workflowAutomationState';
import { workflowCanvasEdgeTypes, workflowCanvasNodeTypes } from './workflowCanvasConfig';
import { WORKFLOW_EDGE_Z_INDEX } from './workflowFlowModel';
import type { WorkflowLayoutOrientation } from './workflowLayout';
import type { WorkflowFlowEdge, WorkflowFlowNode } from './workflowTypes';
import type { WorkflowTemplate } from './workflowTemplates';
import type { WorkflowAutomationConfigs } from '../../../shared/workflowAutomations';
import { useWorkflowCanvasView } from './useWorkflowCanvasView';
import { useWorkflowTemplatePreviewEscape } from './useWorkflowTemplatePreviewEscape';
import {
  getDeletedWorkflowEdgeIds,
  isAutomationWorkflowEdge,
  isTemporaryWorkflowEdge,
  keepOnlyEdgeDeletions,
  removeDeletedWorkflowEdges,
  SELECTED_EDGE_Z_INDEX,
  type WorkflowConnectionCandidate,
} from './workflowCanvasEdges';
import {
  canConnectWorkflowFlowNodes,
  findPersistedWorkflowFlowNode,
  isPersistedWorkflowFlowNode,
} from './workflowCanvasNodes';

type WorkflowCanvasProps = {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
  onSelectNode: (nodeId?: Id<'workflowNodes'>) => void;
  onNodeMoved?: (nodeId: Id<'workflowNodes'>, position: { x: number; y: number }) => void;
  onNodesConnected: (sourceNodeId: Id<'workflowNodes'>, targetNodeId: Id<'workflowNodes'>) => void;
  onEdgeRemoved: (edgeId: Id<'workflowEdges'>) => void;
  layoutOrientation: WorkflowLayoutOrientation;
  onCleanup: () => void;
  onArrange: () => void;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onReset: () => void;
  onTemplateApply: (template: WorkflowTemplate) => void;
  templatePreview?: WorkflowTemplatePreviewProps;
  arrangeFocusRequest?: number;
  cleanupDisabled?: boolean;
  arrangeDisabled?: boolean;
  arrangeLoading?: boolean;
  showCleanup?: boolean;
  showTemplates?: boolean;
  automations: WorkflowAutomationConfigs;
  onAutomationsChange: (automations: WorkflowAutomationConfigs) => void;
  agentId?: Id<'agents'>;
};

type WorkflowTemplatePreviewProps = {
  name: string;
  isReplacing: boolean;
  onReplace: () => void;
  onSkip: () => void;
};

function WorkflowCanvasInner({
  nodes,
  edges,
  onSelectNode,
  onNodeMoved,
  onNodesConnected,
  onEdgeRemoved,
  layoutOrientation,
  onCleanup,
  onArrange,
  onReset,
  isDirty,
  isSaving,
  onSave,
  onTemplateApply,
  templatePreview,
  arrangeFocusRequest = 0,
  cleanupDisabled = false,
  arrangeDisabled = false,
  arrangeLoading = false,
  showCleanup = true,
  showTemplates = true,
}: WorkflowCanvasProps) {
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>();
  const isPreviewing = templatePreview !== undefined;
  useWorkflowTemplatePreviewEscape(templatePreview);
  const {
    activeView,
    handleViewChange,
    localEdges,
    localNodes,
    setLocalEdges,
    setLocalNodes,
  } = useWorkflowCanvasView({
    nodes,
    edges,
    arrangeFocusRequest,
    layoutOrientation,
    onSelectNode,
    onClearSelectedEdge: () => setSelectedEdgeId(undefined),
  });

  const hasRealEdge = useCallback(
    ({ sourceNodeId, targetNodeId }: WorkflowConnectionCandidate) => (
      localEdges.some((edge) => (
        !isTemporaryWorkflowEdge(edge) &&
        edge.source === sourceNodeId &&
        edge.target === targetNodeId
      ))
    ),
    [localEdges],
  );

  const getValidConnection = useCallback(
    ({ source, target }: Pick<Connection, 'source' | 'target'>): WorkflowConnectionCandidate | null => {
      if (source === target) return null;

      const sourceNode = findPersistedWorkflowFlowNode(localNodes, source);
      const targetNode = findPersistedWorkflowFlowNode(localNodes, target);
      if (!sourceNode || !targetNode) return null;
      if (!canConnectWorkflowFlowNodes(sourceNode, targetNode)) {
        return null;
      }

      return {
        sourceNodeId: sourceNode.data.nodeId,
        targetNodeId: targetNode.data.nodeId,
      };
    },
    [localNodes],
  );

  const handleNodesChange = (changes: NodeChange<WorkflowFlowNode>[]) => {
    setLocalNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  };
  const handleNodeDragStop: OnNodeDrag<WorkflowFlowNode> = (_event, node) => {
    if (!onNodeMoved || !isPersistedWorkflowFlowNode(node)) return;
    onNodeMoved(node.data.nodeId, node.position);
  };

  const handleConnect: OnConnect = (connection) => {
    if (isPreviewing) return;
    const validConnection = getValidConnection(connection);
    if (!validConnection || hasRealEdge(validConnection)) return;
    onNodesConnected(validConnection.sourceNodeId, validConnection.targetNodeId);
  };

  const handleEdgesDelete: OnEdgesDelete<WorkflowFlowEdge> = (deletedEdges) => {
    if (isPreviewing) return;
    const deletedEdgeIds = getDeletedWorkflowEdgeIds(deletedEdges);
    if (deletedEdgeIds.length === 0) return;

    setSelectedEdgeId(undefined);
    setLocalEdges((currentEdges) => (
      removeDeletedWorkflowEdges(currentEdges, deletedEdgeIds)
    ));

    for (const edgeId of deletedEdgeIds) {
      onEdgeRemoved(edgeId as Id<'workflowEdges'>);
    }
  };

  const handleSelectEdge = useCallback(
    (edge: WorkflowFlowEdge) => {
      if (isTemporaryWorkflowEdge(edge) || isAutomationWorkflowEdge(edge)) return;
      setSelectedEdgeId(edge.id);
      onSelectNode(undefined);
    },
    [onSelectNode],
  );

  const renderedEdges = localEdges.map((edge) => {
    if (isTemporaryWorkflowEdge(edge) || isAutomationWorkflowEdge(edge)) return edge;

    return {
      ...edge,
      selected: edge.id === selectedEdgeId,
      zIndex: edge.id === selectedEdgeId ? SELECTED_EDGE_Z_INDEX : WORKFLOW_EDGE_Z_INDEX,
      data: {
        ...edge.data,
        onSelectTargetNode: () => handleSelectEdge(edge),
      },
    } satisfies WorkflowFlowEdge;
  });
  const automationView = activeView !== 'messageHandling';

  return (
    <div className="relative h-full w-full">
    <ReactFlow
      nodes={localNodes}
      edges={renderedEdges}
      nodeTypes={workflowCanvasNodeTypes}
      edgeTypes={workflowCanvasEdgeTypes}
      fitView
      fitViewOptions={{ padding: automationView ? 0.45 : 0.25 }}
      minZoom={0.35}
      maxZoom={automationView ? 1.35 : 1.6}
      nodesDraggable={!isPreviewing}
      nodesConnectable={!isPreviewing}
      deleteKeyCode={isPreviewing ? null : ['Backspace', 'Delete']}
      connectOnClick={false}
      connectionRadius={120}
      elevateNodesOnSelect={false}
      elementsSelectable={!isPreviewing}
      className={isPreviewing ? 'bg-primary/[0.04] dark:bg-primary/[0.08]' : undefined}
      zIndexMode="manual"
      isValidConnection={(connection) => {
        if (isPreviewing) return false;
        const validConnection = getValidConnection(connection);
        return validConnection !== null && !hasRealEdge(validConnection);
      }}
      onConnect={handleConnect}
      onBeforeDelete={keepOnlyEdgeDeletions}
      onEdgesDelete={handleEdgesDelete}
      onEdgeClick={(event, edge) => {
        if (isPreviewing) return;
        event.stopPropagation();
        handleSelectEdge(edge);
      }}
      onNodeClick={(_event, node) => {
        if (isPreviewing) return;
        if (!isPersistedWorkflowFlowNode(node)) return;
        setSelectedEdgeId(undefined);
        onSelectNode(node.data.nodeId);
      }}
      onPaneClick={() => {
        setSelectedEdgeId(undefined);
        onSelectNode(undefined);
      }}
      onNodesChange={handleNodesChange}
      onNodeDragStop={handleNodeDragStop}
      proOptions={{ hideAttribution: true }}
    >
      <WorkflowBackground />
      <WorkflowToolbar
        activeView={activeView}
        layoutOrientation={layoutOrientation}
        onViewChange={(view) => {
          if (isPreviewing && view !== 'messageHandling') templatePreview?.onSkip();
          handleViewChange(view);
        }}
        onCleanup={onCleanup}
        onArrange={onArrange}
        onTemplateApply={onTemplateApply}
        cleanupDisabled={cleanupDisabled || isPreviewing || activeView !== 'messageHandling'}
        arrangeDisabled={arrangeDisabled || isPreviewing || activeView !== 'messageHandling'}
        arrangeLoading={arrangeLoading}
        templatesDisabled={isPreviewing}
        showCleanup={showCleanup}
        showTemplates={showTemplates}
      />
      <WorkflowDraftActions
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={onSave}
        onReset={onReset}
      />
    </ReactFlow>
      {templatePreview ? (
        <WorkflowTemplatePreviewOverlay
          name={templatePreview.name}
          isReplacing={templatePreview.isReplacing}
          onReplace={templatePreview.onReplace}
          onSkip={templatePreview.onSkip}
        />
      ) : null}
    </div>
  );
}
export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <div className="min-h-0 flex-1 bg-background">
      <ReactFlowProvider>
        <WorkflowAutomationStateProvider
          configs={props.automations}
          agentId={props.agentId}
          onChange={props.onAutomationsChange}
        >
          <WorkflowCanvasInner {...props} />
        </WorkflowAutomationStateProvider>
      </ReactFlowProvider>
    </div>
  );
}
