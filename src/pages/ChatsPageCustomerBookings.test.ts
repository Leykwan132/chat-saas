import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./ChatsPage.tsx', import.meta.url), 'utf8');

test('places only create booking above assignee and uses most recent above the prompt', () => {
  const createBookingAction = source.indexOf('Create booking');
  const bookingsSection = source.indexOf('<InboxCustomerBookingsSection');
  const assigneeSection = source.indexOf(
    '<p className="text-xs text-muted-foreground">Assignee</p>',
  );
  const customerDetailsSection = source.indexOf(
    'onClick={() => setCustomerDetailsOpen',
  );
  const tagsSection = source.indexOf('onClick={() => setTagsSectionOpen');
  const bookedRailAction = source.indexOf('label="Booked"');
  const assigneeRailAction = source.indexOf('label="Assignee"');
  expect(createBookingAction).toBeGreaterThan(-1);
  expect(createBookingAction).toBeLessThan(assigneeSection);
  expect(bookingsSection).toBeGreaterThan(-1);
  expect(bookingsSection).toBeGreaterThan(customerDetailsSection);
  expect(bookingsSection).toBeLessThan(tagsSection);
  expect(bookedRailAction).toBeGreaterThan(-1);
  expect(bookedRailAction).toBeGreaterThan(assigneeRailAction);
  expect(source).toContain('const mostRecentBooking = getMostRecentCustomerBooking');
  expect(source).toContain('onOpenDetails={() => setSelectedBookingId(mostRecentBooking.bookingId)}');
  expect(source).toContain('<CreateCustomerBookingDialog');
  expect(source).toContain('<InboxCustomerBookingDetailsDialog');
});
