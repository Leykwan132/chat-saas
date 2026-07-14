# Manual Booking Flexible Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace separate fixed-time manual booking fields with one clock-led date/start/end row whose combobox times are freely editable and whose exact custom interval is conflict-checked.

**Architecture:** Pure schedule helpers derive the service-duration default and validate the chosen interval. Two focused UI components own editable time entry and schedule composition, while Convex adds an exact-interval assignee resolver shared by preview and final creation.

**Tech Stack:** TypeScript, React, Convex, Vitest, shadcn/ui, Radix Popover, Lucide

## Global Constraints

- Run every script and test under Node v22.
- Keep every code file below 300 lines.
- Add no code comments.
- Keep Date, Start, and End on one row with a Lucide clock icon.
- Standard time options remain half-hour choices, but valid custom typed times must be accepted.
- Service duration supplies only the default End; the user can customize End.
- Preview and final creation must validate the exact custom interval with no override.

---

### Task 1: Flexible Schedule Model

**Files:**
- Modify: `src/components/inbox/manualBookingScheduleModel.test.ts`
- Modify: `src/components/inbox/manualBookingScheduleModel.ts`

**Interfaces:**
- Produces: `defaultManualBookingEndTime(startTime, durationMinutes): string`
- Produces: `getManualBookingSelection(serviceId, date, startTime, endTime, timeZone)` returning `incomplete | invalid | ready`
- Ready result contains `{ kind, key, startAt, endAt }`

- [ ] **Step 1: Write failing model tests**

Cover `11:41am + 60 minutes = 12:41 PM`, a custom `2:07 PM–3:22 PM` interval, incomplete values, invalid text, and End not later than Start.

- [ ] **Step 2: Verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/manualBookingScheduleModel.test.ts
```

Expected: FAIL because the model has no End value or schedule-state union.

- [ ] **Step 3: Implement the model**

Use `parseCalendarTimeLabel`, `minutesToCalendarTimeLabel`, and `combineDateTimeInTimeZone`. Return explicit messages for invalid time text, End not after Start, and intervals over 24 hours. Include both times in the stable selection key.

- [ ] **Step 4: Verify GREEN**

Run the same focused test and require all assertions to pass.

---

### Task 2: Editable Time and Schedule Components

**Files:**
- Create: `src/components/EditableTimeCombobox.tsx`
- Create: `src/components/EditableTimeCombobox.test.ts`
- Create: `src/components/inbox/ManualBookingScheduleField.tsx`
- Create: `src/components/inbox/ManualBookingScheduleField.test.ts`

**Interfaces:**
- `EditableTimeCombobox({ value, onChange, ariaLabel, invalid? })`
- `ManualBookingScheduleField({ date, startTime, endTime, scheduleState, availability, onDateChange, onStartTimeChange, onEndTimeChange })`

- [ ] **Step 1: Write failing component contract tests**

Require the editable combobox to use `PopoverAnchor`, `Input`, `role="combobox"`, standard `CALENDAR_TIME_OPTIONS`, and `parseCalendarTimeLabel` normalization. Require the schedule field to render `Clock`, the label `Schedule`, one no-wrap grid row, the date picker with `showLabel={false}`, both editable time comboboxes, and the dash separator.

- [ ] **Step 2: Verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/EditableTimeCombobox.test.ts src/components/inbox/ManualBookingScheduleField.test.ts
```

Expected: FAIL because both component modules are absent.

- [ ] **Step 3: Implement `EditableTimeCombobox`**

Anchor a controlled Popover to an Input. Open on focus/click, show every standard option, accept arbitrary typing, normalize valid input on Enter or blur, preserve invalid text for validation, and expose combobox ARIA state.

- [ ] **Step 4: Implement `ManualBookingScheduleField`**

Compose a compact same-row grid with Clock, unlabeled CalendarDatePickerField, Start, dash, and End. Render invalid, checking, available, or conflict feedback directly below it using the existing semantic Check/X treatments.

- [ ] **Step 5: Verify GREEN**

Run both component contract tests and require all assertions to pass.

---

### Task 3: Exact Custom Interval Availability

**Files:**
- Modify: `convex/appointmentBooking/availability.ts`
- Modify: `convex/appointmentBooking/manualBooking.ts`
- Modify: `convex/manualBookingAvailability.test.ts`
- Regenerate: `convex/_generated/api.d.ts`

**Interfaces:**
- Produces: `resolveAvailableInterval(ctx, { service, conversation, teamId, startAt, endAt })`
- Changes: `checkAvailability` and `create` accept `endAt`

- [ ] **Step 1: Extend the Convex regression test**

Use a non-half-hour interval such as `09:11–10:26`. Assert preview succeeds, an overlapping event makes it unavailable, final Create rejects it, and an invalid reversed interval rejects before availability resolution.

- [ ] **Step 2: Verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/manualBookingAvailability.test.ts
```

Expected: FAIL because End is not accepted and the current resolver rounds Start to half-hour boundaries.

- [ ] **Step 3: Implement exact-interval resolution**

In `availability.ts`, load the roster once, apply the service buffer to the requested boundaries, call the existing assignment chooser, and return a `BookingSlot` containing the exact requested Start and End. In `manualBooking.ts`, validate positive duration up to 24 hours and share this resolver between preview and Create.

- [ ] **Step 4: Regenerate and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/manualBookingAvailability.test.ts
```

Expected: codegen and all custom-interval assertions pass.

---

### Task 4: Dialog Integration

**Files:**
- Modify: `src/components/inbox/CreateCustomerBookingDialog.tsx`
- Modify: `src/components/inbox/CreateCustomerBookingDialog.test.ts`

**Interfaces:**
- Consumes: flexible schedule model and `ManualBookingScheduleField`
- Sends: `{ startAt, endAt }` to preview and Create

- [ ] **Step 1: Extend the dialog regression test**

Require Start and End state, `endTimeCustomized`, service-duration default derivation, `ManualBookingScheduleField`, and `endAt` in both mutations. Assert direct CalendarDatePickerField, TimeSelectInput, and inline status markup are absent from the dialog.

- [ ] **Step 2: Verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/CreateCustomerBookingDialog.test.ts
```

Expected: FAIL because the dialog still owns one fixed-duration Booking Time field.

- [ ] **Step 3: Integrate flexible state**

Track Start, End, and whether End was customized. Derive End from service duration until customization, reset that state when Service changes, check on every complete valid Service/Date/Start/End combination, and submit both timestamps. Keep customer-field behavior unchanged.

- [ ] **Step 4: Verify GREEN**

Run the dialog and schedule-model/component focused tests and require all assertions to pass.

---

### Task 5: Final Verification and Commit

**Files:**
- Modify: `CONTINUITY.md`
- Modify: this plan's checkboxes

- [ ] **Step 1: Run focused verification**

Run all new tests plus existing Calendar date-picker, Chats booking, and manual-booking Convex tests under Node v22.

- [ ] **Step 2: Run quality checks**

Run targeted ESLint, production build, `git diff --check`, and line counts for every touched code file. Every code file must remain below 300 lines.

- [ ] **Step 3: Update continuity and commit**

Record the approved flexible schedule decision and verification receipt, then commit all implementation files directly to `main` with message `Add flexible manual booking schedule`.
