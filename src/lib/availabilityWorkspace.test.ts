import { expect, test } from 'vitest';
import {
  availabilityBackPath,
  canViewAvailabilityRoster,
} from './availabilityWorkspace';

test('only an organizational owner can view the availability roster', () => {
  expect(canViewAvailabilityRoster({ type: 'personal' }, 'owner')).toBe(false);
  expect(canViewAvailabilityRoster({ type: 'organizational' }, 'admin')).toBe(false);
  expect(canViewAvailabilityRoster({ type: 'organizational' }, 'member')).toBe(false);
  expect(canViewAvailabilityRoster({ type: 'organizational' }, 'owner')).toBe(true);
});

test('uses the dashboard as the availability back path without a roster', () => {
  expect(availabilityBackPath('agent-1', false)).toBe('/dashboard/agent-1');
  expect(availabilityBackPath('agent-1', true)).toBe('/dashboard/agent-1/availability');
});
