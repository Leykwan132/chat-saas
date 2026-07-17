import { v, type Infer } from "convex/values";
import {
  workflowLayoutOrientationValidator,
  workflowNodeKindValidator,
} from "./workflowValidators";

export const workflowGraphNodeSaveValidator = v.object({
  clientId: v.string(),
  persistedNodeId: v.optional(v.id("workflowNodes")),
  kind: workflowNodeKindValidator,
  title: v.string(),
  description: v.optional(v.string()),
  notes: v.optional(v.string()),
  allowedAppointmentServiceIds: v.optional(
    v.array(v.id("appointmentServices")),
  ),
  positionX: v.number(),
  positionY: v.number(),
});

export const workflowGraphEdgeSaveValidator = v.object({
  sourceClientId: v.string(),
  targetClientId: v.string(),
  label: v.optional(v.string()),
  detail: v.optional(v.string()),
});

export type WorkflowGraphNodeSave = Infer<
  typeof workflowGraphNodeSaveValidator
>;
export type WorkflowGraphEdgeSave = Infer<
  typeof workflowGraphEdgeSaveValidator
>;
export type WorkflowGraphLayoutOrientation = Infer<
  typeof workflowLayoutOrientationValidator
>;
