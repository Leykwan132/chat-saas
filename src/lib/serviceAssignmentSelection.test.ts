import { expect, test } from 'vitest';
import { DEFAULT_SERVICE_FORM } from './serviceForm';
import { includeAllServiceTeammates } from './serviceAssignmentSelection';

test('selects every available teammate', () => {
  expect(
    includeAllServiceTeammates(
      { ...DEFAULT_SERVICE_FORM, assignedWorkosUserIds: ['owner-id'] },
      [{ value: 'owner-id' }, { value: 'admin-id' }],
    ).assignedWorkosUserIds,
  ).toEqual(['owner-id', 'admin-id']);
});
