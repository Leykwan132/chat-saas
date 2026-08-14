# Service Editor Navigation Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add clear icons and the approved labels to every service-editor navigation option.

**Architecture:** `SERVICE_SECTION_COPY` remains the source of truth for section labels and headings. `ServiceForm` adds an icon constructor to each section descriptor, rendering it before the existing label without changing section state or field rendering.

**Tech Stack:** React, TypeScript, Lucide React, Tailwind CSS, Vitest.

## Global Constraints

- Use Node.js v22: `source ~/.nvm/nvm.sh && nvm use 22`.
- Preserve the navigation order: Booking assignment, Service details, Appointment duration, Booking form.
- Use 16px Lucide icons: `UsersRound`, `BriefcaseBusiness`, `CalendarClock`, and `ClipboardList` in that same order.
- Keep current selected/muted navigation color behavior, focused-section state, field inputs, permissions, and save behavior unchanged.
- Do not stage or modify unrelated mixed-worktree changes.
- Do not add a release changelog entry until deployment is confirmed.

---

### Task 1: Add approved service navigation icons and labels

**Files:**
- Modify: `src/components/ServiceForm.tsx:1-98`
- Modify: `src/components/services/serviceFormShared.tsx:46-61`
- Modify: `src/components/ServiceForm.test.tsx:6-26`

**Interfaces:**
- Consumes: `SERVICE_SECTION_COPY` and Lucide icon components.
- Produces: `SERVICE_FORM_SECTIONS` entries with an `Icon` constructor and navigation buttons that render `Icon` before `section.copy.title`.

- [ ] **Step 1: Write the failing navigation test**

  Replace the old labels in `ServiceForm.test.tsx`, then assert the approved labels and each Lucide class are rendered:

  ```ts
  expect(markup.indexOf('Booking assignment')).toBeLessThan(markup.indexOf('Service details'));
  expect(markup.indexOf('Service details')).toBeLessThan(markup.indexOf('Appointment duration'));
  expect(markup.indexOf('Appointment duration')).toBeLessThan(markup.indexOf('Booking form'));
  expect(markup).toContain('lucide-users-round size-4');
  expect(markup).toContain('lucide-briefcase-business size-4');
  expect(markup).toContain('lucide-calendar-clock size-4');
  expect(markup).toContain('lucide-clipboard-list size-4');
  ```

- [ ] **Step 2: Run the focused test to verify it fails**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ServiceForm.test.tsx
  ```

  Expected: FAIL because the current labels and icon output do not match the approved navigation.

- [ ] **Step 3: Implement the copy and icon descriptors**

  Update `SERVICE_SECTION_COPY`:

  ```ts
  details: { title: 'Service details', subtitle: 'Name the appointment type the AI should offer in chat.' },
  timing: { title: 'Appointment duration', subtitle: 'Set how long appointments last and which times the AI should offer first.' },
  data: { title: 'Booking form', subtitle: 'Choose what your AI agent gathers in chat before preparing the booking.' },
  ```

  Import and assign `UsersRound`, `BriefcaseBusiness`, `CalendarClock`, and `ClipboardList` to the corresponding `SERVICE_FORM_SECTIONS` entries. Render each with `className="size-4 shrink-0"` inside the existing navigation button, wrapped with the label in an `inline-flex items-center gap-2` element.

- [ ] **Step 4: Run the focused test to verify it passes**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ServiceForm.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 5: Commit the isolated icon and copy change**

  ```bash
  git add src/components/ServiceForm.tsx src/components/ServiceForm.test.tsx src/components/services/serviceFormShared.tsx
  git commit -m "feat: add service editor navigation icons"
  ```

### Task 2: Verify the navigation update

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: The completed navigation icon and copy implementation.
- Produces: Recorded verification evidence for the local, unreleased change.

- [ ] **Step 1: Run focused and static verification**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ServiceForm.test.tsx && bunx tsc --noEmit && git diff --check
  ```

  Expected: all commands exit 0.

- [ ] **Step 2: Update the continuity ledger**

  Record the approved label and icon mapping, plus the verification result, while keeping the ledger bounded. Do not add a release changelog entry because deployment is unconfirmed.

- [ ] **Step 3: Commit the verification receipt**

  ```bash
  git add CONTINUITY.md
  git commit -m "docs: record service navigation icon verification"
  ```

## Self-Review

- Spec coverage: Task 1 maps every approved label and icon to the existing four navigation entries without altering editor behavior. Task 2 verifies and records the change.
- Placeholder scan: no placeholders or deferred steps remain.
- Type consistency: every `SERVICE_FORM_SECTIONS` entry receives an `Icon` component that accepts `className`, matching the Lucide React component interface.
