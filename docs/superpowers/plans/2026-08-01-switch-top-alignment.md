# Switch Top Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the booking-availability and service-card switch groups with the top content line of their cards.

**Architecture:** Keep existing card markup and interactions unchanged. Update only each control wrapper flex alignment and lock the utility classes with source contracts.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, ESLint

## Global Constraints

- Use Node v22 for every test and lint command.
- Preserve switch size, labels, state, permissions, keyboard behavior, card navigation isolation, and all other spacing.
- Keep each edited code file within the 300-line project limit.

### Task 1: Top-align availability and service switch controls

**Files:**

- Modify: `src/components/workflow/WorkflowBookingAvailabilitySection.test.tsx`
- Modify: `src/components/workflow/WorkflowBookingAvailabilitySection.tsx:116`
- Modify: `src/pages/ServicesPage.test.tsx`
- Modify: `src/pages/ServicesPage.tsx:241`

**Interfaces:**

- Consumes: Existing rendered cards and their interactive `Switch` controls.
- Produces: Top-aligned control wrappers using `items-start`, with existing behavior unchanged.

- [ ] **Step 1: Write the failing source contracts**

Add `expect(source).toContain('relative z-10 flex shrink-0 items-start gap-2');` to the workflow source test. Add `expect(source).toContain('relative z-10 flex shrink-0 items-start gap-1.5');` to the Services source test.

- [ ] **Step 2: Run the focused tests to verify the contracts fail**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowBookingAvailabilitySection.test.tsx src/pages/ServicesPage.test.tsx`.

Expected: FAIL because both current control wrappers contain `items-center`.

- [ ] **Step 3: Apply the minimal alignment change**

Change the workflow wrapper to `className="relative z-10 flex shrink-0 items-start gap-2"` and the Services wrapper to `className="relative z-10 flex shrink-0 items-start gap-1.5"`.

- [ ] **Step 4: Verify the focused behavior and linting**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowBookingAvailabilitySection.test.tsx src/pages/ServicesPage.test.tsx && bunx eslint src/components/workflow/WorkflowBookingAvailabilitySection.tsx src/pages/ServicesPage.tsx`.

Expected: both test files pass and ESLint reports no findings.

- [ ] **Step 5: Inspect and commit the implementation**

Run `git diff --check` and `git status --short`, then stage only the four implementation and test files and commit with `Align service switches to card tops`. Do not stage unrelated generated files.
