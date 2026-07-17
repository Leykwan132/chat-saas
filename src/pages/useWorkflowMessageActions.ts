import { useCallback, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { AddableWorkflowNodeKind } from "../../shared/workflows";
import type { WorkflowInspectorSaveValues } from "../components/workflow/WorkflowInspectorForm";
import {
  createWorkflowGraphFromTemplate,
  type WorkflowTemplate,
} from "../components/workflow/workflowTemplates";
import type {
  WorkflowGraph,
  WorkflowLayoutOrientation,
} from "../components/workflow/workflowTypes";
import { findNewWorkflowNodeId } from "./workflowPageNodeSelection";
import { toWorkflowLayoutApplyArgs } from "./workflowLayoutPersistence";
import { toWorkflowTemplateReplacementPayload } from "./workflowTemplateReplacementPersistence";

type WorkflowMessageActionsOptions = {
  agentId: Id<"agents">;
  graph: WorkflowGraph;
  onGraph: (graph: WorkflowGraph) => void;
  onSelectNode: (nodeId?: Id<"workflowNodes">) => void;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useWorkflowMessageActions({
  agentId,
  graph,
  onGraph,
  onSelectNode,
}: WorkflowMessageActionsOptions) {
  const addNodeAfter = useMutation(api.workflows.addNodeAfter);
  const removeNodeMutation = useMutation(api.workflows.removeNode);
  const connectNodesMutation = useMutation(api.workflows.connectNodes);
  const removeEdgeMutation = useMutation(api.workflows.removeEdge);
  const applyNodeConfig = useMutation(api.workflowNodeConfig.apply);
  const applyWorkflowLayout = useMutation(api.workflowLayout.apply);
  const replaceMessageGraph = useMutation(api.workflowMessageGraphSave.replace);
  const graphMutationPending = useRef(false);
  const applyPending = useRef(false);
  const [isGraphMutating, setIsGraphMutating] = useState(false);
  const [isApplyingNode, setIsApplyingNode] = useState(false);

  const runGraphMutation = useCallback(async (
    action: () => Promise<WorkflowGraph>,
    fallbackMessage: string,
  ) => {
    if (graphMutationPending.current) return undefined;
    graphMutationPending.current = true;
    setIsGraphMutating(true);
    try {
      const nextGraph = await action();
      onGraph(nextGraph);
      return nextGraph;
    } catch (error) {
      toast.error(errorMessage(error, fallbackMessage));
      return undefined;
    } finally {
      graphMutationPending.current = false;
      setIsGraphMutating(false);
    }
  }, [onGraph]);

  const addNode = useCallback(async (
    sourceNodeId: Id<"workflowNodes">,
    kind: AddableWorkflowNodeKind,
  ) => {
    if (graphMutationPending.current) return;
    graphMutationPending.current = true;
    setIsGraphMutating(true);
    const toastId = toast.loading("Creating node…");
    try {
      const nextGraph = await addNodeAfter({
        agentId,
        sourceNodeId,
        kind,
      });
      const addedNodeId = findNewWorkflowNodeId(
        graph,
        nextGraph,
        sourceNodeId,
        kind,
      );
      if (!addedNodeId) {
        throw new Error("Created workflow node was not returned");
      }
      onGraph(nextGraph);
      onSelectNode(addedNodeId);
      toast.success("Node created", { id: toastId });
    } catch (error) {
      toast.error(errorMessage(error, "Could not create node"), {
        id: toastId,
      });
    } finally {
      graphMutationPending.current = false;
      setIsGraphMutating(false);
    }
  }, [addNodeAfter, agentId, graph, onGraph, onSelectNode]);

  const removeNode = useCallback(async (nodeId: Id<"workflowNodes">) => {
    const nextGraph = await runGraphMutation(
      () => removeNodeMutation({ agentId, nodeId }),
      "Could not delete node",
    );
    if (nextGraph) onSelectNode(undefined);
  }, [agentId, onSelectNode, removeNodeMutation, runGraphMutation]);

  const connectNodes = useCallback(async (
    sourceNodeId: Id<"workflowNodes">,
    targetNodeId: Id<"workflowNodes">,
  ) => {
    await runGraphMutation(
      () => connectNodesMutation({ agentId, sourceNodeId, targetNodeId }),
      "Could not connect nodes",
    );
  }, [agentId, connectNodesMutation, runGraphMutation]);

  const removeEdge = useCallback(async (edgeId: Id<"workflowEdges">) => {
    await runGraphMutation(
      () => removeEdgeMutation({ agentId, edgeId }),
      "Could not delete connection",
    );
  }, [agentId, removeEdgeMutation, runGraphMutation]);

  const applyNode = useCallback(async (
    nodeId: Id<"workflowNodes">,
    conditionEdgeId: Id<"workflowEdges"> | undefined,
    values: WorkflowInspectorSaveValues,
  ) => {
    if (applyPending.current) return false;
    applyPending.current = true;
    setIsApplyingNode(true);
    try {
      const nextGraph = await applyNodeConfig({
        agentId,
        nodeId,
        conditionEdgeId,
        title: values.name,
        description: values.description,
        conditionLabel: values.conditionName,
        conditionDetail: values.conditionDetail,
        allowedAppointmentServiceIds: values.allowedAppointmentServiceIds,
      });
      onGraph(nextGraph);
      toast.success("Node updated");
      return true;
    } catch (error) {
      toast.error(errorMessage(error, "Could not update node"));
      return false;
    } finally {
      applyPending.current = false;
      setIsApplyingNode(false);
    }
  }, [agentId, applyNodeConfig, onGraph]);

  const applyLayout = useCallback(async (
    orientation: WorkflowLayoutOrientation,
  ) => {
    return await runGraphMutation(
      () => applyWorkflowLayout({
        agentId,
        ...toWorkflowLayoutApplyArgs(graph, orientation),
      }),
      "Could not arrange workflow",
    );
  }, [agentId, applyWorkflowLayout, graph, runGraphMutation]);

  const replaceTemplate = useCallback(async (template: WorkflowTemplate) => {
    return await runGraphMutation(
      () => replaceMessageGraph({
        agentId,
        ...toWorkflowTemplateReplacementPayload(
          createWorkflowGraphFromTemplate(graph, template),
        ),
        templateId: template.id,
      }),
      "Could not replace workflow",
    );
  }, [agentId, graph, replaceMessageGraph, runGraphMutation]);

  return {
    isGraphMutating,
    isApplyingNode,
    addNode,
    removeNode,
    connectNodes,
    removeEdge,
    applyNode,
    applyLayout,
    replaceTemplate,
  };
}
