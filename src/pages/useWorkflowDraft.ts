import { useCallback, useMemo, useState } from 'react';
import type { Id } from '../../convex/_generated/dataModel';
import type { AddableWorkflowNodeKind } from '../../shared/workflows';
import {
  addDraftNodeAfter,
  arrangeDraftWorkflow,
  connectDraftNodes,
  createWorkflowDraft,
  removeDraftEdge,
  removeDraftNode,
  updateDraftEdge,
  updateDraftAutomations,
  updateDraftNode,
  workflowDraftsEqual,
} from '@/components/workflow/workflowDraftModel';
import { replaceDraftWithTemplate, type WorkflowTemplate } from '@/components/workflow/workflowTemplates';
import type { WorkflowGraph, WorkflowLayoutOrientation } from '@/components/workflow/workflowTypes';
import type { WorkflowInspectorSaveValues } from '@/components/workflow/WorkflowInspectorForm';

export function useWorkflowDraft(persistedGraph: WorkflowGraph) {
  const [storedBaseline, setStoredBaseline] = useState(() => createWorkflowDraft(persistedGraph));
  const [storedDraft, setStoredDraft] = useState(() => createWorkflowDraft(persistedGraph));
  const storedDirty = !workflowDraftsEqual(storedBaseline, storedDraft);
  const useLatestPersisted = !storedDirty && storedBaseline.workflow.updatedAt < persistedGraph.workflow.updatedAt;
  const baseline = useLatestPersisted ? persistedGraph : storedBaseline;
  const draft = useLatestPersisted ? persistedGraph : storedDraft;
  const isDirty = !workflowDraftsEqual(baseline, draft);

  const edit = useCallback((transform: (graph: WorkflowGraph) => WorkflowGraph) => {
    if (useLatestPersisted) setStoredBaseline(createWorkflowDraft(baseline));
    setStoredDraft(transform(createWorkflowDraft(draft)));
  }, [baseline, draft, useLatestPersisted]);
  const reset = useCallback(() => {
    setStoredBaseline(createWorkflowDraft(persistedGraph));
    setStoredDraft(createWorkflowDraft(persistedGraph));
  }, [persistedGraph]);
  const acceptSaved = useCallback((graph: WorkflowGraph) => {
    setStoredBaseline(createWorkflowDraft(graph));
    setStoredDraft(createWorkflowDraft(graph));
  }, []);
  const addNode = useCallback((nodeId: Id<'workflowNodes'>, kind: AddableWorkflowNodeKind) => {
    edit((current) => addDraftNodeAfter(current, nodeId, kind));
  }, [edit]);
  const removeNode = useCallback((nodeId: Id<'workflowNodes'>) => {
    edit((current) => removeDraftNode(current, nodeId));
  }, [edit]);
  const connectNodes = useCallback((source: Id<'workflowNodes'>, target: Id<'workflowNodes'>) => {
    edit((current) => connectDraftNodes(current, source, target));
  }, [edit]);
  const removeEdge = useCallback((edgeId: Id<'workflowEdges'>) => {
    edit((current) => removeDraftEdge(current, edgeId));
  }, [edit]);
  const moveNode = useCallback((nodeId: Id<'workflowNodes'>, position: { x: number; y: number }) => {
    edit((current) => updateDraftNode(current, nodeId, { positionX: position.x, positionY: position.y }));
  }, [edit]);
  const arrange = useCallback((orientation: WorkflowLayoutOrientation) => {
    edit((current) => arrangeDraftWorkflow(current, orientation));
  }, [edit]);
  const applyTemplate = useCallback((template: WorkflowTemplate) => {
    edit((current) => replaceDraftWithTemplate(current, template));
  }, [edit]);
  const updateAutomations = useCallback((automations: WorkflowGraph['automations']) => {
    edit((current) => updateDraftAutomations(current, automations));
  }, [edit]);
  const applyInspector = useCallback((
    nodeId: Id<'workflowNodes'>,
    edgeId: Id<'workflowEdges'> | undefined,
    values: WorkflowInspectorSaveValues,
  ) => {
    edit((current) => {
      const withNode = updateDraftNode(current, nodeId, {
        title: values.name,
        description: values.description.trim() || undefined,
        allowedAppointmentServiceIds: values.allowedAppointmentServiceIds,
      });
      if (!edgeId || values.conditionName === undefined) return withNode;
      return updateDraftEdge(withNode, edgeId, {
        label: values.conditionName.trim() || undefined,
        detail: values.conditionDetail?.trim() || undefined,
      });
    });
  }, [edit]);

  return useMemo(() => ({
    baseline,
    draft,
    isDirty,
    reset,
    acceptSaved,
    addNode,
    removeNode,
    connectNodes,
    removeEdge,
    moveNode,
    arrange,
    applyTemplate,
    updateAutomations,
    applyInspector,
  }), [acceptSaved, addNode, applyInspector, applyTemplate, arrange, baseline, connectNodes, draft, isDirty, moveNode, removeEdge, removeNode, reset, updateAutomations]);
}
