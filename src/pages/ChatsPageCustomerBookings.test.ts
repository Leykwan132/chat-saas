import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./ChatsPage.tsx', import.meta.url), 'utf8');

test('places customer bookings above assignee and uses most recent above the prompt', () => {
  const bookingsSection = source.indexOf('<InboxCustomerBookingsSection');
  const assigneeSection = source.indexOf(
    '<p className="text-xs text-muted-foreground">Assignee</p>',
  );
  const bookedRailAction = source.indexOf('label="Booked"');
  const assigneeRailAction = source.indexOf('label="Assignee"');
  expect(bookingsSection).toBeGreaterThan(-1);
  expect(bookingsSection).toBeLessThan(assigneeSection);
  expect(bookedRailAction).toBeGreaterThan(-1);
  expect(bookedRailAction).toBeLessThan(assigneeRailAction);
  expect(source).toContain('const mostRecentBooking = getMostRecentCustomerBooking');
  expect(source).toContain('onOpenDetails={() => setSelectedBookingId(mostRecentBooking.bookingId)}');
  expect(source).toContain('<CreateCustomerBookingDialog');
  expect(source).toContain('<InboxCustomerBookingDetailsDialog');
});
