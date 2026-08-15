import { expect, test } from 'vitest';
import {
  bookingTeammateAvailabilityLabel,
  getEffectiveBookingServiceIds,
  getUpdatedBookingServiceIds,
} from './workflowBookingNodeServicesModel';

const services = [
  { _id: 'service-a' },
  { _id: 'service-b' },
];

test('defaults a booking node to every service and toggles one selection', () => {
  expect(getEffectiveBookingServiceIds(undefined, services)).toEqual(['service-a', 'service-b']);
  expect(getUpdatedBookingServiceIds(['service-a'], 'service-b', true))
    .toEqual(['service-a', 'service-b']);
  expect(getUpdatedBookingServiceIds(['service-a', 'service-b'], 'service-a', false))
    .toEqual(['service-b']);
});

test('labels the assigned teammate count for a service', () => {
  expect(bookingTeammateAvailabilityLabel(1)).toBe('1 teammate available');
  expect(bookingTeammateAvailabilityLabel(2)).toBe('2 teammates available');
});
