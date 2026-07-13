import { expect, test } from 'vitest';
import {
  clearAppliedWorkflowTemplate,
  preserveAppliedWorkflowTemplateAfterFailedSave,
  setAppliedWorkflowTemplate,
} from './workflowTemplateDraftState';

test('tracks the latest applied template until Reset or a successful Save', () => {
  const realEstate = setAppliedWorkflowTemplate('real-estate');
  expect(realEstate).toBe('real-estate');
  const ecommerce = setAppliedWorkflowTemplate('e-commerce');
  expect(ecommerce).toBe('e-commerce');
  expect(preserveAppliedWorkflowTemplateAfterFailedSave(ecommerce)).toBe('e-commerce');
  expect(clearAppliedWorkflowTemplate()).toBeUndefined();
});
