import type { PlanKey } from '../../../shared/planCatalog';
import type { AssignmentStrategy } from '@/lib/serviceForm';

export type CreateServiceAssignmentMode = 'self' | 'team';

export function getCreateServiceAssignmentDefaults(currentWorkosUserId: string) {
  return {
    assignedWorkosUserIds: [currentWorkosUserId],
    assignmentStrategy: 'balanced' as AssignmentStrategy,
    specificWorkosUserId: '',
  };
}

export function canCreateTeamService(plan: PlanKey | undefined) {
  return plan !== undefined && plan !== 'free';
}

export function getCreateServicePrimaryAction(mode: CreateServiceAssignmentMode) {
  return mode === 'self' ? 'Create' : 'Continue';
}
