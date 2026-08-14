# Admin Availability Description Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the Availability purpose description on direct organizational-admin Availability pages.

**Architecture:** `ScheduleUserDetailPage` already distinguishes personal, direct, and roster-detail views. Extend the direct header branch to use the same title-and-description wrapper as the personal view, leaving the roster-detail header and route behavior untouched. A focused static-render test will cover the organizational-admin branch.

**Tech Stack:** React, TypeScript, React Router, Vitest, React DOM server rendering.

## Global Constraints

- Run scripts under Node v22 using `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- Keep source files under 300 lines and do not add code comments.
- Preserve the existing personal title, description, inline editor, identity header, and no-back-link behavior.

---

### Task 1: Render and verify the direct organizational description

**Files:**
- Modify: `src/pages/ScheduleUserDetailPage.tsx:129-145`
- Modify: `src/pages/ScheduleUserDetailPage.test.tsx:1-83`

**Interfaces:**
- Consumes: `isPersonalAvailabilityView` and `isDirectAvailabilityView` booleans calculated by `ScheduleUserDetailPage`.
- Produces: the direct organizational Availability header with the exact copy `Set when you’re available to receive leads and bookings.`

- [x] **Step 1: Write the failing test**

Add a test that mocks an organizational active team and an admin role, renders `/dashboard/agent-1/availability/user-ley`, and asserts the completed direct page includes both the `Availability` title and the exact purpose description:

```tsx
expect(markup).toContain('Availability</h1>');
expect(markup).toContain('Set when you’re available to receive leads and bookings.');
```

- [x] **Step 2: Run the focused test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/pages/ScheduleUserDetailPage.test.tsx
```

Expected: the new organizational-admin assertion fails because the direct header currently contains only the title.

- [x] **Step 3: Write the minimal implementation**

Replace the separate personal and direct title branches with one title-and-description wrapper whenever `isPersonalAvailabilityView || isDirectAvailabilityView` is true:

```tsx
{isPersonalAvailabilityView || isDirectAvailabilityView ? (
  <div className="space-y-1.5">
    <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">
      Availability
    </h1>
    <p className="text-sm text-muted-foreground">
      Set when you’re available to receive leads and bookings.
    </p>
  </div>
) : (
  <Link
    to={rosterPath}
    className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
  >
    <ArrowLeft className="size-4" />
    Back
  </Link>
)}
```

Keep the roster-detail branch unchanged.

- [x] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/pages/ScheduleUserDetailPage.test.tsx && bunx tsc --noEmit && git diff --check
```

Expected: the direct organizational test and existing personal tests pass; TypeScript and whitespace checks pass.

- [x] **Step 5: Commit**

```bash
git add src/pages/ScheduleUserDetailPage.tsx src/pages/ScheduleUserDetailPage.test.tsx CONTINUITY.md docs/superpowers/plans/2026-08-14-admin-availability-description.md
git commit -m "Describe direct availability"
```
