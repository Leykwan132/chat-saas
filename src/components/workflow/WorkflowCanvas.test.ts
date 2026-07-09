import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./WorkflowCanvas.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('workflow canvas passes arrange loading and focus requests through to the view hook and toolbar', () => {
  expect(source).toContain('arrangeFocusRequest');
  expect(source).toContain('useWorkflowCanvasView({');
  expect(source).toContain('arrangeFocusRequest,');
  expect(source).toContain('layoutOrientation,');
  expect(source).toContain('arrangeLoading={arrangeLoading}');
});
