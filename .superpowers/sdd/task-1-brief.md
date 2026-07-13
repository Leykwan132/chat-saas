### Task 1: Shared booking status contract and presentation

**Files:**
- Create: `src/lib/appointmentBookingStatusPresentation.ts`
- Create: `src/lib/appointmentBookingStatusPresentation.test.ts`
- Modify: `src/lib/appointmentBookingSessionStatus.ts`
- Modify: `convex/appointmentBookingSessionStatus.ts`
- Modify: `convex/schema.ts`
- Modify: `src/components/inbox/customerBookingsModel.ts`

**Interfaces:**
- Produces: `AppointmentBookingDisplayStatus = 'booked' | 'completed' | 'cancelled' | 'no_show'`.
- Produces: `APPOINTMENT_BOOKING_STATUS_OPTIONS`, `appointmentBookingStatusLabel(status)`, and `appointmentBookingStatusClass(status)`.
- Produces: `AppointmentBookingSessionStatus.NoShow` and validator/schema support for `no_show`.

- [ ] **Step 1: Write the failing presentation test**

```ts
import { describe, expect, test } from 'vitest';
import {
  APPOINTMENT_BOOKING_STATUS_OPTIONS,
  appointmentBookingStatusClass,
  appointmentBookingStatusLabel,
} from './appointmentBookingStatusPresentation';

describe('appointment booking status presentation', () => {
  test('exposes the four approved lifecycle statuses', () => {
    expect(APPOINTMENT_BOOKING_STATUS_OPTIONS.map(({ value }) => value)).toEqual([
      'booked',
      'completed',
      'cancelled',
      'no_show',
    ]);
    expect(appointmentBookingStatusLabel('no_show')).toBe('No-show');
  });

  test('uses dark green for completed', () => {
    expect(appointmentBookingStatusClass('completed')).toContain('bg-green-800');
    expect(appointmentBookingStatusClass('completed')).toContain('text-white');
    expect(appointmentBookingStatusClass('completed')).not.toContain('zinc');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/appointmentBookingStatusPresentation.test.ts`

Expected: FAIL because `appointmentBookingStatusPresentation.ts` does not exist.

- [ ] **Step 3: Implement the shared contract and presentation**

```ts
export const APPOINTMENT_BOOKING_STATUS_OPTIONS = [
  { value: 'booked', label: 'Scheduled', className: 'bg-emerald-700 text-white' },
  { value: 'completed', label: 'Completed', className: 'bg-green-800 text-white' },
  { value: 'cancelled', label: 'Cancelled', className: 'bg-red-700 text-white' },
  { value: 'no_show', label: 'No-show', className: 'bg-amber-700 text-white' },
] as const;

export type AppointmentBookingDisplayStatus =
  (typeof APPOINTMENT_BOOKING_STATUS_OPTIONS)[number]['value'];

const PRESENTATION_BY_STATUS = Object.fromEntries(
  APPOINTMENT_BOOKING_STATUS_OPTIONS.map((option) => [option.value, option]),
) as Record<AppointmentBookingDisplayStatus, (typeof APPOINTMENT_BOOKING_STATUS_OPTIONS)[number]>;

export const appointmentBookingStatusLabel = (status: AppointmentBookingDisplayStatus) =>
  PRESENTATION_BY_STATUS[status].label;

export const appointmentBookingStatusClass = (status: AppointmentBookingDisplayStatus) =>
  PRESENTATION_BY_STATUS[status].className;
```

Add `NoShow: 'no_show'` to both session-status constants, both label/count collections, the Convex validator, and the customer-history status type. Keep internal `collecting`, `confirming`, and `editing` values unchanged.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/appointmentBookingStatusPresentation.test.ts src/components/inbox/customerBookingsModel.test.ts`

Expected: PASS.

- [ ] **Step 5: Checkpoint the contract**

Run: `git diff --check -- src/lib/appointmentBookingStatusPresentation.ts src/lib/appointmentBookingStatusPresentation.test.ts src/lib/appointmentBookingSessionStatus.ts convex/appointmentBookingSessionStatus.ts convex/schema.ts src/components/inbox/customerBookingsModel.ts`

Expected: no output. Stage only these paths if the user requests a commit.

---

