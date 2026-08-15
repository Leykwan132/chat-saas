# Service Editor Booking Team Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the booking-team configuration after appointment duration and use clearer user-facing naming.

**Architecture:** The existing `SERVICE_SECTION_COPY` continues to own section headings. `SERVICE_FORM_SECTIONS` changes only its ordered descriptors, leaving the icon-to-section mapping and focused-section behavior intact.

**Tech Stack:** React, TypeScript, Lucide React, Vitest.

## Global Constraints

- Use Node.js v22: `source ~/.nvm/nvm.sh && nvm use 22`.
- Navigation order is Service details, Appointment duration, Booking team, Booking form.
- `UsersRound` remains the Booking team icon.
- Do not change fields, form state, permissions, assignment behavior, or save behavior.
- Do not stage or modify unrelated mixed-worktree changes.
- Do not add a release changelog entry until deployment is confirmed.

---

### Task 1: Reorder and rename the booking team section

**Files:**
- Modify: `src/components/ServiceForm.tsx:17-22`
- Modify: `src/components/services/serviceFormShared.tsx:58-61`
- Modify: `src/components/ServiceForm.test.tsx:6-29`

**Interfaces:**
- Consumes: `SERVICE_SECTION_COPY.assignment` and the existing `UsersRound` icon.
- Produces: `SERVICE_FORM_SECTIONS` with the exact descriptor order `details`, `timing`, `assignment`, `data`; assignment uses the display title `Booking team`.

- [ ] **Step 1: Write the failing navigation-order test**

  Update the focused static-render assertions:

  ```ts
  expect(markup.indexOf('Service details')).toBeLessThan(markup.indexOf('Appointment duration'));
  expect(markup.indexOf('Appointment duration')).toBeLessThan(markup.indexOf('Booking team'));
  expect(markup.indexOf('Booking team')).toBeLessThan(markup.indexOf('Booking form'));
  ```

- [ ] **Step 2: Run the focused test to verify it fails**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ServiceForm.test.tsx
  ```

  Expected: FAIL because Booking assignment remains first and uses the old label.

- [ ] **Step 3: Implement the approved copy and order**

  Update the assignment copy and reorder the section descriptors:

  ```ts
  assignment: {
    title: 'Booking team',
    subtitle: 'Choose who can perform this service and how bookings are assigned.',
  },
  ```

  ```ts
  const SERVICE_FORM_SECTIONS = [
    { id: 'details', copy: SERVICE_SECTION_COPY.details, Icon: BriefcaseBusiness },
    { id: 'timing', copy: SERVICE_SECTION_COPY.timing, Icon: CalendarClock },
    { id: 'assignment', copy: SERVICE_SECTION_COPY.assignment, Icon: UsersRound },
    { id: 'data', copy: SERVICE_SECTION_COPY.data, Icon: ClipboardList },
  ] as const;
  ```

  Keep `useState<ServiceFormSection>('assignment')` so the section remains the initial focused editor pane without changing its data behavior.

- [ ] **Step 4: Run the focused test to verify it passes**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ServiceForm.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 5: Commit the isolated UI change**

  ```bash
  git add src/components/ServiceForm.tsx src/components/ServiceForm.test.tsx src/components/services/serviceFormShared.tsx
  git commit -m "feat: clarify service booking team navigation"
  ```

### Task 2: Verify and record the update

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: The completed order and copy update.
- Produces: A receipt for focused test, TypeScript, and whitespace verification.

- [ ] **Step 1: Run the verification commands**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ServiceForm.test.tsx && bunx tsc --noEmit && git diff --check
  ```

  Expected: all commands exit 0.

- [ ] **Step 2: Update the ledger**

  Record the Booking team label, final order, and the verification outcome; do not add a release changelog because deployment is unconfirmed.

- [ ] **Step 3: Commit the verification receipt**

  ```bash
  git add CONTINUITY.md
  git commit -m "docs: record booking team navigation verification"
  ```

## Self-Review

- Spec coverage: Task 1 changes the only approved label and ordering choices, retaining the icon and behavior. Task 2 verifies and records the result.
- Placeholder scan: no placeholders or deferred steps remain.
- Type consistency: the section ID remains `assignment`; only its display copy and descriptor location change.
