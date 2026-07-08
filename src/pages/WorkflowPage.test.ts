import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./WorkflowPage.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('workflow cleanup follows the current layout orientation without toggling it', () => {
  const cleanupHandler = source.match(/const handleCleanup = \(\) => \{[\s\S]*?\n {2}\};/);

  expect(cleanupHandler?.[0]).toContain('arrangeWorkflow(layoutOrientation)');
  expect(cleanupHandler?.[0]).not.toContain("arrangeWorkflow('vertical')");
  expect(cleanupHandler?.[0]).not.toContain('setLayoutOrientation');
  expect(cleanupHandler?.[0]).not.toContain('setArrangeFocusRequest');
});

test('workflow arrange toggles orientation and requests a canvas refocus after success', () => {
  const arrangeHandler = source.match(/const handleArrange = \(\) => \{[\s\S]*?\n {2}\};/);

  expect(source).toContain('arrangeFocusRequest');
  expect(arrangeHandler?.[0]).toContain('setLayoutOrientation');
  expect(arrangeHandler?.[0]).toContain('setArrangeFocusRequest');
  expect(source).toContain('arrangeFocusRequest={arrangeFocusRequest}');
});

test('workflow page passes current layout orientation into flow nodes', () => {
  expect(source).toContain('workflowGraphToFlow(graph,');
  expect(source).toContain('layoutOrientation');
});

test('workflow page hydrates and saves layout orientation from the workflow document', () => {
  expect(source).toContain('graph?.workflow.layoutOrientation');
  expect(source).toContain('updateLayoutOrientation');
  expect(source).toContain('const nextOrientation = getNextWorkflowLayoutOrientation(layoutOrientation)');
  expect(source).toContain('arrangeWorkflow(nextOrientation');
});
