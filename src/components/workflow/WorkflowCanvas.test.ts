import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./WorkflowCanvas.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('workflow canvas keeps drag persistence optional', () => {
  expect(source).toContain(
    "onNodeMoved?: (nodeId: Id<'workflowNodes'>",
  );
  expect(source).toContain('if (!onNodeMoved || !isPersistedWorkflowFlowNode(node)) return;');
});

test('workflow canvas passes arrange loading and focus requests through to the view hook and toolbar', () => {
  expect(source).toContain('arrangeFocusRequest');
  expect(source).toContain('useWorkflowCanvasView({');
  expect(source).toContain('arrangeFocusRequest,');
  expect(source).toContain('layoutOrientation,');
  expect(source).toContain('arrangeLoading={arrangeLoading}');
});

test('workflow canvas becomes visibly read-only during template preview', () => {
  expect(source).toContain('nodesDraggable={!isPreviewing}');
  expect(source).toContain('nodesConnectable={!isPreviewing}');
  expect(source).toContain('elementsSelectable={!isPreviewing}');
  expect(source).toContain("isPreviewing ? null : ['Backspace', 'Delete']");
  expect(source).toContain('bg-primary/[0.04]');
  expect(source).toContain('<WorkflowTemplatePreviewOverlay');
  expect(source).toContain('useWorkflowTemplatePreviewEscape(templatePreview)');
});
