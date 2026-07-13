# Booking Reference Display-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Booking reference from calendar event-detail edit mode while preserving it in view mode.

**Architecture:** Keep the existing view renderer unchanged and remove only the disabled edit-row presentation. Protect the display/edit boundary with a focused source regression.

**Tech Stack:** React, TypeScript, Vitest

## Global Constraints

- Node.js 22 is required for scripts and tests.
- Code files must remain under 300 lines.
- Do not change the calendar schema, API, or booking reference value.
- Booking reference remains visible in view mode and absent in edit mode.

---

### Task 1: Enforce the Display/Edit Boundary

**Files:**
- Create: `src/components/calendar/CalendarBookingReferenceVisibility.test.ts`
- Modify: `src/components/calendar/CalendarEventDetailsEditBody.tsx`
- Verify unchanged: `src/components/calendar/CalendarEventDetailsBody.tsx`

**Interfaces:**
- Consumes: the existing `CalendarEventDetailsBody` display row and `CalendarEventDetailsEditBody` edit form.
- Produces: an edit form with no Booking reference UI while view mode continues rendering the reference.

- [ ] **Step 1: Write the failing regression**

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const viewSource = readFileSync(new URL('./CalendarEventDetailsBody.tsx', import.meta.url), 'utf8');
const editSource = readFileSync(new URL('./CalendarEventDetailsEditBody.tsx', import.meta.url), 'utf8');

test('booking reference is visible only in event detail view mode', () => {
  expect(viewSource).toContain("label: 'Booking reference'");
  expect(editSource).not.toContain('Booking reference');
  expect(editSource).not.toContain('Saved after booking');
});
```

- [ ] **Step 2: Run the regression and confirm RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarBookingReferenceVisibility.test.ts`

Expected: FAIL because `CalendarEventDetailsEditBody.tsx` still contains Booking reference and Saved after booking.

- [ ] **Step 3: Remove the edit-only reference row**

Delete this block from `CalendarEventDetailsEditBody.tsx`:

```tsx
<EditRow label="Booking reference" icon={Hash}>
  <Input value="Saved after booking" disabled />
</EditRow>
```

Remove `Hash` from the Lucide import because it becomes unused. Do not alter `CalendarEventDetailsBody.tsx`.

- [ ] **Step 4: Verify GREEN and surrounding behavior**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarBookingReferenceVisibility.test.ts src/components/calendar/CalendarEventDetailsDatePicker.test.ts`

Expected: 2 test files pass.

- [ ] **Step 5: Verify quality gates**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/calendar/CalendarEventDetailsEditBody.tsx src/components/calendar/CalendarBookingReferenceVisibility.test.ts && bunx tsc -b --pretty false && git diff --check`

Expected: exit code 0 with no lint, type, or whitespace errors.
