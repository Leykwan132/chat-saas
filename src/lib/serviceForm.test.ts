import { expect, test } from 'vitest';
import {
  buildServiceMutationArgs,
  DEFAULT_SERVICE_FORM,
  serviceToForm,
  validateServiceAssignment,
} from './serviceForm';
import type { ServiceRow } from './serviceForm';

const service = {
  _id: 'service-id',
  name: 'Consultation',
  isActive: true,
  sortOrder: 0,
  durationMinutes: 30,
  fields: [],
  salesStyle: 'neutral',
  assignmentStrategy: 'balanced',
  assignedWorkosUserIds: ['owner-id'],
} as unknown as ServiceRow;

test('maps and saves selected service teammates', () => {
  const form = serviceToForm(service, ['owner-id', 'member-id']);

  expect(form.assignedWorkosUserIds).toEqual(['owner-id']);
  expect(buildServiceMutationArgs(form).assignedWorkosUserIds).toEqual(['owner-id']);
});

test('uses the team for a service that has not been migrated', () => {
  expect(serviceToForm({ ...service, assignedWorkosUserIds: undefined }, ['owner-id', 'member-id'])
    .assignedWorkosUserIds).toEqual(['owner-id', 'member-id']);
});

test('requires a selected teammate and a selected specific teammate', () => {
  expect(validateServiceAssignment({ ...DEFAULT_SERVICE_FORM, assignedWorkosUserIds: [] }))
    .toBe('Select at least one teammate.');
  expect(validateServiceAssignment({
    ...DEFAULT_SERVICE_FORM,
    assignedWorkosUserIds: ['owner-id'],
    assignmentStrategy: 'specific_user',
    specificWorkosUserId: 'member-id',
  })).toBe('Select the specific teammate for this service.');
});
