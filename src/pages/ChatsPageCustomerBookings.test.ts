import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./ChatsPage.tsx', import.meta.url), 'utf8');

test('places customer bookings below customer details and uses most recent above the prompt', () => {
  const customerDetails = source.indexOf('Customer details');
  const bookingsSection = source.indexOf('<InboxCustomerBookingsSection');
  const tagsSection = source.indexOf('Tags (');
  expect(customerDetails).toBeGreaterThan(-1);
  expect(bookingsSection).toBeGreaterThan(customerDetails);
  expect(tagsSection).toBeGreaterThan(bookingsSection);
  expect(source).toContain('const mostRecentBooking = getMostRecentCustomerBooking');
  expect(source).toContain('onOpenDetails={() => setSelectedBookingId(mostRecentBooking.bookingId)}');
  expect(source).toContain('<CreateCustomerBookingDialog');
  expect(source).toContain('<InboxCustomerBookingDetailsDialog');
});
