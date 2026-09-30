import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./ChatsPage.tsx', import.meta.url), 'utf8');

test('places only create booking above assignee', () => {
  const createBookingAction = source.indexOf('Create booking');
  const bookingsSection = source.indexOf('<InboxCustomerBookingsSection');
  const assigneeSection = source.indexOf(
    '<p className="text-xs text-muted-foreground">Assignee</p>',
  );
  const customerDetailsSection = source.indexOf(
    'onClick={() => setCustomerDetailsOpen',
  );
  const tagsSection = source.indexOf('onClick={() => setTagsSectionOpen');
  const summarySection = source.indexOf('onClick={() => setInteractionSummaryOpen');
  const bookedRailAction = source.indexOf('label="Booked"');
  const assigneeRailAction = source.indexOf('label="Assignee"');
  expect(createBookingAction).toBeGreaterThan(-1);
  expect(createBookingAction).toBeLessThan(assigneeSection);
  expect(bookingsSection).toBeGreaterThan(-1);
  expect(summarySection).toBeGreaterThan(customerDetailsSection);
  expect(summarySection).toBeLessThan(tagsSection);
  expect(bookingsSection).toBeGreaterThan(customerDetailsSection);
  expect(bookingsSection).toBeGreaterThan(tagsSection);
  expect(bookingsSection).toBeGreaterThan(summarySection);
  expect(source.indexOf('Clear Conversation')).toBeGreaterThan(bookingsSection);
  expect(bookedRailAction).toBeGreaterThan(-1);
  expect(bookedRailAction).toBeGreaterThan(assigneeRailAction);
  expect(source).toContain('const [bookingsOpen, setBookingsOpen] = useState(true)');
  expect(source).toContain('const mostRecentBooking = getMostRecentCustomerBooking');
  expect(source).not.toContain('InboxBookingDetailsCard');
  expect(source).toContain('<CreateCustomerBookingDialog');
  expect(source).toContain('<InboxCustomerBookingDetailsDialog');
});
