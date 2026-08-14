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
- Test: `src/components/schedule/ScheduleAvailabilityEditor.test.tsx`

**Interfaces:**
- Consumes: `agentId: Id<'agents'>`, `workosUserId: string`, the Convex schedule queries and mutations, `WeeklyAvailabilityEditor`, and schedule draft helpers.
- Produces: `ScheduleAvailabilityEditor({ agentId, workosUserId, onSaved? }: { agentId: Id<'agents'>; workosUserId: string; onSaved?: () => void }): JSX.Element`.

- [ ] **Step 1: Write the failing extraction regression test**

Create `src/components/schedule/ScheduleAvailabilityEditor.test.tsx`:

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const editorSource = readFileSync(
  new URL('./ScheduleAvailabilityEditor.tsx', import.meta.url),
  'utf8',
);

test('owns the inline weekly-hours editor and save action', () => {
  expect(editorSource).toContain('WeeklyAvailabilityEditor');
  expect(editorSource).toContain("saving ? 'Saving…' : 'Save'");
  expect(editorSource).toContain('onSaved?.()');
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/schedule/ScheduleAvailabilityEditor.test.tsx`

Expected: FAIL because `ScheduleAvailabilityEditor.tsx` does not exist.

- [ ] **Step 3: Extract the editor state and save flow**

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

- [ ] **Step 4: Make the owner edit route use the extracted section**

Keep route permission checks, its `Back` link, its `Available hours` heading, and its missing-member message in `ScheduleUserAvailabilityPage`. Replace its in-page draft state and editor markup with:

```tsx
<ScheduleAvailabilityEditor
  agentId={typedAgentId}
  workosUserId={decodedWorkosUserId}
  onSaved={() => navigate(detailPath)}
/>
```

- [ ] **Step 5: Run the focused test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/schedule/ScheduleAvailabilityEditor.test.tsx src/components/WeeklyAvailabilityEditor.test.ts`

Expected: PASS; the extracted section owns the editor and invokes its supplied success callback.

- [ ] **Step 6: Commit the extracted editor**

```bash
git add src/components/schedule/ScheduleAvailabilityEditor.tsx src/components/schedule/ScheduleAvailabilityEditor.test.tsx src/pages/ScheduleUserAvailabilityPage.tsx
git commit -m "Extract availability hours editor"
```

### Task 2: Compose direct Availability as a complete page

**Files:**
- Create: `src/pages/ScheduleUserDetailPage.test.tsx`
- Modify: `src/pages/ScheduleUserDetailPage.tsx:1-557`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `canViewAvailabilityRoster(activeTeam, role)`, `ScheduleAvailabilityEditor`, and the existing user-detail data.
- Produces: a direct-view `Availability` heading, inline editor, and no dashboard back link; owner teammate views retain `AvailabilitySummary` and their edit link.

- [ ] **Step 1: Write the failing direct-view regression test**

Create `src/pages/ScheduleUserDetailPage.test.tsx`:

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const pageSource = readFileSync(
  new URL('./ScheduleUserDetailPage.tsx', import.meta.url),
  'utf8',
);

test('renders direct Availability inline without dashboard back navigation', () => {
  expect(pageSource).toContain('const isDirectAvailabilityView = !showTeamRoster;');
  expect(pageSource).toContain('>Availability</h1>');
  expect(pageSource).toContain('<ScheduleAvailabilityEditor');
  expect(pageSource).not.toContain("const backLabel = showTeamRoster ? 'Back' : 'Back to dashboard';");
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ScheduleUserDetailPage.test.tsx`

Expected: FAIL because direct-view page composition and the reusable editor import do not yet exist.

- [ ] **Step 3: Branch the page composition by roster visibility**

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

- [ ] **Step 4: Replace the direct-view summary link with the inline editor**

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

Preserve the owner compact summary and its route exactly. Remove direct-view-only summary props and imports once unused. Split the legacy detail page into focused local components if required to keep the modified file within 300 lines.

- [ ] **Step 5: Run the focused test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ScheduleUserDetailPage.test.tsx src/components/schedule/ScheduleAvailabilityEditor.test.tsx`

Expected: PASS; direct Availability includes its title and inline editor while owner detail behavior stays explicit.

- [ ] **Step 6: Run final verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WeeklyAvailabilityEditor.test.ts src/components/schedule/ScheduleAvailabilityEditor.test.tsx src/pages/ScheduleUserDetailPage.test.tsx src/pages/SchedulePage.test.tsx && bunx tsc --noEmit && git diff --check`

Expected: all focused suites, TypeScript, and whitespace-diff checks exit 0.

- [ ] **Step 7: Update continuity and commit**

Record the tested local state in `CONTINUITY.md`, then commit:

```bash
git add src/components/schedule/ScheduleAvailabilityEditor.tsx src/components/schedule/ScheduleAvailabilityEditor.test.tsx src/pages/ScheduleUserAvailabilityPage.tsx src/pages/ScheduleUserDetailPage.tsx src/pages/ScheduleUserDetailPage.test.tsx CONTINUITY.md docs/superpowers/plans/2026-08-14-direct-availability-page.md
git commit -m "Show direct availability hours"
```
