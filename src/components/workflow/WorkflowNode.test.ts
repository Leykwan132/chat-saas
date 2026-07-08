import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./WorkflowNode.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('workflow node handles switch between vertical and horizontal anchors', () => {
  expect(source).toContain('data.layoutOrientation');
  expect(source).toContain('targetPosition');
  expect(source).toContain('sourcePosition');
  expect(source).toContain('isVertical ? Position.Top : Position.Left');
  expect(source).toContain('isVertical ? Position.Bottom : Position.Right');
  expect(source).toContain('Position.Left');
  expect(source).toContain('Position.Right');
  expect(source).toContain('Position.Top');
  expect(source).toContain('Position.Bottom');
  expect(source).toContain('vertical');
});
