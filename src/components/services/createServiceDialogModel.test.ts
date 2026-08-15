import { expect, test } from 'vitest';
import {
  canCreateTeamService,
  getCreateServiceAssignmentDefaults,
  getCreateServicePrimaryAction,
} from './createServiceDialogModel';

test('uses the current user as the only default personal assignee', () => {
  expect(getCreateServiceAssignmentDefaults('user-ley')).toEqual({
    assignedWorkosUserIds: ['user-ley'],
    assignmentStrategy: 'balanced',
    specificWorkosUserId: '',
  });
});

test('allows Team only for an eligible workspace plan', () => {
  expect(canCreateTeamService('free')).toBe(false);
  expect(canCreateTeamService('starter')).toBe(true);
  expect(canCreateTeamService(undefined)).toBe(false);
});

test('uses the primary action for the selected assignment mode', () => {
  expect(getCreateServicePrimaryAction('self')).toBe('Create');
  expect(getCreateServicePrimaryAction('team')).toBe('Continue');
});
