import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const dialogSource = readFileSync(new URL('./CreateBookingDialog.tsx', import.meta.url), 'utf8');
const customerSource = readFileSync(new URL('./BookingCustomerCombobox.tsx', import.meta.url), 'utf8');
const customerSummarySource = readFileSync(new URL('./BookingCustomerSummary.tsx', import.meta.url), 'utf8');
const inboxSource = readFileSync(new URL('../inbox/CreateCustomerBookingDialog.tsx', import.meta.url), 'utf8');
const calendarDialogSource = readFileSync(new URL('../calendar/CalendarCreateBookingDialog.tsx', import.meta.url), 'utf8');
const calendarSidebarSource = readFileSync(new URL('../calendar/CalendarSidebar.tsx', import.meta.url), 'utf8');
const calendarPageSource = readFileSync(new URL('../../pages/CalendarPage.tsx', import.meta.url), 'utf8');
const calendarEventsSource = readFileSync(new URL('../../../convex/calendarEvents.ts', import.meta.url), 'utf8');
const controllerSource = readFileSync(new URL('./useCreateBookingController.ts', import.meta.url), 'utf8');

test('shares the booking dialog between Inbox and Calendar', () => {
  expect(inboxSource).toContain('<CreateBookingDialog');
  expect(calendarDialogSource).toContain('<CreateBookingDialog');
  expect(calendarDialogSource).toContain('api.appointmentBooking.calendarManualBooking');
  expect(calendarDialogSource).toContain('useAction(api.appointmentBooking.calendarManualBooking.create)');
  expect(inboxSource).toContain('useAction(api.appointmentBooking.manualBooking.create)');
  expect(calendarDialogSource).not.toContain('getNextAvailableSlot');
  expect(calendarDialogSource).not.toContain('loadNearestSlot=');
  expect(inboxSource).not.toContain('getNextAvailableSlot');
  expect(inboxSource).not.toContain('loadNearestSlot=');
  expect(controllerSource).toContain('if (customer === previousCustomer) return;');
  expect(controllerSource).toContain('const customerRef = useRef(customer);');
  expect(controllerSource).toContain('const checkAvailabilityRef = useRef(checkAvailability);');
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
  expect(dialogSource).toContain('<Label htmlFor="manual-booking-title">Title</Label>');
  expect(dialogSource).toContain('value={controller.title}');
  expect(dialogSource).toContain('onChange={(event) => controller.setTitle(event.target.value)}');
  expect(controllerSource).toContain('const defaultTitle =');
  expect(controllerSource).toContain('title: title.trim() || undefined');
  expect(dialogSource).not.toContain('manualBookingCustomerFields');
  expect(dialogSource).not.toContain('controller.updateField');
});

test('guides users to create a service when none are active', () => {
  expect(dialogSource).toContain('from \'@/components/ui/empty\'');
  expect(dialogSource).toContain('<EmptyTitle>No active services</EmptyTitle>');
  expect(dialogSource).toContain('Create a service so you can book appointments.');
  expect(dialogSource).toContain('Create service');
  expect(dialogSource).toContain('to={`/dashboard/${agentId}/services?create=1`}');
  expect(dialogSource).not.toContain('No active Services are configured.');
});

test('shows a spinner without changing the label while creating a booking', () => {
  expect(dialogSource).toContain("import { Spinner } from '@/components/ui/spinner';");
  expect(dialogSource).toContain('{controller.busy && <Spinner data-icon="inline-start" />}');
  expect(dialogSource).toContain('Create booking');
  expect(dialogSource).not.toContain('Creating...');
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

test('uses the booking dialog for Calendar creation actions', () => {
  expect(calendarSidebarSource).not.toContain('New Booking');
  expect(calendarPageSource).toContain('<CalendarCreateBookingDialog');
  expect(calendarPageSource).toContain('onCreateBooking={(nextDay) =>');
  expect(calendarPageSource).toContain('handleSelectDate(nextDay);');
  expect(calendarPageSource).toContain('setCreateBookingOpen(true);');
  expect(calendarPageSource).toContain('Create Booking');
  expect(calendarPageSource).not.toContain('Create event');
  expect(calendarPageSource).toContain('useAction(calendarApi.create)');
  expect(calendarPageSource).not.toContain('useMutation(calendarApi.create)');
});

test('inherits the shared modal backdrop', () => {
  expect(dialogSource).not.toContain('overlayClassName=');
});

test('describes the Create booking dialog for assistive technology', () => {
  expect(dialogSource).toContain('DialogDescription');
  expect(dialogSource).toContain('Create a booking for a customer.');
});

test('prefills each new booking with the next local 30-minute slot', () => {
  expect(dialogSource).toContain('if (!open || fixedCustomer !== undefined) return;');
  expect(dialogSource).toContain('setSelectedCustomer(null);');
  expect(dialogSource).toContain("onCustomerQueryChange?.('');");
  expect(dialogSource).toContain('open={open}');
  expect(controllerSource).toContain('if (!open) return;');
  expect(controllerSource).toContain("setServiceId('');");
  expect(controllerSource).toContain("setStartTime('');");
  expect(controllerSource).toContain("setEndTime('');");
  expect(controllerSource).toContain("setRemarks('');");
  expect(controllerSource).toContain('}, [open]);');
  expect(controllerSource).toContain('manualBookingScheduleFromNextHalfHour');
  expect(controllerSource).toContain('Date.now(), service.timeZone, service.durationMinutes');
  expect(controllerSource).toContain("setDate(initialDate ?? format(new Date(), 'yyyy-MM-dd'));");
  expect(controllerSource).toContain('const selectedDate = initialDate ?? nextSchedule.date;');
  expect(controllerSource).toContain('setDate(selectedDate);');
  expect(controllerSource).not.toContain('loadNearestSlot');
  expect(controllerSource).not.toContain('nearestSlotMessage');
  expect(controllerSource).toContain('if (open && !titleCustomizedRef.current) setTitle(defaultTitle);');
  expect(dialogSource).not.toContain('controller.loadingNearestSlot');
  expect(dialogSource).not.toContain('No upcoming available times for this service.');
  expect(calendarDialogSource).toContain('initialDate={initialDate}');
});
