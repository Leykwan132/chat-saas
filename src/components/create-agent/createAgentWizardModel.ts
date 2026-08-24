import type { AgentGoal } from '../../../shared/agentCreationGoals';
import { buildAgentSetupTestPath } from '../setup-checklist/workspaceSetupChecklistNavigation';

export type CreateAgentStep = 'identity' | 'goal' | 'availability' | 'service' | 'creating' | 'success';

export type BookingOnboardingDraft = {
  availability: {
    timezone: string;
    shifts: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>;
  };
  service?: {
    name: string;
    durationMinutes: number;
    appointmentBookingEnabled: boolean;
  };
};

export type CreateAgentStatus = {
  step: CreateAgentStep;
  phase: number;
  error: string | null;
  createdAgentId: string | null;
};

type CreateAgentStatusAction =
  | { type: 'showIdentity' }
  | { type: 'showGoal' }
  | { type: 'showAvailability' }
  | { type: 'showService' }
  | { type: 'started' }
  | { type: 'progressed'; phase: number }
  | { type: 'created'; agentId: string }
  | { type: 'ready' }
  | { type: 'failed'; error: string };

export function hasRequiredIdentity(input: {
  name: string;
  businessName: string;
  businessDescription: string;
}): boolean {
  return Boolean(input.name.trim() && input.businessName.trim() && input.businessDescription.trim());
}

export function getCreateAgentDestinations(agentId: string) {
  return {
    train: `/dashboard/${agentId}/knowledge-base/web`,
    playground: buildAgentSetupTestPath(agentId),
    channels: `/dashboard/${agentId}/channels`,
  };
}

export function buildCreateAgentRequest(input: {
  name: string;
  businessName: string;
  businessDescription: string;
  goal: AgentGoal;
  bookingOnboarding?: BookingOnboardingDraft;
}) {
  return {
    name: input.name.trim(),
    businessName: input.businessName.trim(),
    businessDescription: input.businessDescription.trim(),
    goal: input.goal,
    ...(input.bookingOnboarding ? { bookingOnboarding: input.bookingOnboarding } : {}),
  };
}

export function getCreateAgentGoalActionLabel(goal: AgentGoal | null) {
  return goal === 'bookService' ? 'Continue' : 'Create agent';
}

export function getCreateAgentStepCount(goal: AgentGoal | null) {
  return goal === 'bookService' ? 4 : 2;
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
  if (action.type === 'showAvailability') {
    return { ...status, step: 'availability', error: null };
  }
  if (action.type === 'showService') {
    return { ...status, step: 'service', error: null };
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
