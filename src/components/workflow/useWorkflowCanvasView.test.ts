import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./useWorkflowCanvasView.ts', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('workflow canvas view refocuses after an arrange focus request', () => {
  expect(source).toContain('arrangeFocusRequest');
  expect(source).toContain('window.setTimeout');
  expect(source).toContain('duration: 320');
  expect(source).toContain('window.clearTimeout');
});

test('workflow canvas view refocuses after layout orientation changes with extra padding', () => {
  expect(source).toContain('layoutOrientation');
  expect(source).toContain('getWorkflowOrientationFitViewPadding');
  expect(source).toContain('duration: 360');
  expect(source).toContain('}, 120)');
  expect(source).toContain('[activeView, fitView, layoutOrientation]');
});
