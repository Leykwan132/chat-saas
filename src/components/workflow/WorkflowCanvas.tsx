import { useCallback, useEffect, useState } from 'react';
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
import { WorkflowAutomationStateProvider } from './workflowAutomationState';
import { workflowCanvasEdgeTypes, workflowCanvasNodeTypes } from './workflowCanvasConfig';
import { WORKFLOW_EDGE_Z_INDEX } from './workflowFlowModel';
import type { WorkflowFlowEdge, WorkflowFlowNode } from './workflowTypes';
import { useWorkflowCanvasView } from './useWorkflowCanvasView';
import {
  createTemporaryWorkflowEdge,
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

const MIN_PROXIMITY_DISTANCE = 180;

type WorkflowCanvasProps = {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
  onSelectNode: (nodeId?: Id<'workflowNodes'>) => void;
  onNodeMoved: (nodeId: Id<'workflowNodes'>, position: { x: number; y: number }) => void;
  onNodesConnected: (sourceNodeId: Id<'workflowNodes'>, targetNodeId: Id<'workflowNodes'>) => void;
  onEdgeRemoved: (edgeId: Id<'workflowEdges'>) => void;
  onCleanup: () => void;
  onReset: () => void;
  cleanupDisabled?: boolean;
  resetDisabled?: boolean;
};

function WorkflowCanvasInner({
  nodes,
  edges,
  onSelectNode,
  onNodeMoved,
  onNodesConnected,
  onEdgeRemoved,
  onCleanup,
  onReset,
  cleanupDisabled = false,
  resetDisabled = false,
}: WorkflowCanvasProps) {
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>();
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
    onSelectNode,
    onClearSelectedEdge: () => setSelectedEdgeId(undefined),
  });

  useEffect(() => {
    if (!selectedEdgeId) return;
    if (localEdges.some((edge) => !isTemporaryWorkflowEdge(edge) && edge.id === selectedEdgeId)) return;
    setSelectedEdgeId(undefined);
  }, [localEdges, selectedEdgeId]);
  const getClosestEdge = useCallback(
    (draggedNode: WorkflowFlowNode): WorkflowConnectionCandidate | null => {
      if (!isPersistedWorkflowFlowNode(draggedNode)) return null;
      const closestNode = localNodes.reduce<{
        distance: number;
        node?: typeof draggedNode;
      }>(
        (closest, node) => {
          if (!isPersistedWorkflowFlowNode(node) || node.id === draggedNode.id) {
            return closest;
          }

          const dx = node.position.x - draggedNode.position.x;
          const dy = node.position.y - draggedNode.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < closest.distance && distance < MIN_PROXIMITY_DISTANCE) {
            return { distance, node };
          }

          return closest;
        },
        { distance: Number.MAX_VALUE },
      );

      if (!closestNode.node) return null;

      const closestNodeIsSource = (
        closestNode.node.position.y < draggedNode.position.y ||
        (
          closestNode.node.position.y === draggedNode.position.y &&
          closestNode.node.position.x < draggedNode.position.x
        )
      );
      const sourceNode = closestNodeIsSource ? closestNode.node : draggedNode;
      const targetNode = closestNodeIsSource ? draggedNode : closestNode.node;

      if (!canConnectWorkflowFlowNodes(sourceNode, targetNode)) return null;

      return {
        sourceNodeId: sourceNode.data.nodeId,
        targetNodeId: targetNode.data.nodeId,
      };
    },
    [localNodes],
  );

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
  const handleNodeDrag: OnNodeDrag<WorkflowFlowNode> = (_event, node) => {
    if (!isPersistedWorkflowFlowNode(node)) return;
    const closestEdge = getClosestEdge(node);

    setLocalEdges((currentEdges) => {
      const nextEdges = currentEdges.filter((edge) => !isTemporaryWorkflowEdge(edge));
      if (closestEdge && !hasRealEdge(closestEdge)) {
        nextEdges.push(createTemporaryWorkflowEdge(closestEdge));
      }
      return nextEdges;
    });
  };
  const handleNodeDragStop: OnNodeDrag<WorkflowFlowNode> = (_event, node) => {
    if (!isPersistedWorkflowFlowNode(node)) return;
    onNodeMoved(node.data.nodeId, node.position);
    const closestEdge = getClosestEdge(node);
    setLocalEdges((currentEdges) => (
      currentEdges.filter((edge) => !isTemporaryWorkflowEdge(edge))
    ));
    if (closestEdge && !hasRealEdge(closestEdge)) {
      onNodesConnected(closestEdge.sourceNodeId, closestEdge.targetNodeId);
    }
  };

  const handleConnect: OnConnect = (connection) => {
    const validConnection = getValidConnection(connection);
    if (!validConnection || hasRealEdge(validConnection)) return;
    onNodesConnected(validConnection.sourceNodeId, validConnection.targetNodeId);
  };

  const handleEdgesDelete: OnEdgesDelete<WorkflowFlowEdge> = (deletedEdges) => {
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
      onSelectNode(edge.target as Id<'workflowNodes'>);
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
    <ReactFlow
      nodes={localNodes}
      edges={renderedEdges}
      nodeTypes={workflowCanvasNodeTypes}
      edgeTypes={workflowCanvasEdgeTypes}
      fitView
      fitViewOptions={{ padding: automationView ? 0.45 : 0.25 }}
      minZoom={0.35}
      maxZoom={automationView ? 1.35 : 1.6}
      nodesDraggable
      nodesConnectable
      deleteKeyCode={['Backspace', 'Delete']}
      connectOnClick={false}
      connectionRadius={120}
      elevateNodesOnSelect={false}
      elementsSelectable
      zIndexMode="manual"
      isValidConnection={(connection) => {
        const validConnection = getValidConnection(connection);
        return validConnection !== null && !hasRealEdge(validConnection);
      }}
      onConnect={handleConnect}
      onBeforeDelete={keepOnlyEdgeDeletions}
      onEdgesDelete={handleEdgesDelete}
      onEdgeClick={(event, edge) => {
        event.stopPropagation();
        handleSelectEdge(edge);
      }}
      onNodeClick={(_event, node) => {
        if (!isPersistedWorkflowFlowNode(node)) return;
        setSelectedEdgeId(undefined);
        onSelectNode(node.data.nodeId);
      }}
      onPaneClick={() => {
        setSelectedEdgeId(undefined);
        onSelectNode(undefined);
      }}
      onNodesChange={handleNodesChange}
      onNodeDrag={handleNodeDrag}
      onNodeDragStop={handleNodeDragStop}
      proOptions={{ hideAttribution: true }}
    >
      <WorkflowBackground />
      <WorkflowToolbar
        activeView={activeView}
        onViewChange={handleViewChange}
        onCleanup={onCleanup}
        onReset={onReset}
        cleanupDisabled={cleanupDisabled || activeView !== 'messageHandling'}
        resetDisabled={resetDisabled}
      />
    </ReactFlow>
  );
}
export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <div className="min-h-0 flex-1 bg-background">
      <ReactFlowProvider>
        <WorkflowAutomationStateProvider>
          <WorkflowCanvasInner {...props} />
        </WorkflowAutomationStateProvider>
      </ReactFlowProvider>
    </div>
  );
}
