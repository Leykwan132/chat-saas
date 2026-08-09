import { expect, test } from 'vitest';
import {
  buildCreateAgentRequest,
  getCreateAgentDestinations,
  hasRequiredIdentity,
  reduceCreateAgentStatus,
} from './createAgentWizardModel';

test('requires trimmed agent and business names', () => {
  expect(hasRequiredIdentity({ name: 'Nova', businessName: 'Northstar' })).toBe(true);
  expect(hasRequiredIdentity({ name: ' ', businessName: 'Northstar' })).toBe(false);
  expect(hasRequiredIdentity({ name: 'Nova', businessName: ' ' })).toBe(false);
});

test('builds the three post-creation destinations for the new agent', () => {
  expect(getCreateAgentDestinations('agent_123')).toEqual({
    train: '/dashboard/agent_123/knowledge-base/web',
    playground: '/dashboard/agent_123/agent-setup?test=1',
    channels: '/dashboard/agent_123/channels',
  });
});

test('builds a trimmed backend-owned creation request', () => {
  expect(
    buildCreateAgentRequest({
      name: ' Nova ',
      businessName: ' Northstar ',
      businessDescription: '   ',
      goal: 'support',
    }),
  ).toEqual({
    name: 'Nova',
    businessName: 'Northstar',
    businessDescription: undefined,
    goal: 'support',
  });
});

test('returns a failed creation to the goal step for a retry', () => {
  expect(
    reduceCreateAgentStatus(
      { step: 'creating', phase: 2, error: null, createdAgentId: null },
      { type: 'failed', error: 'Unable to create agent' },
    ),
  ).toEqual({
    step: 'goal',
    phase: 0,
    error: 'Unable to create agent',
    createdAgentId: null,
  });
});

test('moves a successful creation through progress to the success step', () => {
  const started = reduceCreateAgentStatus(
    { step: 'goal', phase: 0, error: 'Old error', createdAgentId: null },
    { type: 'started' },
  );
  const progressed = reduceCreateAgentStatus(started, { type: 'progressed', phase: 2 });
  const created = reduceCreateAgentStatus(progressed, {
    type: 'created',
    agentId: 'agent_123',
  });

  expect(reduceCreateAgentStatus(created, { type: 'ready' })).toEqual({
    step: 'success',
    phase: 3,
    error: null,
    createdAgentId: 'agent_123',
  });
});

test('moves between the identity and goal steps without clearing inputs elsewhere', () => {
  const initial = { step: 'identity' as const, phase: 0, error: null, createdAgentId: null };
  const goal = reduceCreateAgentStatus(initial, { type: 'showGoal' });
  expect(goal.step).toBe('goal');
  expect(reduceCreateAgentStatus(goal, { type: 'showIdentity' }).step).toBe('identity');
});
