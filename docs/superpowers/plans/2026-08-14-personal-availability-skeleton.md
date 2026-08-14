# Personal Availability Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the personal Availability loading state match the simplified completed page without changing organizational loading views.

**Architecture:** The existing detail-page loading branch already knows the active workspace when its team query has resolved. Pass that workspace-derived context into the page skeleton, which selects a focused personal layout or preserves the current teammate layout. Keep data loading, redirects, and the extracted availability editor unchanged.

**Tech Stack:** React 19, React Router, Convex React hooks, Vitest, Tailwind CSS.

## Global Constraints

- Use Node v22 for every test and verification command.
- Do not change availability authorization, fetching, navigation, or workspace-switch behavior.
- Personal Availability loading must show `Availability` and `Set when you’re available to receive leads and bookings.` without role, status, name, email, or back-navigation placeholders.
- Organizational availability loading retains the existing teammate-detail skeleton.
- Keep code self-explanatory and under 300 lines per source file.

---

### Task 1: Context-aware Availability detail skeleton

**Files:**
- Modify: `src/pages/ScheduleUserDetailPage.tsx:55-65,235-256`
- Test: `src/pages/ScheduleUserDetailPage.test.tsx`

**Interfaces:**
- Consumes: `activeTeam?.type` from `useActiveTeam()` and the existing `canManage` permission boolean.
- Produces: `ScheduleUserDetailSkeleton({ isPersonalAvailabilityView, showStatusSection })`, rendering the matching loading layout.

- [ ] **Step 1: Write the failing personal-loading route test**

Add this test below the existing personal finished-state test. Its first query is `undefined` so the detail page remains in its loading branch while the active-team mock identifies a personal workspace.

```tsx
test('matches the personal Availability layout while details load', () => {
  mocks.useQuery
    .mockReturnValueOnce(undefined)
    .mockReturnValueOnce({ workosUserId: 'user-ley' });

  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/dashboard/agent-1/availability/user-ley']}>
      <Routes>
        <Route
          path="/dashboard/:agentId/availability/:workosUserId"
          element={<ScheduleUserDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );

  expect(markup).toContain('Availability</h1>');
  expect(markup).toContain('Set when you’re available to receive leads and bookings.');
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ScheduleUserDetailPage.test.tsx
```

Expected: FAIL because the generic loading skeleton contains neither the personal Availability heading nor its description.

- [ ] **Step 3: Add the minimal context-aware skeleton layout**

At the existing `isLoading` return, derive personal context from the already-loaded team value and pass it to `ScheduleUserDetailSkeleton`:

```tsx
return (
  <ScheduleUserDetailSkeleton
    isPersonalAvailabilityView={activeTeam?.type === 'personal'}
    showStatusSection={canManage}
  />
);
```

Change the skeleton props and choose the personal loading layout first:

```tsx
function ScheduleUserDetailSkeleton({
  isPersonalAvailabilityView,
  showStatusSection,
}: {
  isPersonalAvailabilityView: boolean;
  showStatusSection: boolean;
}) {
  if (isPersonalAvailabilityView) {
    return (
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <div className="space-y-1.5">
          <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">
            Availability
          </h1>
          <p className="text-sm text-muted-foreground">
            Set when you’re available to receive leads and bookings.
          </p>
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
      {showStatusSection ? <Skeleton className="h-20 w-full rounded-xl" /> : null}
    </div>
  );
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ScheduleUserDetailPage.test.tsx src/pages/ScheduleUserAvailabilityPage.test.tsx
```

Expected: both route suites pass, including the new personal-loading assertion and the existing organization edit-route coverage.

- [ ] **Step 5: Verify type safety and whitespace**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit && git diff --check
```

Expected: TypeScript exits 0 and `git diff --check` has no output.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/pages/ScheduleUserDetailPage.tsx src/pages/ScheduleUserDetailPage.test.tsx CONTINUITY.md docs/superpowers/plans/2026-08-14-personal-availability-skeleton.md
git commit -m "Align availability loading skeleton"
```
