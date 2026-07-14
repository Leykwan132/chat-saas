import { expect, test } from 'vitest';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  bookingCustomerSearchText,
  bookingCustomerSource,
} from './bookingCustomerPresentation';

const customer = {
  _id: 'customer' as Id<'customers'>,
  name: 'Kwan Main',
  phone: '60129499394',
  email: 'kwan@example.com',
  contactAddress: 'wa:60129499394',
  service: 'whatsapp' as const,
};

test('builds one normalized search value from every customer identity field', () => {
  expect(bookingCustomerSearchText(customer)).toBe(
    'kwan main 60129499394 kwan@example.com wa:60129499394',
  );
});

test('maps every customer source to its visible label', () => {
  expect(bookingCustomerSource({ service: 'whatsapp' }).label).toBe('WhatsApp');
  expect(bookingCustomerSource({ service: 'instagram' }).label).toBe('Instagram');
  expect(bookingCustomerSource({ service: 'messenger' }).label).toBe('Messenger');
  expect(bookingCustomerSource({ service: 'web' }).label).toBe('Web');
  expect(bookingCustomerSource({ service: 'manual' }).label).toBe('Imported');
});
