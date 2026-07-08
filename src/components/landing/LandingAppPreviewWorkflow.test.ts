import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./LandingAppPreviewWorkflow.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('landing workflow preview passes layout orientation into workflow flow nodes', () => {
  expect(source).toContain('workflowGraphToFlow(');
  expect(source).toContain('layoutOrientation');
});
