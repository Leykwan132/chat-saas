# Manual Booking Customer Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Calendar and Conversation Details manual booking use stored customer data, expose only Service, Date & time, and optional Remarks, and fix Calendar customer filtering with source icons.

**Architecture:** Keep the existing shared dialog and separate Inbox/Calendar Convex commands. Add a focused customer-presentation module for search text and source metadata, simplify the shared form, and centralize authoritative manual-booking field construction in a backend helper before atomic event/session persistence.

**Tech Stack:** React 19, TypeScript, Base UI/shadcn Combobox, Convex, Vitest, date-fns, Tailwind CSS v4.

## Global Constraints

- Run every script and test under Node v22.
- Keep every new or modified code module below 300 lines; do not expand the pre-existing oversized Calendar page beyond its existing integration surface.
- Add no code comments unless the behavior cannot be made self-explanatory.
- Both staff-operated manual-booking dialogs expose only Customer context, Service, Date & time, and optional Remarks.
- Manual booking uses stored customer identity and does not require service data-collection questions.
- Customer search stays workspace-scoped and bounded.
- Generic `calendarEvents.create` remains event-only.
- Work directly on `main` as authorized by the user.

---

### Task 1: Customer Search and Source Presentation

**Files:**
- Create: `src/components/booking/bookingCustomerPresentation.tsx`
- Create: `src/components/booking/bookingCustomerPresentation.test.tsx`
- Modify: `src/components/booking/bookingDialogTypes.ts`
- Modify: `src/components/booking/BookingCustomerCombobox.tsx`
- Modify: `src/components/calendar/CalendarCreateBookingDialog.tsx`
- Modify: `src/components/booking/CreateBookingDialog.test.ts`

**Interfaces:**
- Produces: `bookingCustomerSearchText(customer: BookingCustomer): string`.
- Produces: `bookingCustomerLabel(customer: BookingCustomerDetails): string`.
- Produces: `bookingCustomerDetail(customer: BookingCustomerDetails): string | undefined`.
- Produces: `bookingCustomerSource(customer: Pick<BookingCustomer, 'service'>): { label: string; Icon: ElementType; iconClassName: string }`.
- Extends: `BookingCustomerDetails.service?` and required `BookingCustomer.service` with `'whatsapp' | 'instagram' | 'messenger' | 'web' | 'manual'`.

- [ ] **Step 1: Write failing presentation and integration tests**

Add pure tests:

```tsx
expect(bookingCustomerSearchText({
  _id: customerId,
  name: 'Kwan Main',
  phone: '60129499394',
  email: 'kwan@example.com',
  contactAddress: 'wa:60129499394',
  service: 'whatsapp',
})).toBe('kwan main 60129499394 kwan@example.com wa:60129499394');

expect(bookingCustomerSource({ ...customer, service: 'whatsapp' }).label).toBe('WhatsApp');
expect(bookingCustomerSource({ ...customer, service: 'instagram' }).label).toBe('Instagram');
expect(bookingCustomerSource({ ...customer, service: 'messenger' }).label).toBe('Messenger');
expect(bookingCustomerSource({ ...customer, service: 'web' }).label).toBe('Web');
expect(bookingCustomerSource({ ...customer, service: 'manual' }).label).toBe('Imported');
```

Extend the source regression test:

```ts
expect(customerSource).not.toContain('filter={null}');
expect(customerSource).toContain('bookingCustomerSearchText(customer)');
expect(customerSource).toContain('bookingCustomerSource(customer)');
expect(calendarDialogSource).toContain('searchResults ?? recentCustomers');
```

- [ ] **Step 2: Run tests and verify red**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/booking/bookingCustomerPresentation.test.tsx src/components/booking/CreateBookingDialog.test.ts
```

Expected: FAIL because the presentation module and immediate filtering behavior do not exist.

- [ ] **Step 3: Add customer presentation helpers and enable local filtering**

Implement the focused mapping module:

```tsx
import type { ElementType } from 'react';
import { Globe, UserRoundPlus } from 'lucide-react';
import { SiInstagram, SiMessenger, SiWhatsapp } from 'react-icons/si';
import { getPlatformIconClassName } from '@/lib/platformIconStyles';
import type { BookingCustomer, BookingCustomerDetails } from './bookingDialogTypes';

export function bookingCustomerSearchText(customer: BookingCustomer) {
  return [customer.name, customer.phone, customer.email, customer.contactAddress]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value))
    .join(' ');
}

export function bookingCustomerLabel(customer: BookingCustomerDetails) {
  return customer.name?.trim()
    || customer.email
    || customer.phone
    || customer.contactAddress
    || 'Unnamed customer';
}

export function bookingCustomerDetail(customer: BookingCustomerDetails) {
  return customer.email || customer.phone || customer.contactAddress;
}

const sourceMeta = {
  whatsapp: { label: 'WhatsApp', Icon: SiWhatsapp, iconClassName: getPlatformIconClassName('whatsapp') },
  instagram: { label: 'Instagram', Icon: SiInstagram, iconClassName: getPlatformIconClassName('instagram') },
  messenger: { label: 'Messenger', Icon: SiMessenger, iconClassName: getPlatformIconClassName('messenger') },
  web: { label: 'Web', Icon: Globe, iconClassName: getPlatformIconClassName('web') },
  manual: { label: 'Imported', Icon: UserRoundPlus, iconClassName: 'text-muted-foreground' },
} satisfies Record<NonNullable<BookingCustomer['service']>, {
  label: string;
  Icon: ElementType;
  iconClassName: string;
}>;

export function bookingCustomerSource(customer: Pick<BookingCustomer, 'service'>) {
  return sourceMeta[customer.service];
}
```

Render the icon in each option and supply a real filter:

```tsx
<Combobox
  items={customers}
  filter={(customer, query) =>
    bookingCustomerSearchText(customer).includes(query.trim().toLowerCase())
  }
>
```

Use recent customers while the server search is pending, then replace them:

```tsx
customers={customerQuery.trim() ? searchResults ?? recentCustomers : recentCustomers}
```

- [ ] **Step 4: Run tests and verify green**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/booking/bookingCustomerPresentation.test.tsx src/components/booking/CreateBookingDialog.test.ts convex/customerSearch.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/booking/bookingCustomerPresentation.tsx src/components/booking/bookingCustomerPresentation.test.tsx src/components/booking/bookingDialogTypes.ts src/components/booking/BookingCustomerCombobox.tsx src/components/calendar/CalendarCreateBookingDialog.tsx src/components/booking/CreateBookingDialog.test.ts
git commit -m "Fix booking customer search"
```

### Task 2: Simplified Shared Manual-Booking Dialog

**Files:**
- Create: `src/components/booking/BookingCustomerSummary.tsx`
- Modify: `src/components/booking/CreateBookingDialog.tsx`
- Modify: `src/components/booking/useCreateBookingController.ts`
- Modify: `src/components/booking/bookingDialogTypes.ts`
- Modify: `src/components/inbox/ManualBookingScheduleField.tsx`
- Modify: `src/components/booking/CreateBookingDialog.test.ts`
- Modify: `src/components/inbox/CreateCustomerBookingDialog.test.ts`
- Modify: `src/components/inbox/ManualBookingScheduleField.test.ts`

**Interfaces:**
- Produces: `BookingCustomerSummary({ customer }: { customer: BookingCustomerDetails })`.
- Extends: `BookingCreateInput.remarks?: string`.
- Removes: manual-booking custom field controls from `CreateBookingDialog`.

- [ ] **Step 1: Write failing shared-dialog tests**

Assert the approved surface:

```ts
expect(dialogSource).toContain('<BookingCustomerSummary customer={fixedCustomer} />');
expect(dialogSource).toContain('<Label htmlFor="manual-booking-remarks">Remarks</Label>');
expect(dialogSource).toContain('placeholder="Add optional internal notes"');
expect(dialogSource).not.toContain('manualBookingCustomerFields');
expect(dialogSource).not.toContain('controller.updateField');
expect(scheduleSource).toContain('<Label>Date & time</Label>');
expect(scheduleSource).not.toContain('<Label>Schedule</Label>');
```

- [ ] **Step 2: Run tests and verify red**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/booking/CreateBookingDialog.test.ts src/components/inbox/CreateCustomerBookingDialog.test.ts src/components/inbox/ManualBookingScheduleField.test.ts
```

Expected: FAIL because the customer summary, Remarks control, and new label do not exist.

- [ ] **Step 3: Add the read-only summary, Remarks, and simplified fields**

Implement a compact summary using the same customer label/detail/source helpers:

```tsx
export function BookingCustomerSummary({ customer }: { customer: BookingCustomerDetails }) {
  const source = customer.service ? bookingCustomerSource({ service: customer.service }) : null;
  const Icon = source?.Icon;
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
      {source && Icon ? <Icon aria-label={source.label} className={source.iconClassName} /> : null}
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{bookingCustomerLabel(customer)}</span>
        <span className="block truncate text-xs text-muted-foreground">{bookingCustomerDetail(customer)}</span>
      </span>
    </div>
  );
}
```

Replace the dynamic service-field loop with fixed-customer display and Remarks:

```tsx
{fixedCustomer ? <BookingCustomerSummary customer={fixedCustomer} /> : <BookingCustomerCombobox ... />}
<ManualBookingScheduleField ... />
<div className="grid gap-2">
  <Label htmlFor="manual-booking-remarks">Remarks</Label>
  <Textarea
    id="manual-booking-remarks"
    value={controller.remarks}
    onChange={(event) => controller.setRemarks(event.target.value)}
    placeholder="Add optional internal notes"
    className="min-h-20"
  />
</div>
```

Add `remarks` state to the controller and submit it trimmed:

```ts
const [remarks, setRemarks] = useState('');

await createBooking({
  serviceId: effectiveServiceId as Id<'appointmentServices'>,
  collectedFields: buildManualBookingCollectedFields(effectiveFields, date, startTime),
  startAt: selection.startAt,
  endAt: selection.endAt,
  remarks: remarks.trim() || undefined,
});
```

Rename the schedule label:

```tsx
<Label>Date & time</Label>
```

- [ ] **Step 4: Run tests and verify green**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/booking/CreateBookingDialog.test.ts src/components/inbox/CreateCustomerBookingDialog.test.ts src/components/inbox/ManualBookingScheduleField.test.ts src/components/EditableTimeCombobox.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/booking/BookingCustomerSummary.tsx src/components/booking/CreateBookingDialog.tsx src/components/booking/useCreateBookingController.ts src/components/booking/bookingDialogTypes.ts src/components/inbox/ManualBookingScheduleField.tsx src/components/booking/CreateBookingDialog.test.ts src/components/inbox/CreateCustomerBookingDialog.test.ts src/components/inbox/ManualBookingScheduleField.test.ts
git commit -m "Simplify manual booking form"
```

### Task 3: Authoritative Customer Fields and Remarks Persistence

**Files:**
- Create: `convex/appointmentBooking/manualBookingFields.ts`
- Create: `convex/manualBookingFields.test.ts`
- Modify: `convex/appointmentBooking/manualBookingCore.ts`
- Modify: `convex/appointmentBooking/manualBooking.ts`
- Modify: `convex/appointmentBooking/calendarManualBooking.ts`
- Modify: `convex/calendarManualBooking.test.ts`
- Modify: `convex/manualBookingAvailability.test.ts`

**Interfaces:**
- Produces: `manualBookingFieldsForCustomer(customer, submittedFields): CollectedFields`.
- Extends: both manual `create` mutations with `remarks: v.optional(v.string())`.
- Extends: `createManualBookingRecords(..., remarks?: string)`.

- [ ] **Step 1: Write failing helper and command tests**

Add a pure helper test:

```ts
expect(manualBookingFieldsForCustomer(customer, {
  date: '2026-07-18',
  time: '2:00pm',
  name: 'stale input',
  custom_question: 'discard me',
})).toEqual({
  date: '2026-07-18',
  time: '2:00pm',
  name: 'Jessica Lee',
  phone: '60123456789',
  email: 'jessica@example.com',
});
```

Extend Calendar and Inbox creation tests with a service custom field that is not submitted and assert creation succeeds. Pass `remarks: '  Bring samples  '` and assert:

```ts
expect(event?.remarks).toBe('Bring samples');
expect(session?.collectedFields).toMatchObject({
  name: customer.name,
  phone: customer.phone,
});
expect(session?.collectedFields).not.toHaveProperty('custom_question');
```

- [ ] **Step 2: Run tests and verify red**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/manualBookingFields.test.ts convex/calendarManualBooking.test.ts convex/manualBookingAvailability.test.ts
```

Expected: FAIL because manual commands still validate service questions and do not persist Remarks.

- [ ] **Step 3: Build authoritative collected fields and persist Remarks**

Implement the helper:

```ts
import type { Doc } from '../_generated/dataModel';
import type { CollectedFields } from './types';

export function manualBookingFieldsForCustomer(
  customer: Doc<'customers'>,
  submittedFields: CollectedFields,
): CollectedFields {
  const displayName = customer.name?.trim()
    || customer.email?.trim()
    || customer.phone?.trim()
    || customer.contactAddress.trim();
  return {
    date: typeof submittedFields.date === 'string' ? submittedFields.date : '',
    time: typeof submittedFields.time === 'string' ? submittedFields.time : '',
    name: displayName,
    ...(customer.phone?.trim() ? { phone: customer.phone.trim() } : {}),
    ...(customer.email?.trim() ? { email: customer.email.trim() } : {}),
  };
}
```

In each manual `create` command, resolve the customer, replace submitted fields, and do not call `missingServiceFields`:

```ts
const customer = await resolveCustomerForConversation(ctx, conversation, args.collectedFields);
const collectedFields = manualBookingFieldsForCustomer(customer, args.collectedFields);

return await createManualBookingRecords(ctx, {
  service,
  team,
  customer,
  conversation,
  assignedUser,
  selectedSlot,
  collectedFields,
  remarks: args.remarks,
  bookingSource: 'manual',
});
```

Persist trimmed Remarks atomically with the event:

```ts
const remarks = args.remarks?.trim();
const eventId = await ctx.db.insert('calendarEvents', {
  ...eventFields,
  remarks: remarks || undefined,
});
```

- [ ] **Step 4: Regenerate Convex bindings and run backend regressions**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && STRIPE_PRICE_STARTER_MONTHLY=mock_starter_monthly STRIPE_PRICE_STARTER_ANNUAL=mock_starter_annual STRIPE_PRICE_GROWTH_MONTHLY=mock_growth_monthly STRIPE_PRICE_GROWTH_ANNUAL=mock_growth_annual STRIPE_PRICE_BUSINESS_MONTHLY=mock_business_monthly STRIPE_PRICE_BUSINESS_ANNUAL=mock_business_annual STRIPE_PRICE_EXTRA_CREDITS_2000=mock_extra_2000 STRIPE_PRICE_EXTRA_CREDITS_5000=mock_extra_5000 STRIPE_PRICE_EXTRA_CREDITS_15000=mock_extra_15000 bunx convex codegen
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/manualBookingFields.test.ts convex/calendarManualBooking.test.ts convex/manualBookingAvailability.test.ts convex/appointmentBookingStatusTransition.test.ts convex/appointmentBookingComplete.test.ts convex/appointmentBookingCustomerHistory.test.ts convex/calendarEvents.test.ts
```

Expected: code generation succeeds and all focused backend tests pass.

- [ ] **Step 5: Commit**

```bash
git add convex/appointmentBooking/manualBookingFields.ts convex/manualBookingFields.test.ts convex/appointmentBooking/manualBookingCore.ts convex/appointmentBooking/manualBooking.ts convex/appointmentBooking/calendarManualBooking.ts convex/calendarManualBooking.test.ts convex/manualBookingAvailability.test.ts convex/_generated/api.d.ts
git commit -m "Persist simplified manual bookings"
```

### Task 4: Completion Verification

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: all preceding task outputs.
- Produces: verified implementation receipts and a clean committed `main` worktree.

- [ ] **Step 1: Run the complete focused regression set**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/customerSearch.test.ts convex/manualBookingFields.test.ts convex/calendarManualBooking.test.ts convex/manualBookingAvailability.test.ts convex/appointmentBookingStatusTransition.test.ts convex/appointmentBookingComplete.test.ts convex/appointmentBookingCustomerHistory.test.ts convex/calendarEvents.test.ts src/components/booking/bookingCustomerPresentation.test.tsx src/components/booking/CreateBookingDialog.test.ts src/components/inbox/CreateCustomerBookingDialog.test.ts src/components/inbox/ManualBookingScheduleField.test.ts src/components/EditableTimeCombobox.test.ts src/pages/ChatsPageCustomerBookings.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 2: Run targeted lint, production build, diff, and LOC checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/booking/bookingCustomerPresentation.tsx src/components/booking/BookingCustomerSummary.tsx src/components/booking/BookingCustomerCombobox.tsx src/components/booking/CreateBookingDialog.tsx src/components/booking/useCreateBookingController.ts src/components/booking/bookingDialogTypes.ts src/components/calendar/CalendarCreateBookingDialog.tsx src/components/inbox/ManualBookingScheduleField.tsx convex/appointmentBooking/manualBookingFields.ts convex/appointmentBooking/manualBookingCore.ts convex/appointmentBooking/manualBooking.ts convex/appointmentBooking/calendarManualBooking.ts
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
git diff --check
wc -l src/components/booking/bookingCustomerPresentation.tsx src/components/booking/BookingCustomerSummary.tsx src/components/booking/BookingCustomerCombobox.tsx src/components/booking/CreateBookingDialog.tsx src/components/booking/useCreateBookingController.ts src/components/booking/bookingDialogTypes.ts src/components/calendar/CalendarCreateBookingDialog.tsx convex/appointmentBooking/manualBookingFields.ts convex/appointmentBooking/manualBookingCore.ts convex/appointmentBooking/manualBooking.ts convex/appointmentBooking/calendarManualBooking.ts
```

Expected: lint and build succeed, diff check prints nothing, and every listed code module is below 300 lines.

- [ ] **Step 3: Update continuity and commit verification**

Record the completed behavior and fresh verification receipt in `CONTINUITY.md`, keep all section caps, then run:

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-07-14-manual-booking-customer-display.md
git commit -m "Document simplified manual booking"
```
