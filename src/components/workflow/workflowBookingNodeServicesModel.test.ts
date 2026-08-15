import { expect, test } from 'vitest';
import {
  bookingTeammateAvailabilityLabel,
  getEffectiveBookingServiceIds,
  getSelectedBookingServices,
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

test('returns only active services enabled for an inspector booking node', () => {
  const bookingServices = [
    { _id: 'service-a', isActive: true },
    { _id: 'service-b', isActive: false },
    { _id: 'service-c', isActive: true },
  ];

  expect(getSelectedBookingServices(['service-a', 'service-b'], bookingServices))
    .toEqual([{ _id: 'service-a', isActive: true }]);
  expect(getSelectedBookingServices(undefined, bookingServices))
    .toEqual([
      { _id: 'service-a', isActive: true },
      { _id: 'service-c', isActive: true },
    ]);
});
