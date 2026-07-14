import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const dialogSource = readFileSync(new URL('./CreateBookingDialog.tsx', import.meta.url), 'utf8');
const customerSource = readFileSync(new URL('./BookingCustomerCombobox.tsx', import.meta.url), 'utf8');
const inboxSource = readFileSync(new URL('../inbox/CreateCustomerBookingDialog.tsx', import.meta.url), 'utf8');
const calendarDialogSource = readFileSync(new URL('../calendar/CalendarCreateBookingDialog.tsx', import.meta.url), 'utf8');
const calendarPageSource = readFileSync(new URL('../../pages/CalendarPage.tsx', import.meta.url), 'utf8');

test('shares the booking dialog between Inbox and Calendar', () => {
  expect(inboxSource).toContain('<CreateBookingDialog');
  expect(calendarDialogSource).toContain('<CreateBookingDialog');
  expect(calendarDialogSource).toContain('api.appointmentBooking.calendarManualBooking');
  expect(calendarDialogSource).toContain('searchCustomerOptions');
  expect(calendarDialogSource).not.toContain('api.calendarEvents.create');
  expect(dialogSource).toContain('BookingCustomerCombobox');
});

test('uses a searchable scrollable customer Combobox', () => {
  expect(customerSource).toContain('<Combobox');
  expect(customerSource).toContain('<ComboboxInput');
  expect(customerSource).toContain('<ComboboxList');
  expect(customerSource).toContain('overflow-y-auto');
  expect(customerSource).not.toContain('filter={null}');
  expect(customerSource).toContain('bookingCustomerSearchText(customer)');
  expect(customerSource).toContain('bookingCustomerSource(customer)');
  expect(calendarDialogSource).toContain('searchResults ?? recentCustomers');
});

test('keeps generic event creation separate from the primary booking action', () => {
  expect(calendarPageSource).toContain('New Booking');
  expect(calendarPageSource).toContain('<CalendarCreateBookingDialog');
  expect(calendarPageSource).toContain('openCreateEventSheet(nextDay)');
  expect(calendarPageSource).toContain("editingEvent ? 'Event Details' : 'New Event'");
});
