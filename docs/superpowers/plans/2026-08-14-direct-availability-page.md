# Direct Availability Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show personal-workspace users and organizational members a titled Availability page with inline weekly-hours editing and no dashboard back navigation.

**Architecture:** Extract the existing weekly-hours draft and save behavior into a reusable editor section. The owner-only teammate edit route renders that section inside its existing route shell, while `ScheduleUserDetailPage` renders it inline only when workspace rules do not expose the roster.

**Tech Stack:** React 19, TypeScript, React Router, Convex React, Vitest, Tailwind CSS.

## Global Constraints

- Run every project command with `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- Personal and organizational-member Availability routes show the `Availability` title and no `Back to dashboard` link.
- Direct Availability views render editable weekly hours and their Save action without navigating to a second route.
- Organizational-owner roster and teammate detail/edit navigation remain unchanged.
- Do not add comments or default fallbacks to production code.
- Keep every modified or created code file at 300 lines or fewer.

---

### Task 1: Extract the reusable weekly-hours editor section

**Files:**
- Create: `src/components/schedule/ScheduleAvailabilityEditor.tsx`
- Modify: `src/pages/ScheduleUserAvailabilityPage.tsx:1-207`
- Test: `src/pages/ScheduleUserAvailabilityPage.test.tsx`

**Interfaces:**
- Consumes: `agentId: Id<'agents'>`, `workosUserId: string`, the Convex schedule queries and mutations, `WeeklyAvailabilityEditor`, and schedule draft helpers.
- Produces: `ScheduleAvailabilityEditor({ agentId, workosUserId, onSaved? }: { agentId: Id<'agents'>; workosUserId: string; onSaved?: () => void }): JSX.Element`.

- [x] **Step 1: Write the failing owner edit-route regression test**

Create `src/pages/ScheduleUserAvailabilityPage.test.tsx`. Mock only `ScheduleAvailabilityEditor` as a visible boundary component, render the real route with owner permissions, and assert it keeps the route heading and back navigation:

```ts
test('keeps the owner edit route around the extracted editor', () => {
  const markup = renderOwnerEditRoute();

  expect(markup).toContain('Available hours');
  expect(markup).toContain('Back');
  expect(markup).toContain('Schedule availability editor');
});
```

- [x] **Step 2: Run the focused test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ScheduleUserAvailabilityPage.test.tsx`

Expected: FAIL because the shared editor does not exist and the owner route cannot render it.

- [x] **Step 3: Extract the editor state and save flow**

Move the state, `getInitialShiftsFromDetail`, `areScheduleShiftsEqual`, `ensureSchedule`, and save flow from `ScheduleUserAvailabilityPage` into `ScheduleAvailabilityEditor`. The component renders this editor and Save action:

```tsx
<WeeklyAvailabilityEditor
  shiftDrafts={shiftDrafts}
  onShiftDraftsChange={setShiftDrafts}
  timezone={timezoneDraft}
  onTimezoneChange={setTimezoneDraft}
  timeOptions={SCHEDULE_TIME_OPTIONS}
/>
{hasChanges ? (
  <div className="flex justify-end">
    <Button type="button" disabled={saving} onClick={() => void handleSave()}>
      {saving ? 'Saving…' : 'Save'}
    </Button>
  </div>
) : null}
```

On a successful save, invoke `onSaved?.()` after the success toast. Keep the existing toast error behavior.

- [x] **Step 4: Make the owner edit route use the extracted section**

Keep route permission checks, its `Back` link, its `Available hours` heading, and its missing-member message in `ScheduleUserAvailabilityPage`. Replace its in-page draft state and editor markup with:

```tsx
<ScheduleAvailabilityEditor
  agentId={typedAgentId}
  workosUserId={decodedWorkosUserId}
  onSaved={() => navigate(detailPath)}
/>
```

- [x] **Step 5: Run the focused test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ScheduleUserAvailabilityPage.test.tsx src/components/WeeklyAvailabilityEditor.test.ts`

Expected: PASS; the owner route retains its shell around the extracted editor.

- [x] **Step 6: Commit the extracted editor**

```bash
git add src/components/schedule/ScheduleAvailabilityEditor.tsx src/components/schedule/ScheduleAvailabilityEditor.test.tsx src/pages/ScheduleUserAvailabilityPage.tsx
git commit -m "Extract availability hours editor"
```

### Task 2: Compose direct Availability as a complete page

**Files:**
- Create: `src/pages/ScheduleUserDetailPage.test.tsx`
- Create: `src/components/schedule/ScheduleTimeOffSection.tsx`
- Create: `src/components/schedule/ScheduleUserDetailHeader.tsx`
- Modify: `src/pages/ScheduleUserDetailPage.tsx:1-554`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `canViewAvailabilityRoster(activeTeam, role)`, `ScheduleAvailabilityEditor`, and the existing user-detail data.
- Produces: a direct-view `Availability` heading, inline editor, and no dashboard back link; owner teammate views retain `AvailabilitySummary` and their edit link.

- [x] **Step 1: Write the failing direct-view regression test**

Create `src/pages/ScheduleUserDetailPage.test.tsx`. Mock the extracted editor and time-off section only, render the real page route with a personal workspace, and assert the user-visible page hierarchy:

```ts
test('renders direct Availability inline without dashboard back navigation', () => {
  const markup = renderPersonalAvailabilityRoute();

  expect(markup).toContain('<h1');
  expect(markup).toContain('Availability');
  expect(markup).toContain('Schedule availability editor');
  expect(markup).not.toContain('Back to dashboard');
});
```

- [x] **Step 2: Run the focused test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ScheduleUserDetailPage.test.tsx`

Expected: FAIL because direct views still show dashboard back navigation and the compact summary rather than the inline editor.

- [x] **Step 3: Branch the page composition by roster visibility**

Import `ScheduleAvailabilityEditor`. Define the direct-view condition after loading:

```ts
const isDirectAvailabilityView = !showTeamRoster;
```

Render the page heading only for direct views:

```tsx
{isDirectAvailabilityView ? (
  <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">
    Availability
  </h1>
) : null}
```

Render the existing back link only for owner roster details and always use the label `Back`. For a missing user in a direct view, render only the message.

- [x] **Step 4: Replace the direct-view summary link with the inline editor**

In the Availability section, branch on `isDirectAvailabilityView`:

```tsx
{isDirectAvailabilityView ? (
  <ScheduleAvailabilityEditor agentId={typedAgentId} workosUserId={decodedWorkosUserId} />
) : (
  <Link to={availabilityPath} prefetch="intent" className={availabilitySummaryClassName}>
    <AvailabilitySummary lines={availabilityLines} timezoneLabel={timezoneLabel} />
    <ChevronRight className="m-2 size-4 shrink-0 text-muted-foreground" />
  </Link>
)}
```

Preserve the owner compact summary and its route exactly. Move the profile header and time-off workflow into `ScheduleUserDetailHeader` and `ScheduleTimeOffSection` so `ScheduleUserDetailPage.tsx` stays at or below 300 lines.

- [x] **Step 5: Run the focused test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ScheduleUserDetailPage.test.tsx src/pages/ScheduleUserAvailabilityPage.test.tsx`

Expected: PASS; direct Availability includes its title and inline editor while owner detail behavior stays explicit.

- [x] **Step 6: Run final verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WeeklyAvailabilityEditor.test.ts src/components/schedule/ScheduleAvailabilityEditor.test.tsx src/pages/ScheduleUserDetailPage.test.tsx src/pages/SchedulePage.test.tsx && bunx tsc --noEmit && git diff --check`

Expected: all focused suites, TypeScript, and whitespace-diff checks exit 0.

- [x] **Step 7: Update continuity and commit**

Record the tested local state in `CONTINUITY.md`, then commit:

```bash
git add src/components/schedule/ScheduleAvailabilityEditor.tsx src/components/schedule/ScheduleTimeOffSection.tsx src/components/schedule/ScheduleUserDetailHeader.tsx src/pages/ScheduleUserAvailabilityPage.tsx src/pages/ScheduleUserAvailabilityPage.test.tsx src/pages/ScheduleUserDetailPage.tsx src/pages/ScheduleUserDetailPage.test.tsx CONTINUITY.md docs/superpowers/plans/2026-08-14-direct-availability-page.md
git commit -m "Show direct availability hours"
```
