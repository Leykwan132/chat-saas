import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./LandingAppPreviewWorkflow.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('landing workflow preview passes layout orientation into workflow flow nodes', () => {
  expect(source).toContain('workflowGraphToFlow(');
  expect(source).toContain('layoutOrientation');
});

test('landing workflow preview requests compact persisted nodes', () => {
  expect(source).toContain("'compact',");
});

test('landing workflow preview starts with vertical handles for its top-down sample graph', () => {
  expect(source).toContain("useState<WorkflowLayoutOrientation>('vertical')");
});

test('landing workflow preview arranges with the next orientation before switching handles', () => {
  expect(source).toContain('const nextOrientation = getNextWorkflowLayoutOrientation(layoutOrientation)');
  expect(source).toContain('getWorkflowCleanupPositions(graph, nextOrientation)');
  expect(source).toContain('setLayoutOrientation(nextOrientation)');
  expect(source).not.toContain('const orientation = layoutOrientation');
  expect(source).not.toContain('getWorkflowCleanupPositions(graph, orientation)');
  expect(source).not.toContain('setLayoutOrientation(getNextWorkflowLayoutOrientation(orientation))');
});

test('landing workflow preview hides cleanup but keeps demo arrange and reset controls', () => {
  expect(source).toContain('showCleanup={false}');
  expect(source).toContain('onArrange={handleArrange}');
  expect(source).toContain('onReset={handleReset}');
});

test('landing workflow preview does not render fake services on node cards', () => {
  expect(source).not.toContain('serviceLabelsByNodeId');
  expect(source).not.toContain('serviceLabels:');
});
