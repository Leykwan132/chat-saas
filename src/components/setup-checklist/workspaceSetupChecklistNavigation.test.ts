import { expect, test } from 'vitest';
import {
  resolveWorkspaceSetupChecklistAction,
  type SetupChecklistRouteAgent,
} from './workspaceSetupChecklistNavigation';

const agents: SetupChecklistRouteAgent[] = [
  { _id: 'agent_a', name: 'A' },
  { _id: 'agent_b', name: 'B' },
];

test('create agent step always routes to create agent', () => {
  expect(resolveWorkspaceSetupChecklistAction({
    stepKey: 'createAgent',
    agents,
  })).toEqual({ kind: 'navigate', to: '/create-agent' });
});

test('workspace agent-only step routes to create agent when no agent exists', () => {
  expect(resolveWorkspaceSetupChecklistAction({
    stepKey: 'uploadKnowledgeBase',
    agents: [],
  })).toEqual({ kind: 'navigate', to: '/create-agent' });
});

test('workspace agent-only step routes through the only agent', () => {
  expect(resolveWorkspaceSetupChecklistAction({
    stepKey: 'createWorkflow',
    agents: [agents[0]],
  })).toEqual({ kind: 'navigate', to: '/dashboard/agent_a/workflow' });
});

test('create service step opens the new service form for the selected agent', () => {
  expect(resolveWorkspaceSetupChecklistAction({
    stepKey: 'createService',
    agents: [agents[0]],
  })).toEqual({ kind: 'navigate', to: '/dashboard/agent_a/services/new' });
});

test('workspace agent-only step asks the user to select an agent when multiple exist', () => {
  expect(resolveWorkspaceSetupChecklistAction({
    stepKey: 'connectChannel',
    agents,
  })).toEqual({
    kind: 'toast',
    message: 'Please select agent to proceed',
  });
});

test('test agent step opens agent setup with the test window query', () => {
  expect(resolveWorkspaceSetupChecklistAction({
    stepKey: 'testAgent',
    agents,
    selectedAgentId: 'agent_b',
  })).toEqual({
    kind: 'navigate',
    to: '/dashboard/agent_b/agent-setup?test=1',
  });
});
