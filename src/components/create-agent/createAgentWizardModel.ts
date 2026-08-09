import type { AgentGoal } from '../../../shared/agentCreationGoals';

export type CreateAgentStep = 'identity' | 'goal' | 'creating' | 'success';

export type CreateAgentStatus = {
  step: CreateAgentStep;
  phase: number;
  error: string | null;
  createdAgentId: string | null;
};

type CreateAgentStatusAction =
  | { type: 'showIdentity' }
  | { type: 'showGoal' }
  | { type: 'started' }
  | { type: 'progressed'; phase: number }
  | { type: 'created'; agentId: string }
  | { type: 'ready' }
  | { type: 'failed'; error: string };

export function hasRequiredIdentity(input: {
  name: string;
  businessName: string;
}): boolean {
  return Boolean(input.name.trim() && input.businessName.trim());
}

export function getCreateAgentDestinations(agentId: string) {
  return {
    train: `/dashboard/${agentId}/knowledge-base/web`,
    playground: `/dashboard/${agentId}/agent-setup`,
    channels: `/dashboard/${agentId}/channels`,
  };
}

export function buildCreateAgentRequest(input: {
  name: string;
  businessName: string;
  businessDescription: string;
  goal: AgentGoal;
}) {
  return {
    name: input.name.trim(),
    businessName: input.businessName.trim(),
    businessDescription: input.businessDescription.trim() || undefined,
    goal: input.goal,
  };
}

export function reduceCreateAgentStatus(
  status: CreateAgentStatus,
  action: CreateAgentStatusAction,
): CreateAgentStatus {
  if (action.type === 'showIdentity') {
    return { ...status, step: 'identity', error: null };
  }
  if (action.type === 'showGoal') {
    return { ...status, step: 'goal', error: null };
  }
  if (action.type === 'started') {
    return { step: 'creating', phase: 0, error: null, createdAgentId: null };
  }
  if (action.type === 'progressed') {
    return { ...status, phase: action.phase };
  }
  if (action.type === 'created') {
    return { ...status, phase: 3, createdAgentId: action.agentId };
  }
  if (action.type === 'ready') {
    return { ...status, step: 'success' };
  }
  return {
    step: 'goal',
    phase: 0,
    error: action.error,
    createdAgentId: null,
  };
}
