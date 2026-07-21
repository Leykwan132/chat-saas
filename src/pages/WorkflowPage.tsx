import { useEffect, useMemo, useState } from "react";
import { Navigate, useBlocker, useParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { Permission } from "../../shared/permissions";
import { UnsavedChangesDialog } from "@/components/agent-setup/UnsavedChangesDialog";
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas";
import { WorkflowInspector } from "@/components/workflow/WorkflowInspector";
import type { WorkflowInspectorSaveValues } from "@/components/workflow/WorkflowInspectorForm";
import { WorkflowPageSkeleton } from "@/components/workflow/WorkflowPageSkeleton";
import { WorkflowTemplatePreviewDialog } from "@/components/workflow/WorkflowTemplatePreviewDialog";
import { workflowGraphToFlow } from "@/components/workflow/workflowFlowModel";
import { getNextWorkflowLayoutOrientation } from "@/components/workflow/workflowLayout";
import type { WorkflowTemplate } from "@/components/workflow/workflowTemplates";
import {
  createWorkflowTemplatePreview,
  type WorkflowTemplatePreview,
} from "@/components/workflow/workflowTemplatePreviewModel";
import type { WorkflowGraph } from "@/components/workflow/workflowTypes";
import { usePermissions } from "@/hooks/usePermissions";
import { toWorkflowAutomationSavePayload } from "./workflowAutomationPersistence";
import { useWorkflowAutomationDraft } from "./useWorkflowAutomationDraft";
import { useWorkflowMessageActions } from "./useWorkflowMessageActions";

type WorkflowEditorProps = {
  agentId: Id<"agents">;
  persistedGraph: WorkflowGraph;
};

function WorkflowEditor({ agentId, persistedGraph }: WorkflowEditorProps) {
  const [localGraph, setLocalGraph] = useState(persistedGraph);
  const latestGraph =
    persistedGraph.workflow.updatedAt > localGraph.workflow.updatedAt
      ? persistedGraph
      : localGraph;
  const [selectedNodeId, setSelectedNodeId] = useState<Id<"workflowNodes">>();
  const [templatePreview, setTemplatePreview] =
    useState<WorkflowTemplatePreview>();
  const [isSaving, setIsSaving] = useState(false);
  const [arrangeFocusRequest, setArrangeFocusRequest] = useState(0);
  const saveAutomations = useMutation(api.workflowAutomationSave.save);
  const automationDraft = useWorkflowAutomationDraft(latestGraph.automations);
  const messageActions = useWorkflowMessageActions({
    agentId,
    graph: latestGraph,
    onGraph: setLocalGraph,
    onSelectNode: setSelectedNodeId,
  });

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      automationDraft.isDirty &&
      currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!automationDraft.isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [automationDraft.isDirty]);

  const layoutOrientation =
    latestGraph.workflow.layoutOrientation ?? "horizontal";
  const flow = useMemo(
    () =>
      workflowGraphToFlow(
        latestGraph,
        (nodeId, kind) => void messageActions.addNode(nodeId, kind),
        (nodeId) => void messageActions.removeNode(nodeId),
        selectedNodeId,
        layoutOrientation,
        messageActions.isGraphMutating,
      ),
    [
      latestGraph,
      layoutOrientation,
      messageActions,
      selectedNodeId,
    ],
  );
  const selectedNode = useMemo(
    () => latestGraph.nodes.find((node) => node._id === selectedNodeId),
    [latestGraph.nodes, selectedNodeId],
  );
  const selectedConditionEdge = useMemo(() => {
    if (!selectedNodeId || selectedNode?.kind === "start") return undefined;
    return latestGraph.edges.find(
      (edge) => edge.targetNodeId === selectedNodeId,
    );
  }, [latestGraph.edges, selectedNode?.kind, selectedNodeId]);

  const handleSave = async () => {
    if (!automationDraft.isDirty || isSaving) return;
    setIsSaving(true);
    const toastId = toast.loading("Saving workflow automations…");
    try {
      const savedGraph = await saveAutomations({
        agentId,
        ...toWorkflowAutomationSavePayload(
          latestGraph,
          automationDraft.automations,
        ),
      });
      setLocalGraph(savedGraph);
      automationDraft.acceptSaved();
      toast.success("Workflow automations saved", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save workflow automations",
        { id: toastId },
      );
    } finally {
      setIsSaving(false);
    }
  };
  const handleReset = () => {
    automationDraft.reset();
  };
  const handleTemplateApply = (template: WorkflowTemplate) => {
    setTemplatePreview(
      createWorkflowTemplatePreview(latestGraph, template),
    );
    setSelectedNodeId(undefined);
    setArrangeFocusRequest((value) => value + 1);
  };
  const handleTemplateReplace = async () => {
    if (!templatePreview) return;
    const graph = await messageActions.replaceTemplate(
      templatePreview.template,
    );
    if (!graph) return;
    setTemplatePreview(undefined);
    setArrangeFocusRequest((value) => value + 1);
  };
  const handleCleanup = async () => {
    const graph = await messageActions.applyLayout(layoutOrientation);
    if (graph) setArrangeFocusRequest((value) => value + 1);
  };
  const handleArrange = async () => {
    const graph = await messageActions.applyLayout(
      getNextWorkflowLayoutOrientation(layoutOrientation),
    );
    if (graph) setArrangeFocusRequest((value) => value + 1);
  };
  const handleApplyInspector = async (
    values: WorkflowInspectorSaveValues,
  ) => {
    if (!selectedNodeId) return;
    const saved = await messageActions.applyNode(
      selectedNodeId,
      selectedConditionEdge?._id,
      values,
    );
    if (saved) setSelectedNodeId(undefined);
  };

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden bg-background">
      <WorkflowCanvas
        nodes={flow.nodes}
        edges={flow.edges}
        onSelectNode={setSelectedNodeId}
        onNodesConnected={(sourceNodeId, targetNodeId) =>
          void messageActions.connectNodes(sourceNodeId, targetNodeId)
        }
        onEdgeRemoved={(edgeId) => void messageActions.removeEdge(edgeId)}
        layoutOrientation={layoutOrientation}
        onCleanup={() => void handleCleanup()}
        onArrange={() => void handleArrange()}
        isDirty={automationDraft.isDirty}
        isSaving={isSaving}
        onSave={() => void handleSave()}
        onReset={handleReset}
        onTemplateApply={handleTemplateApply}
        arrangeFocusRequest={arrangeFocusRequest}
        cleanupDisabled={messageActions.isGraphMutating}
        arrangeDisabled={messageActions.isGraphMutating}
        arrangeLoading={messageActions.isGraphMutating}
        automations={automationDraft.automations}
        onAutomationsChange={automationDraft.update}
        dataMode="authenticated"
        agentId={agentId}
      />
      <WorkflowTemplatePreviewDialog
        preview={templatePreview}
        isReplacing={messageActions.isGraphMutating}
        onReplace={() => void handleTemplateReplace()}
        onSkip={() => setTemplatePreview(undefined)}
      />
      <WorkflowInspector
        agentId={agentId}
        node={selectedNode}
        conditionEdge={selectedConditionEdge}
        isSaving={messageActions.isApplyingNode}
        onSave={handleApplyInspector}
        onRemove={() =>
          selectedNodeId && void messageActions.removeNode(selectedNodeId)
        }
        onClose={() => setSelectedNodeId(undefined)}
      />
      <UnsavedChangesDialog
        open={blocker.state === "blocked"}
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
  const typedAgentId = agentId as Id<"agents"> | undefined;
  const { can, isLoading: permissionsLoading } = usePermissions();
  const canManage = can(Permission.AGENTS_MANAGE);
  const persistedGraph = useQuery(
    api.workflows.getForAgent,
    typedAgentId && canManage ? { agentId: typedAgentId } : "skip",
  );
  const ensureWorkflow = useMutation(api.workflows.ensureForAgent);

  useEffect(() => {
    if (
      !typedAgentId ||
      permissionsLoading ||
      !canManage ||
      persistedGraph !== null
    ) {
      return;
    }
    void ensureWorkflow({ agentId: typedAgentId }).catch((error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not create workflow",
      );
    });
  }, [
    canManage,
    ensureWorkflow,
    permissionsLoading,
    persistedGraph,
    typedAgentId,
  ]);

  if (!typedAgentId) return null;
  if (!permissionsLoading && !canManage) {
    return <Navigate to={`/dashboard/${typedAgentId}`} replace />;
  }
  if (
    permissionsLoading ||
    persistedGraph === undefined ||
    persistedGraph === null
  ) {
    return <WorkflowPageSkeleton />;
  }
  return (
    <WorkflowEditor
      key={persistedGraph.workflow._id}
      agentId={typedAgentId}
      persistedGraph={persistedGraph}
    />
  );
}
