import { expect, test } from 'vitest';
import type { Id } from '../../../convex/_generated/dataModel';
import { getAgentWorkspaceEntryPath } from './agentWorkspaceRoutes';

test('workspace agent entry opens the overview page', () => {
  expect(getAgentWorkspaceEntryPath('agent_a' as Id<'agents'>)).toBe('/dashboard/agent_a/overview');
});
