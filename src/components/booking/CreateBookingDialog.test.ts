import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const dialogSource = readFileSync(new URL('./CreateBookingDialog.tsx', import.meta.url), 'utf8');
const customerSource = readFileSync(new URL('./BookingCustomerCombobox.tsx', import.meta.url), 'utf8');
const customerSummarySource = readFileSync(new URL('./BookingCustomerSummary.tsx', import.meta.url), 'utf8');
const inboxSource = readFileSync(new URL('../inbox/CreateCustomerBookingDialog.tsx', import.meta.url), 'utf8');
const calendarDialogSource = readFileSync(new URL('../calendar/CalendarCreateBookingDialog.tsx', import.meta.url), 'utf8');
const calendarPageSource = readFileSync(new URL('../../pages/CalendarPage.tsx', import.meta.url), 'utf8');
const calendarEventsSource = readFileSync(new URL('../../../convex/calendarEvents.ts', import.meta.url), 'utf8');

test('shares the booking dialog between Inbox and Calendar', () => {
  expect(inboxSource).toContain('<CreateBookingDialog');
  expect(calendarDialogSource).toContain('<CreateBookingDialog');
  expect(calendarDialogSource).toContain('api.appointmentBooking.calendarManualBooking');
  expect(calendarDialogSource).not.toContain('searchCustomerOptions');
  expect(calendarDialogSource).not.toContain('api.calendarEvents.create');
  expect(dialogSource).toContain('BookingCustomerCombobox');
  expect(dialogSource).toContain('<BookingCustomerSummary customer={fixedCustomer} />');
  expect(dialogSource).toContain('customer={selectedCustomer}');
  expect(dialogSource).toContain('aria-label="Change customer"');
  expect(dialogSource).toContain("onCustomerQueryChange?.('')");
  expect(customerSummarySource).toContain('action?: ReactNode');
  expect(customerSummarySource).toContain('bookingCustomerSource');
  expect(customerSummarySource).toContain('<Icon aria-label={source.label}');
  expect(dialogSource).toContain('<Label htmlFor="manual-booking-remarks">Remarks</Label>');
  expect(dialogSource).toContain('placeholder="Add optional internal notes"');
  expect(dialogSource).not.toContain('manualBookingCustomerFields');
  expect(dialogSource).not.toContain('controller.updateField');
});

test('uses a searchable scrollable customer Combobox', () => {
  expect(customerSource).toContain('<Combobox');
  expect(customerSource).toContain('<ComboboxInput');
  expect(customerSource).toContain('<ComboboxList');
  expect(customerSource).toContain('overflow-y-auto');
  expect(customerSource).not.toContain('filter={null}');
  expect(customerSource).toContain('filter={bookingCustomerMatchesQuery}');
  expect(customerSource).toContain('bookingCustomerSource(customer)');
  expect(customerSource).toContain('const inputAnchorRef = React.useRef<HTMLDivElement>(null)');
  expect(customerSource).toContain('<div ref={inputAnchorRef} className="w-full">');
  expect(customerSource).toContain('anchor={inputAnchorRef}');
  expect(customerSource).toContain('w-(--anchor-width) min-w-(--anchor-width) rounded-xl');
  expect(calendarDialogSource).toContain('customers={customers}');
  expect(calendarEventsSource).toContain('.collect()');
});

test('keeps generic event creation separate from the primary booking action', () => {
  expect(calendarPageSource).toContain('New Booking');
  expect(calendarPageSource).toContain('<CalendarCreateBookingDialog');
  expect(calendarPageSource).toContain('openCreateEventSheet(nextDay)');
  expect(calendarPageSource).toContain("editingEvent ? 'Event Details' : 'New Event'");
});
