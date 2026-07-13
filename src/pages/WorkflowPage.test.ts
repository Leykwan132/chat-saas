import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./WorkflowPage.tsx', import.meta.url), 'utf8');

test('workflow cleanup keeps the current draft orientation and refocuses the canvas', () => {
  const cleanupHandler = source.match(/const handleCleanup = \(\) => \{[\s\S]*?\n {2}\};/);
  expect(cleanupHandler?.[0]).toContain('workflowDraft.arrange(layoutOrientation)');
  expect(cleanupHandler?.[0]).toContain('setArrangeFocusRequest');
  expect(cleanupHandler?.[0]).not.toContain('getNextWorkflowLayoutOrientation');
});

test('workflow arrange toggles the draft orientation and refocuses the canvas', () => {
  const arrangeHandler = source.match(/const handleArrange = \(\) => \{[\s\S]*?\n {2}\};/);
  expect(arrangeHandler?.[0]).toContain('getNextWorkflowLayoutOrientation(layoutOrientation)');
  expect(arrangeHandler?.[0]).toContain('setArrangeFocusRequest');
  expect(source).toContain('arrangeFocusRequest={arrangeFocusRequest}');
});

test('workflow reset restores the saved draft and fits it to the canvas', () => {
  const resetHandler = source.match(/const handleReset = \(\) => \{[\s\S]*?\n {2}\};/);
  expect(resetHandler?.[0]).toContain('workflowDraft.reset()');
  expect(resetHandler?.[0]).toContain('setArrangeFocusRequest');
});

test('workflow page renders and saves the local draft orientation', () => {
  expect(source).toContain('workflowGraphToFlow(draft,');
  expect(source).toContain("draft.workflow.layoutOrientation ?? 'horizontal'");
  expect(source).toContain('...toWorkflowDraftSavePayload(draft)');
});

test('workflow page records template origin only on successful Save and clears it on Reset', () => {
  expect(source).toContain('templateId: appliedTemplateId');
  expect(source).toContain('setAppliedTemplateId(setAppliedWorkflowTemplate(template.id))');
  expect(source.match(/setAppliedTemplateId\(clearAppliedWorkflowTemplate\(\)\)/g)).toHaveLength(2);
  const catchBlock = source.match(/catch \(error\) \{[\s\S]*?\n {4}\} finally/);
  expect(catchBlock?.[0]).not.toContain('setAppliedTemplateId');
});
