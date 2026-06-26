import { useCallback, useEffect, useState } from 'react';
import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
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
import { isWorkflowTerminalNodeKind } from '../../../shared/workflows';
import { WorkflowEdge } from './WorkflowEdge';
import { WorkflowNode } from './WorkflowNode';
import { WorkflowToolbar } from './WorkflowToolbar';
import { WORKFLOW_EDGE_Z_INDEX } from './workflowFlowModel';
import type { WorkflowFlowEdge, WorkflowFlowNode } from './workflowTypes';
import {
  createTemporaryWorkflowEdge,
  getDeletedWorkflowEdgeIds,
  isTemporaryWorkflowEdge,
  keepOnlyEdgeDeletions,
  removeDeletedWorkflowEdges,
  SELECTED_EDGE_Z_INDEX,
  type WorkflowConnectionCandidate,
} from './workflowCanvasEdges';

const nodeTypes = {
  workflow: WorkflowNode,
};

const edgeTypes = {
  workflow: WorkflowEdge,
};

const MIN_PROXIMITY_DISTANCE = 180;

type WorkflowCanvasProps = {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
  onSelectNode: (nodeId?: Id<'workflowNodes'>) => void;
  onNodeMoved: (
    nodeId: Id<'workflowNodes'>,
    position: { x: number; y: number },
  ) => void;
  onNodesConnected: (
    sourceNodeId: Id<'workflowNodes'>,
    targetNodeId: Id<'workflowNodes'>,
  ) => void;
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
  const [localNodes, setLocalNodes] = useState<WorkflowFlowNode[]>(nodes);
  const [localEdges, setLocalEdges] = useState<WorkflowFlowEdge[]>(edges);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>();

  useEffect(() => {
    setLocalNodes(nodes);
  }, [nodes]);

  useEffect(() => {
    setLocalEdges(edges);
  }, [edges]);

  useEffect(() => {
    if (!selectedEdgeId) return;
    if (localEdges.some((edge) => !isTemporaryWorkflowEdge(edge) && edge.id === selectedEdgeId)) return;
    setSelectedEdgeId(undefined);
  }, [localEdges, selectedEdgeId]);

  const getClosestEdge = useCallback(
    (draggedNode: WorkflowFlowNode): WorkflowConnectionCandidate | null => {
      const closestNode = localNodes.reduce<{
        distance: number;
        node?: WorkflowFlowNode;
      }>(
        (closest, node) => {
          if (node.id === draggedNode.id) return closest;

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

      if (
        isWorkflowTerminalNodeKind(sourceNode.data.kind) ||
        targetNode.data.kind === 'start'
      ) {
        return null;
      }

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

      const sourceNode = localNodes.find((node) => node.id === source);
      const targetNode = localNodes.find((node) => node.id === target);
      if (!sourceNode || !targetNode) return null;
      if (
        isWorkflowTerminalNodeKind(sourceNode.data.kind) ||
        targetNode.data.kind === 'start'
      ) {
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

  const renderedEdges = localEdges.map((edge) => {
    if (isTemporaryWorkflowEdge(edge)) return edge;

    return {
      ...edge,
      selected: edge.id === selectedEdgeId,
      zIndex: edge.id === selectedEdgeId ? SELECTED_EDGE_Z_INDEX : WORKFLOW_EDGE_Z_INDEX,
    } satisfies WorkflowFlowEdge;
  });

  return (
    <ReactFlow
      nodes={localNodes}
      edges={renderedEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.25 }}
      minZoom={0.35}
      maxZoom={1.6}
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
        setSelectedEdgeId(edge.id);
        onSelectNode(undefined);
      }}
      onNodeClick={(_event, node) => {
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
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      <Controls position="bottom-left" showInteractive={false} />
      <WorkflowToolbar
        onCleanup={onCleanup}
        onReset={onReset}
        cleanupDisabled={cleanupDisabled}
        resetDisabled={resetDisabled}
      />
    </ReactFlow>
  );
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <div className="min-h-0 flex-1 bg-background">
      <ReactFlowProvider>
        <WorkflowCanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
