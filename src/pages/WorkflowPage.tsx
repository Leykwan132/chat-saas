import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useBlocker, useParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import type { Id } from '../../convex/_generated/dataModel';
import { api } from '../../convex/_generated/api';
import type { AddableWorkflowNodeKind } from '../../shared/workflows';
import { Permission } from '../../shared/permissions';
import { UnsavedChangesDialog } from '@/components/agent-setup/UnsavedChangesDialog';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import { WorkflowInspector } from '@/components/workflow/WorkflowInspector';
import { WorkflowPageSkeleton } from '@/components/workflow/WorkflowPageSkeleton';
import { workflowGraphToFlow } from '@/components/workflow/workflowFlowModel';
import { getNextWorkflowLayoutOrientation } from '@/components/workflow/workflowLayout';
import type { WorkflowTemplate } from '@/components/workflow/workflowTemplates';
import type { WorkflowGraph } from '@/components/workflow/workflowTypes';
import { usePermissions } from '@/hooks/usePermissions';
import { toWorkflowDraftSavePayload } from './workflowDraftPersistence';
import { useWorkflowDraft } from './useWorkflowDraft';
import {
  clearAppliedWorkflowTemplate,
  setAppliedWorkflowTemplate,
} from './workflowTemplateDraftState';

type WorkflowEditorProps = {
  agentId: Id<'agents'>;
  persistedGraph: WorkflowGraph;
};

function WorkflowEditor({ agentId, persistedGraph }: WorkflowEditorProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<Id<'workflowNodes'>>();
  const [isSaving, setIsSaving] = useState(false);
  const [arrangeFocusRequest, setArrangeFocusRequest] = useState(0);
  const [appliedTemplateId, setAppliedTemplateId] = useState<WorkflowTemplate['id']>();
  const saveWorkflow = useMutation(api.workflowDraftSave.save);
  const workflowDraft = useWorkflowDraft(persistedGraph);
  const { draft, isDirty } = workflowDraft;

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleAddNode = useCallback((nodeId: Id<'workflowNodes'>, kind: AddableWorkflowNodeKind) => {
    workflowDraft.addNode(nodeId, kind);
    setSelectedNodeId(undefined);
  }, [workflowDraft]);
  const handleRemoveNode = useCallback((nodeId: Id<'workflowNodes'>) => {
    workflowDraft.removeNode(nodeId);
    setSelectedNodeId(undefined);
  }, [workflowDraft]);
  const layoutOrientation = draft.workflow.layoutOrientation ?? 'horizontal';
  const flow = useMemo(
    () => workflowGraphToFlow(draft, handleAddNode, handleRemoveNode, selectedNodeId, layoutOrientation),
    [draft, handleAddNode, handleRemoveNode, layoutOrientation, selectedNodeId],
  );
  const selectedNode = useMemo(
    () => draft.nodes.find((node) => node._id === selectedNodeId),
    [draft, selectedNodeId],
  );
  const selectedConditionEdge = useMemo(() => {
    if (!selectedNodeId || selectedNode?.kind === 'start') return undefined;
    return draft.edges.find((edge) => edge.targetNodeId === selectedNodeId);
  }, [draft, selectedNode?.kind, selectedNodeId]);

  const handleSave = async () => {
    if (!isDirty || isSaving) return;
    setIsSaving(true);
    const toastId = toast.loading('Saving workflow…');
    try {
      const savedGraph = await saveWorkflow({
        agentId,
        ...toWorkflowDraftSavePayload(draft),
        templateId: appliedTemplateId,
      });
      workflowDraft.acceptSaved(savedGraph);
      setAppliedTemplateId(clearAppliedWorkflowTemplate());
      setSelectedNodeId(undefined);
      toast.success('Workflow saved', { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save workflow', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };
  const handleReset = () => {
    workflowDraft.reset();
    setAppliedTemplateId(clearAppliedWorkflowTemplate());
    setSelectedNodeId(undefined);
    setArrangeFocusRequest((value) => value + 1);
  };
  const handleTemplateApply = (template: WorkflowTemplate) => {
    workflowDraft.applyTemplate(template);
    setAppliedTemplateId(setAppliedWorkflowTemplate(template.id));
    setSelectedNodeId(undefined);
    setArrangeFocusRequest((value) => value + 1);
    toast.success(`${template.name} replaced the current workflow draft`);
  };
  const handleCleanup = () => {
    workflowDraft.arrange(layoutOrientation);
    setArrangeFocusRequest((value) => value + 1);
  };
  const handleArrange = () => {
    workflowDraft.arrange(getNextWorkflowLayoutOrientation(layoutOrientation));
    setArrangeFocusRequest((value) => value + 1);
  };
  const handleApplyInspector = (values: Parameters<typeof workflowDraft.applyInspector>[2]) => {
    if (!selectedNodeId) return;
    workflowDraft.applyInspector(selectedNodeId, selectedConditionEdge?._id, values);
    setSelectedNodeId(undefined);
  };

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden bg-background">
      <WorkflowCanvas
        nodes={flow.nodes}
        edges={flow.edges}
        onSelectNode={setSelectedNodeId}
        onNodeMoved={workflowDraft.moveNode}
        onNodesConnected={workflowDraft.connectNodes}
        onEdgeRemoved={workflowDraft.removeEdge}
        layoutOrientation={layoutOrientation}
        onCleanup={handleCleanup}
        onArrange={handleArrange}
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={() => void handleSave()}
        onReset={handleReset}
        onTemplateApply={handleTemplateApply}
        arrangeFocusRequest={arrangeFocusRequest}
      />
      <WorkflowInspector
        agentId={agentId}
        node={selectedNode}
        conditionEdge={selectedConditionEdge}
        isSaving={false}
        onSave={handleApplyInspector}
        onRemove={() => selectedNodeId && handleRemoveNode(selectedNodeId)}
        onClose={() => setSelectedNodeId(undefined)}
      />
      <UnsavedChangesDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
        onKeepEditing={() => blocker.reset?.()}
        onDiscard={() => {
          handleReset();
          blocker.proceed?.();
        }}
      />
    </div>
  );
}

export default function WorkflowPage() {
  const { agentId } = useParams();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const { can, isLoading: permissionsLoading } = usePermissions();
  const canManage = can(Permission.AGENTS_MANAGE);
  const persistedGraph = useQuery(
    api.workflows.getForAgent,
    typedAgentId && canManage ? { agentId: typedAgentId } : 'skip',
  );
  const ensureWorkflow = useMutation(api.workflows.ensureForAgent);

  useEffect(() => {
    if (!typedAgentId || permissionsLoading || !canManage || persistedGraph !== null) return;
    void ensureWorkflow({ agentId: typedAgentId }).catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Could not create workflow');
    });
  }, [canManage, ensureWorkflow, permissionsLoading, persistedGraph, typedAgentId]);

  if (!typedAgentId) return null;
  if (!permissionsLoading && !canManage) return <Navigate to={`/dashboard/${typedAgentId}`} replace />;
  if (permissionsLoading || persistedGraph === undefined || persistedGraph === null) {
    return <WorkflowPageSkeleton />;
  }
  return <WorkflowEditor key={persistedGraph.workflow._id} agentId={typedAgentId} persistedGraph={persistedGraph} />;
}
