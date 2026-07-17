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

test('workflow canvas contains no template preview presentation', () => {
  expect(source).not.toContain('templatePreview');
  expect(source).not.toContain('isPreviewing');
  expect(source).not.toContain('WorkflowTemplatePreviewOverlay');
  expect(source).not.toContain('useWorkflowTemplatePreviewEscape');
  expect(source).toContain('nodesDraggable');
  expect(source).toContain('nodesConnectable');
  expect(source).toContain('elementsSelectable');
});
