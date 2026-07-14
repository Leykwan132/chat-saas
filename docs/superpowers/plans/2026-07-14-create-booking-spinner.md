# Create Booking Spinner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a spinner beside the unchanged Create booking label while the shared Calendar and Inbox booking request is active.

**Architecture:** Keep `useCreateBookingController` as the single owner of request state. Conditionally compose the existing shared `Spinner` inside `CreateBookingDialog`, so both booking entry points inherit the behavior without separate implementations.

**Tech Stack:** React 19, TypeScript, shadcn Button and Spinner, Vitest, ESLint

## Global Constraints

- The button label must remain exactly `Create booking`.
- Render no dialog-level loading overlay and no `Creating...` copy.
- Preserve the existing `controller.busy || !controller.selectionAvailable` disabled rule.
- Run every script under Node 22.
- Keep code files below 300 lines and add no comments.

---

### Task 1: Shared Create Booking Spinner

**Files:**
- Modify: `src/components/booking/CreateBookingDialog.test.ts`
- Modify: `src/components/booking/CreateBookingDialog.tsx`

**Interfaces:**
- Consumes: `controller.busy: boolean` from `useCreateBookingController` and `Spinner(props: React.ComponentProps<"svg">)` from `@/components/ui/spinner`.
- Produces: A shared submit button that conditionally renders `Spinner` before the unchanged label.

- [x] **Step 1: Write the failing source contract**

Add this focused test to `src/components/booking/CreateBookingDialog.test.ts`:

```ts
test('shows a spinner without changing the label while creating a booking', () => {
  expect(dialogSource).toContain("import { Spinner } from '@/components/ui/spinner';");
  expect(dialogSource).toContain('{controller.busy && <Spinner data-icon="inline-start" />}');
  expect(dialogSource).toContain('Create booking');
  expect(dialogSource).not.toContain('Creating...');
});
```

- [x] **Step 2: Run the focused test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/booking/CreateBookingDialog.test.ts
```

Expected: FAIL because the dialog does not import or render `Spinner`.

- [x] **Step 3: Render the spinner from the shared busy state**

Add the Spinner import in `src/components/booking/CreateBookingDialog.tsx`:

```ts
import { Spinner } from '@/components/ui/spinner';
```

Change only the submit button content:

```tsx
<Button
  type="button"
  disabled={controller.busy || !controller.selectionAvailable}
  onClick={() => void handleCreate()}
>
  {controller.busy && <Spinner data-icon="inline-start" />}
  Create booking
</Button>
```

- [x] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/booking/CreateBookingDialog.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/booking/CreateBookingDialog.tsx src/components/booking/CreateBookingDialog.test.ts
wc -l src/components/booking/CreateBookingDialog.tsx src/components/booking/CreateBookingDialog.test.ts
```

Expected: the focused test and lint pass, and both code files remain below 300 lines.

- [x] **Step 5: Commit the focused change**

```bash
git add src/components/booking/CreateBookingDialog.tsx src/components/booking/CreateBookingDialog.test.ts docs/superpowers/specs/2026-07-14-create-booking-spinner-design.md docs/superpowers/plans/2026-07-14-create-booking-spinner.md
git commit -m "Show spinner while creating bookings"
```
