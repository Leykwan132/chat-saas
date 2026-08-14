# Availability Active Services Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each teammate’s assigned active services as compact Availability cards and let service editors include all teammates in one action.

**Architecture:** The existing `getForAgentUser` query will include the service metadata the Availability page needs. `ScheduleServicesSection` will render that metadata as small cards. `ServiceAssignmentFields` will use its existing form setter to replace selected teammate IDs with every option’s ID.

**Tech Stack:** React, TypeScript, Tailwind CSS, Convex, Vitest, shadcn/ui Button and Switch.

## Global Constraints

- Use Node v22 for every script: `source ~/.nvm/nvm.sh && nvm use 22`.
- Preserve individual teammate switches and their Included/Not included labels.
- Active service cards display name, duration, and optional service description only.
- Keep Active services between Available hours and Time off.
- Do not add pricing, assignment-method details, booking controls, or service edits to Availability.
- Keep source files below 300 lines; extract a focused component if an edited source file would exceed that limit.
- Do not deploy or run migrations.

---

### Task 1: Expose service card metadata and render Active services cards

**Files:**
- Modify: `convex/leadRouting/schedules.ts:121-137`
- Modify: `src/pages/ScheduleUserDetailPage.tsx:153-188`
- Modify: `src/pages/ScheduleUserDetailPage.test.tsx:31-81`

**Interfaces:**
- Consumes: active unarchived `appointmentServices` already filtered to the schedule user’s assignment.
- Produces: `detail.services: Array<{ name: string; durationMinutes: number; description?: string }>` for `ScheduleServicesSection`.

- [x] **Step 1: Write the failing page test**

  Update the personal Availability fixture and expectations:

  ```ts
  services: [
    { name: 'Consultation', durationMinutes: 45, description: 'Meet to discuss your goals.' },
    { name: 'Follow-up', durationMinutes: 30 },
  ],
  ```

  ```ts
  expect(markup).toContain('Active services');
  expect(markup).toContain('45 min');
  expect(markup).toContain('Meet to discuss your goals.');
  expect(markup).not.toContain('Services you can perform');
  expect(markup).not.toContain('You can receive bookings for these services when you are available.');
  expect(markup.indexOf('Active services')).toBeLessThan(markup.indexOf('Time off'));
  ```

- [x] **Step 2: Run the test to verify it fails**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ScheduleUserDetailPage.test.tsx
  ```

  Expected: FAIL because the query returns service names only and the page retains the old title/helper/badges.

- [x] **Step 3: Return the service fields and render cards**

  In `getForAgentUser`, replace the service mapping with:

  ```ts
  .map((service) => ({
    name: service.name,
    durationMinutes: service.durationMinutes,
    description: service.description,
  }));
  ```

  Change `ScheduleServicesSection` to accept that exact shape, render heading `Active services`, remove its helper paragraph, and map services to individual `rounded-xl border border-border bg-card p-4` cards. Each card shows the name, a muted `${durationMinutes} min` label, and the description only when defined. Remove the unused `Badge` import.

- [x] **Step 4: Run the focused test to verify it passes**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ScheduleUserDetailPage.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 5: Commit the card change**

  ```bash
  git add convex/leadRouting/schedules.ts src/pages/ScheduleUserDetailPage.tsx src/pages/ScheduleUserDetailPage.test.tsx
  git commit -m "Show active service cards in availability"
  ```

### Task 2: Add Include all teammates to service assignments

**Files:**
- Create: `src/lib/serviceAssignmentSelection.ts`
- Create: `src/lib/serviceAssignmentSelection.test.ts`
- Modify: `src/components/services/serviceFormShared.tsx:683-729`
- Modify: `src/components/services/serviceFormShared.test.tsx:5-27`

**Interfaces:**
- Consumes: `teamUserOptions: Array<{ value: string }>` and the current `ServiceForm`.
- Produces: `includeAllServiceTeammates(form, teamUserOptions): ServiceForm`, which replaces `assignedWorkosUserIds` with every option ID. The button uses this helper through the existing form setter.

- [x] **Step 1: Write the failing service-form test**

  Create `src/lib/serviceAssignmentSelection.test.ts`:

  ```ts
  import { expect, test } from 'vitest';
  import { DEFAULT_SERVICE_FORM } from './serviceForm';
  import { includeAllServiceTeammates } from './serviceAssignmentSelection';

  test('selects every available teammate', () => {
    expect(
      includeAllServiceTeammates(
        { ...DEFAULT_SERVICE_FORM, assignedWorkosUserIds: ['owner-id'] },
        [{ value: 'owner-id' }, { value: 'admin-id' }],
      ).assignedWorkosUserIds,
    ).toEqual(['owner-id', 'admin-id']);
  });
  ```

  Add this service-form rendering expectation:

  ```ts
  expect(markup).toContain('Include all teammates');
  ```

- [x] **Step 2: Run the test to verify it fails**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/serviceAssignmentSelection.test.ts src/components/services/serviceFormShared.test.tsx
  ```

  Expected: FAIL because the helper and action are absent.

- [x] **Step 3: Add the bulk-selection action**

  Create the pure helper:

  ```ts
  export function includeAllServiceTeammates<T extends { assignedWorkosUserIds: string[] }>(
    form: T,
    teamUserOptions: Array<{ value: string }>,
  ): T {
    return {
      ...form,
      assignedWorkosUserIds: teamUserOptions.map((user) => user.value),
    };
  }
  ```

  Import that helper and the existing shared `Button` component. In the Service teammates header, add a compact outline button:

  ```tsx
  <Button
    type="button"
    variant="outline"
    size="sm"
    disabled={disabled}
    onClick={() => setForm((previous) => includeAllServiceTeammates(previous, teamUserOptions))}
  >
    Include all teammates
  </Button>
  ```

  Lay out the heading and button in a wrapping row so it remains usable at narrow widths.

- [x] **Step 4: Run the focused test to verify it passes**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/serviceAssignmentSelection.test.ts src/components/services/serviceFormShared.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 5: Commit the bulk-selection change**

  ```bash
  git add src/lib/serviceAssignmentSelection.ts src/lib/serviceAssignmentSelection.test.ts src/components/services/serviceFormShared.tsx src/components/services/serviceFormShared.test.tsx
  git commit -m "Add bulk service teammate selection"
  ```

### Task 3: Verify the combined change

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: completed Tasks 1 and 2.
- Produces: validated local implementation and an up-to-date continuity receipt.

- [x] **Step 1: Run focused regression coverage**

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ScheduleUserDetailPage.test.tsx src/lib/serviceAssignmentSelection.test.ts src/components/services/serviceFormShared.test.tsx
  ```

  Expected: PASS.

- [x] **Step 2: Run static verification**

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit && git diff --check
  ```

  Expected: zero TypeScript errors and no diff whitespace errors.

- [x] **Step 3: Update the continuity ledger**

  Record the approved card contents, bulk-selection action, and exact verification result in `CONTINUITY.md`.

- [ ] **Step 4: Commit the verification ledger**

  ```bash
  git add CONTINUITY.md
  git commit -m "Document availability service card verification"
  ```
