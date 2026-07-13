### Task 3: Modularize Edit Booking and add the appointment-only Status Select

**Files:**
- Create: `src/components/calendar/editBookingModel.ts`
- Create: `src/components/calendar/EditBookingForm.tsx`
- Create: `src/components/calendar/EditBookingFormSkeleton.tsx`
- Create: `src/components/calendar/EditBookingStatusField.tsx`
- Create: `src/components/calendar/EditBookingStatusField.test.ts`
- Modify: `src/components/calendar/EditBookingDialog.tsx`

**Interfaces:**
- Consumes: `AppointmentBookingDisplayStatus` and `APPOINTMENT_BOOKING_STATUS_OPTIONS` from Task 1.
- Consumes: `api.appointmentBooking.statusTransition.updateBookingStatus` from Task 2.
- Produces: `EditBookingStatusField({ value, onValueChange, disabled })`.
- Produces: `EventFormState.status?: AppointmentBookingDisplayStatus` initialized only for appointment bookings.

- [ ] **Step 1: Write the failing structural/status-field test**

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const fieldSource = readFileSync(new URL('./EditBookingStatusField.tsx', import.meta.url), 'utf8');
const dialogSource = readFileSync(new URL('./EditBookingDialog.tsx', import.meta.url), 'utf8');

test('appointment booking editor uses the shared four-state Select', () => {
  expect(fieldSource).toContain("from '@/components/ui/select'");
  expect(fieldSource).toContain('APPOINTMENT_BOOKING_STATUS_OPTIONS.map');
  expect(fieldSource).toContain('Status');
  expect(dialogSource).toContain('updateBookingStatus');
});

test('edit dialog remains a modular entrypoint', () => {
  expect(dialogSource.split('\n').length).toBeLessThanOrEqual(300);
});
```

- [ ] **Step 2: Run the UI test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/EditBookingStatusField.test.ts`

Expected: FAIL because the field does not exist and the dialog is 855 lines.

- [ ] **Step 3: Extract existing responsibilities without changing behavior**

Move pure types/parsers/date composition into `editBookingModel.ts`, loading placeholders into `EditBookingFormSkeleton.tsx`, and form markup into `EditBookingForm.tsx`. Keep `EditBookingDialog.tsx` responsible only for queries, mutations, dialog state, save/delete orchestration, and passing props. Verify each new or touched code file is at most 300 lines with `wc -l`.

- [ ] **Step 4: Add the shadcn Select**

```tsx
export function EditBookingStatusField({ value, onValueChange, disabled }: Props) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="dialog-booking-status">Status</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id="dialog-booking-status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {APPOINTMENT_BOOKING_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

Return the appointment session status from `getAppointmentDetails`, initialize it in form state, render the field only when `isEditingAppointmentBooking`, and call `updateBookingStatus` after the calendar edit succeeds only when the value changed. Do not show the field for ordinary events.

- [ ] **Step 5: Run UI tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/EditBookingStatusField.test.ts src/components/calendar/CalendarBookingReferenceVisibility.test.ts src/components/calendar/CalendarEventDetailsDatePicker.test.ts`

Expected: PASS.

- [ ] **Step 6: Verify modular file sizes**

Run: `wc -l src/components/calendar/EditBookingDialog.tsx src/components/calendar/editBookingModel.ts src/components/calendar/EditBookingForm.tsx src/components/calendar/EditBookingFormSkeleton.tsx src/components/calendar/EditBookingStatusField.tsx`

Expected: every number is 300 or lower.

---

