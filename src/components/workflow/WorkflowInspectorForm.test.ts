import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./WorkflowInspectorForm.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('workflow inspector explains condition and action sections', () => {
  expect(source).toContain('Decide when this node should run in the conversation.');
  expect(source).toContain('Define what the AI should do after the condition matches.');
  expect(source).toContain('FieldDescription className="text-xs"');
});
