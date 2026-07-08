import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./AgentSetupPanels.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('system prompt panel receives the agent workflow route', () => {
  expect(source).toContain('workflowHref={`/dashboard/${agentId}/workflow`}');
});
