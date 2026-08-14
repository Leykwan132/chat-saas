# Personal Availability Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify personal Availability by removing profile metadata, adding purpose copy, and moving the time-off action into its section.

**Architecture:** `ScheduleUserDetailPage` already identifies direct Availability views; it will add a personal-workspace branch around the profile header and title block. `ScheduleTimeOffSection` will own its request state and render its action beside the section heading, eliminating cross-component action state.

**Tech Stack:** React 19, TypeScript, React Router, Convex React, Vitest, Tailwind CSS.

## Global Constraints

- Run every project command with `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- Personal Availability shows `Set when you’re available to receive leads and bookings.` beneath its title.
- Personal Availability omits role, availability status, name, email, and the top-level time-off action.
- Organizational member and owner views retain their profile header behavior.
- The Time off action is aligned beside the Time off heading in all rendered views.
- Do not add comments or default fallbacks to production code.
- Keep every modified or created code file at 300 lines or fewer.

---

### Task 1: Simplify personal Availability and localize its time-off action

**Files:**
- Modify: `src/pages/ScheduleUserDetailPage.tsx:1-253`
- Modify: `src/components/schedule/ScheduleTimeOffSection.tsx:1-251`
- Modify: `src/components/schedule/ScheduleUserDetailHeader.tsx:1-66`
- Modify: `src/pages/ScheduleUserDetailPage.test.tsx:1-67`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `activeTeam.type`, `isDirectAvailabilityView`, and the existing schedule time-off mutation handlers.
- Produces: `ScheduleTimeOffSection` with internally owned request-open state and a personal-only content branch in `ScheduleUserDetailPage`.

- [x] **Step 1: Extend the failing personal route regression test**

In `src/pages/ScheduleUserDetailPage.test.tsx`, assert the rendered personal page contains the exact description and Time off action, and does not contain profile values:

```ts
expect(markup).toContain('Set when you’re available to receive leads and bookings.');
expect(markup).toContain('Request time off');
expect(markup).not.toContain('Ley Kwan Choo (You)');
expect(markup).not.toContain('ley@example.com');
expect(markup).not.toContain('>Owner</span>');
expect(markup).not.toContain('>Active</span>');
```

- [x] **Step 2: Run the focused test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ScheduleUserDetailPage.test.tsx`

Expected: FAIL because the personal page currently renders its profile header, has no description, and keeps the request action in that header.

- [x] **Step 3: Localize time-off action state and button**

In `ScheduleTimeOffSection`, replace the `requestOpen` and `onRequestOpenChange` props with a local `isRequestOpen` state. Place this heading row above the time-off content:

```tsx
<div className="flex flex-wrap items-center justify-between gap-3">
  <h2 className="text-lg font-semibold text-foreground">Time off</h2>
  <Button type="button" variant="outline" onClick={() => setIsRequestOpen(true)}>
    <CalendarOff className="size-4" />
    Request time off
  </Button>
</div>
```

Use `isRequestOpen` for the existing sheet and have `closeTimeOffSheet` set it to false. Remove the action prop and button from `ScheduleUserDetailHeader`.

- [x] **Step 4: Render the personal-only Availability title block**

In `ScheduleUserDetailPage`, define:

```ts
const isPersonalAvailabilityView = activeTeam?.type === 'personal';
```

For this branch, render:

```tsx
<div className="space-y-1.5">
  <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">
    Availability
  </h1>
  <p className="text-sm text-muted-foreground">
    Set when you’re available to receive leads and bookings.
  </p>
</div>
```

Do not render `ScheduleUserDetailHeader` when `isPersonalAvailabilityView` is true. Keep the existing direct member title and profile header unchanged.

- [x] **Step 5: Run the focused test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ScheduleUserDetailPage.test.tsx`

Expected: PASS; the personal view contains only its purpose-led Availability block, inline hours, and section-owned time-off action.

- [x] **Step 6: Run final verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WeeklyAvailabilityEditor.test.ts src/pages/ScheduleUserAvailabilityPage.test.tsx src/pages/ScheduleUserDetailPage.test.tsx src/pages/SchedulePage.test.tsx && bunx tsc --noEmit && git diff --check`

Expected: all focused suites, TypeScript, and whitespace-diff checks exit 0.

- [x] **Step 7: Update continuity and commit**

```bash
git add src/components/schedule/ScheduleTimeOffSection.tsx src/components/schedule/ScheduleUserDetailHeader.tsx src/pages/ScheduleUserDetailPage.tsx src/pages/ScheduleUserDetailPage.test.tsx CONTINUITY.md docs/superpowers/plans/2026-08-14-personal-availability-header.md
git commit -m "Simplify personal availability"
```
