# Unified Booking Time Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the availability editor's editable time combobox in every booking edit surface.

**Architecture:** `EditableTimeCombobox` remains the single shared time control. Create Booking already consumes it through `ManualBookingScheduleField`; the two legacy edit forms will consume it directly while preserving their existing string form state and save validation.

**Tech Stack:** React, TypeScript, shadcn combobox, Vitest.

## Global Constraints

- Use Node v22 for verification.
- Keep Create Booking on its existing `ManualBookingScheduleField` implementation.
- Preserve custom typed time normalization on blur and Enter.
- Preserve existing date, all-day, time-zone, and start-before-end validation.
- Do not modify Convex schemas, mutations, or time serialization.
- Keep code files below 300 lines and do not add comments.

---

### Task 1: Guard shared time-input usage in booking edit forms

**Files:**
- Create: `src/components/calendar/UnifiedBookingTimeInput.test.ts`
- Modify: `src/components/calendar/CalendarEventDetailsEditBody.tsx:1-195`
- Modify: `src/components/calendar/EditBookingForm.tsx:1-75`

**Interfaces:**
- Consumes: `EditableTimeCombobox` with `value`, `onChange`, `ariaLabel`, optional `disabled`, and optional `portalContainer` props.
- Produces: both booking edit forms render start and end `EditableTimeCombobox` controls and contain no `TimeSelectInput` import or JSX.

- [ ] **Step 1: Write the failing test**

```ts
import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  const url = new URL(path, import.meta.url);
  return existsSync(url) ? readFileSync(url, 'utf8') : '';
}

test('uses the availability time combobox in every booking edit form', () => {
  for (const path of ['./CalendarEventDetailsEditBody.tsx', './EditBookingForm.tsx']) {
    const formSource = source(path);
    expect(formSource).toContain("from '@/components/EditableTimeCombobox'");
    expect(formSource.match(/<EditableTimeCombobox/g)?.length).toBe(2);
    expect(formSource).not.toContain('TimeSelectInput');
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/UnifiedBookingTimeInput.test.ts`

Expected: FAIL because both forms import and render `TimeSelectInput`.

- [ ] **Step 3: Replace both legacy form controls**

```tsx
<EditableTimeCombobox
  value={form.startTime}
  onChange={(startTime) => update({ startTime })}
  ariaLabel="Start time"
  disabled={disabled}
/>
<EditableTimeCombobox
  value={form.endTime}
  onChange={(endTime) => update({ endTime })}
  ariaLabel="End time"
  disabled={disabled}
  contentAlign="end"
/>
```

Use the `form` and `onFormChange` equivalents in `CalendarEventDetailsEditBody`. Replace the old imports, retain the existing grid layout, and add a local content-element ref only where a dialog portal container is needed.

- [ ] **Step 4: Run the focused regression suite**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/UnifiedBookingTimeInput.test.ts src/components/EditableTimeCombobox.test.ts src/components/inbox/CreateCustomerBookingDialog.test.ts`

Expected: PASS. Both edit forms use the shared component, and Create Booking retains `ManualBookingScheduleField` with no legacy select.

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/UnifiedBookingTimeInput.test.ts src/components/calendar/CalendarEventDetailsEditBody.tsx src/components/calendar/EditBookingForm.tsx
git commit -m "Unify booking time inputs"
```

### Task 2: Verify production compilation and document the outcome

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: the shared `EditableTimeCombobox` edit-form composition from Task 1.
- Produces: a concise ledger receipt for the customer-facing consistency change and exact verification result.

- [ ] **Step 1: Run production validation**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bun run build && git diff --check`

Expected: the TypeScript/Vite production build exits 0 and `git diff --check` emits no output.

- [ ] **Step 2: Record the verified unreleased change**

```markdown
- 2026-08-16 [CODE] Booking create and edit flows share the availability time combobox, including typed custom times.
```

Add the line to the bounded `Done (recent)` section and add a receipt that names the focused tests and build result. Do not update the public changelog until production availability is confirmed.

- [ ] **Step 3: Commit the verification receipt**

```bash
git add CONTINUITY.md
git commit -m "Document unified booking time inputs"
```

## Self-Review

- Spec coverage: Task 1 preserves Create Booking and replaces both legacy edit forms; Task 2 verifies and records the outcome.
- Placeholder scan: no placeholders or deferred implementation steps remain.
- Type consistency: all uses rely on the existing string-valued `EditableTimeCombobox` interface and existing form update callbacks.
