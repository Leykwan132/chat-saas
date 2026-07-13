import type { WorkflowTemplateId } from '@/components/workflow/workflowTemplates';

export function setAppliedWorkflowTemplate(templateId: WorkflowTemplateId) {
  return templateId;
}

export function preserveAppliedWorkflowTemplateAfterFailedSave(
  templateId: WorkflowTemplateId | undefined,
) {
  return templateId;
}

export function clearAppliedWorkflowTemplate() {
  return undefined;
}
