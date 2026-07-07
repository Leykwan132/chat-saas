import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import type { Id } from '../../convex/_generated/dataModel';
import { api } from '../../convex/_generated/api';
import type { AddableWorkflowNodeKind } from '../../shared/workflows';
import { Permission } from '../../shared/permissions';
import { usePermissions } from '@/hooks/usePermissions';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import { WorkflowInspector } from '@/components/workflow/WorkflowInspector';
import { WorkflowPageSkeleton } from '@/components/workflow/WorkflowPageSkeleton';
import { workflowGraphToFlow } from '@/components/workflow/workflowFlowModel';
import { getWorkflowCleanupPositions } from '@/components/workflow/workflowLayout';
import { findNewWorkflowNodeId } from './workflowPageNodeSelection';

export default function WorkflowPage() {
  const { agentId } = useParams();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const { can, isLoading: permissionsLoading } = usePermissions();
  const canManage = can(Permission.AGENTS_MANAGE);
  const [selectedNodeId, setSelectedNodeId] = useState<Id<'workflowNodes'>>();
  const [isSaving, setIsSaving] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const graph = useQuery(
    api.workflows.getForAgent,
    typedAgentId && canManage ? { agentId: typedAgentId } : 'skip',
  );
  const ensureWorkflow = useMutation(api.workflows.ensureForAgent);
  const addNodeAfter = useMutation(api.workflows.addNodeAfter);
  const connectNodes = useMutation(api.workflows.connectNodes);
  const updateNode = useMutation(api.workflows.updateNode);
  const updateEdgeCondition = useMutation(api.workflows.updateEdgeCondition);
  const updateAllowedBookingServices = useMutation(api.workflowAppointmentServices.updateAllowedServices);
  const removeNode = useMutation(api.workflows.removeNode);
  const removeEdge = useMutation(api.workflows.removeEdge);
  const resetWorkflow = useMutation(api.workflowReset.resetForAgent);

  useEffect(() => {
    if (!typedAgentId || permissionsLoading || !canManage) return;
    if (graph !== null) return;
    void ensureWorkflow({ agentId: typedAgentId }).catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Could not create workflow');
    });
  }, [canManage, ensureWorkflow, graph, permissionsLoading, typedAgentId]);

  const handleAddNode = useCallback(
    async (nodeId: Id<'workflowNodes'>, kind: AddableWorkflowNodeKind) => {
      if (!typedAgentId) return;
      setSelectedNodeId(undefined);
      const toastId = toast.loading('Creating node…');
      try {
        const nextGraph = await addNodeAfter({
          agentId: typedAgentId,
          sourceNodeId: nodeId,
          kind,
        });
        if (graph) {
          setSelectedNodeId(findNewWorkflowNodeId(graph, nextGraph, nodeId, kind));
        }
        toast.success('Node created', { id: toastId });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not add node', {
          id: toastId,
        });
      }
    },
    [addNodeAfter, graph, typedAgentId],
  );

  const handleRemoveNode = useCallback(
    async (nodeId: Id<'workflowNodes'>) => {
      if (!typedAgentId) return;
      setIsSaving(true);
      const toastId = toast.loading('Deleting node…');
      try {
        await removeNode({ agentId: typedAgentId, nodeId });
        setSelectedNodeId(undefined);
        toast.success('Node removed', { id: toastId });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not remove node', {
          id: toastId,
        });
      } finally {
        setIsSaving(false);
      }
    },
    [removeNode, typedAgentId],
  );

  const flow = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] };
    return workflowGraphToFlow(graph, handleAddNode, handleRemoveNode, selectedNodeId);
  }, [graph, handleAddNode, handleRemoveNode, selectedNodeId]);

  const selectedNode = useMemo(() => {
    if (!graph || !selectedNodeId) return undefined;
    return graph.nodes.find((node) => node._id === selectedNodeId);
  }, [graph, selectedNodeId]);

  const selectedConditionEdge = useMemo(() => {
    if (!graph || !selectedNodeId || selectedNode?.kind === 'start') return undefined;
    return graph.edges.find((edge) => edge.targetNodeId === selectedNodeId);
  }, [graph, selectedNode?.kind, selectedNodeId]);

  const handleUpdatePosition = async (
    nodeId: Id<'workflowNodes'>,
    position: { x: number; y: number },
  ) => {
    if (!typedAgentId) return;
    try {
      await updateNode({
        agentId: typedAgentId,
        nodeId,
        positionX: position.x,
        positionY: position.y,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not move node');
    }
  };

  const handleConnectNodes = async (
    sourceNodeId: Id<'workflowNodes'>,
    targetNodeId: Id<'workflowNodes'>,
  ) => {
    if (!typedAgentId) return;
    try {
      await connectNodes({ agentId: typedAgentId, sourceNodeId, targetNodeId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not connect nodes');
    }
  };

  const handleRemoveEdge = async (edgeId: Id<'workflowEdges'>) => {
    if (!typedAgentId) return;
    const toastId = toast.loading('Deleting edge…');
    try {
      await removeEdge({ agentId: typedAgentId, edgeId });
      toast.success('Edge removed', { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove edge', {
        id: toastId,
      });
    }
  };

  const handleCleanup = async () => {
    if (!typedAgentId || !graph) return;

    setIsCleaningUp(true);
    try {
      const positions = getWorkflowCleanupPositions(graph);
      for (const { nodeId, position } of positions) {
        const node = graph.nodes.find((candidate) => candidate._id === nodeId);
        if (
          !node ||
          (Math.abs(node.positionX - position.x) < 1 &&
            Math.abs(node.positionY - position.y) < 1)
        ) {
          continue;
        }

        await updateNode({
          agentId: typedAgentId,
          nodeId,
          positionX: position.x,
          positionY: position.y,
        });
      }
      toast.success('Workflow cleaned up');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not clean up workflow');
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleReset = async () => {
    if (!typedAgentId) return;

    setIsResetting(true);
    const toastId = toast.loading('Resetting workflow…');
    try {
      await resetWorkflow({ agentId: typedAgentId });
      setSelectedNodeId(undefined);
      toast.success('Workflow reset', { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not reset workflow', {
        id: toastId,
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleSaveNode = async (values: {
    name: string;
    description: string;
    conditionName?: string;
    conditionDetail?: string;
    allowedAppointmentServiceIds?: Id<'appointmentServices'>[];
  }) => {
    if (!typedAgentId || !selectedNodeId) return;
    setIsSaving(true);
    try {
      const {
        allowedAppointmentServiceIds,
        conditionName,
        conditionDetail,
        name,
        description,
      } = values;
      await updateNode({
        agentId: typedAgentId,
        nodeId: selectedNodeId,
        title: name,
        description,
      });
      if (selectedConditionEdge && conditionName !== undefined) {
        await updateEdgeCondition({
          agentId: typedAgentId,
          edgeId: selectedConditionEdge._id,
          label: conditionName,
          detail: conditionDetail,
        });
      }
      if (allowedAppointmentServiceIds !== undefined) {
        await updateAllowedBookingServices({
          agentId: typedAgentId,
          nodeId: selectedNodeId,
          serviceIds: allowedAppointmentServiceIds,
        });
      }
      setSelectedNodeId(undefined);
      toast.success('Saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save node');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveSelectedNode = () => {
    if (!selectedNodeId) return;
    void handleRemoveNode(selectedNodeId);
  };

  if (!typedAgentId) return null;
  if (!permissionsLoading && !canManage) {
    return <Navigate to={`/dashboard/${typedAgentId}`} replace />;
  }

  if (permissionsLoading || graph === undefined || graph === null) {
    return <WorkflowPageSkeleton />;
  }

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden bg-background">
      <WorkflowCanvas
        nodes={flow.nodes}
        edges={flow.edges}
        onSelectNode={setSelectedNodeId}
        onNodeMoved={handleUpdatePosition}
        onNodesConnected={handleConnectNodes}
        onEdgeRemoved={handleRemoveEdge}
        onCleanup={handleCleanup}
        onReset={handleReset}
        cleanupDisabled={isCleaningUp}
        resetDisabled={isResetting || (graph.nodes.length === 1 && graph.edges.length === 0)}
      />
      <WorkflowInspector
        agentId={typedAgentId}
        node={selectedNode}
        conditionEdge={selectedConditionEdge}
        isSaving={isSaving}
        onSave={handleSaveNode}
        onRemove={handleRemoveSelectedNode}
        onClose={() => setSelectedNodeId(undefined)}
      />
    </div>
  );
}
