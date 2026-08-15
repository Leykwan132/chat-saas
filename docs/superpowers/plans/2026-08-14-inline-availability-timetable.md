# Inline Availability Timetable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embed editable weekly availability directly in every Availability detail page and remove service cards from Availability.

**Architecture:** `ScheduleUserDetailPage` will always render `ScheduleAvailabilityEditor` after any applicable detail header. The schedule-detail query will stop loading and returning appointment services because the Availability page no longer consumes them.

**Tech Stack:** React, TypeScript, Tailwind CSS, Convex, Vitest.

## Global Constraints

- Use Node v22 for every script: `source ~/.nvm/nvm.sh && nvm use 22`.
- Personal and direct self-Availability pages omit profile metadata.
- Organizational owner detail pages retain Back navigation and teammate identity metadata.
- Every detail page embeds the weekly timetable; no linked Available hours summary remains.
- Availability contains no Active services section, service cards, or empty-services state.
- Do not alter service assignment, booking eligibility, weekly-hour editing, time-off behavior, or roster navigation.
- Do not deploy or run migrations.

---

### Task 1: Remove service payload and service UI from Availability details

**Files:**
- Modify: `convex/leadRouting/schedules.ts:145-227`
- Modify: `convex/leadRoutingSchedules.test.ts:41-90`
- Modify: `src/pages/ScheduleUserDetailPage.tsx:1-219`
- Modify: `src/pages/ScheduleUserDetailPage.test.tsx:31-93`

**Interfaces:**
- Consumes: `getForAgentUser` schedule, shifts, time off, and user data.
- Produces: schedule detail responses with no `services` field and Availability markup with no service content.

- [x] **Step 1: Write failing contract and page expectations**

  Replace the query assertion:

  ```ts
  expect(detail?.services).toEqual([{ name: 'Consultation', durationMinutes: 30 }]);
  ```

  with:

  ```ts
  expect(detail).not.toHaveProperty('services');
  ```

  Remove `services` from the page fixture and assert:

  ```ts
  expect(markup).not.toContain('Active services');
  expect(markup).not.toContain('Consultation');
  expect(markup).not.toContain('45 min');
  expect(markup).not.toContain('Meet to discuss your goals.');
  ```

- [x] **Step 2: Run the focused tests to verify they fail**

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/leadRoutingSchedules.test.ts src/pages/ScheduleUserDetailPage.test.tsx
  ```

  Expected: FAIL because the query still returns services and the page still renders Active services cards.

- [x] **Step 3: Remove the unused data path and section**

  Delete the active appointment-service query and `assignedServices` mapping from `getForAgentUser`, then remove `services: assignedServices` from both return branches. In `ScheduleUserDetailPage`, delete `ScheduleServicesSection` and its call site.

- [x] **Step 4: Run the focused tests to verify they pass**

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/leadRoutingSchedules.test.ts src/pages/ScheduleUserDetailPage.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 5: Commit the service-removal change**

  ```bash
  git add convex/leadRouting/schedules.ts convex/leadRoutingSchedules.test.ts src/pages/ScheduleUserDetailPage.tsx src/pages/ScheduleUserDetailPage.test.tsx
  git commit -m "Remove services from availability details"
  ```

### Task 2: Embed the timetable in team-member details

**Files:**
- Modify: `src/pages/ScheduleUserDetailPage.tsx:1-164`
- Modify: `src/pages/ScheduleUserDetailPage.test.tsx:95-145`

**Interfaces:**
- Consumes: existing `ScheduleAvailabilityEditor` props `{ agentId: Id<'agents'>; workosUserId: string }`.
- Produces: every completed Availability detail page renders that editor directly, including organizational owner team details.

- [x] **Step 1: Write a failing organizational-owner detail test**

  Set the test context to an organizational owner, render a teammate detail, and assert identity metadata remains while the link route is absent:

  ```ts
  mocks.activeTeam = { type: 'organizational' };
  mocks.role = 'owner';
  expect(markup).toContain('Ley Kwan Choo (You)');
  expect(markup).toContain('ley@example.com');
  expect(markup).toContain('Monday');
  expect(markup).not.toContain('/dashboard/agent-1/availability/user-ley/edit');
  expect(markup).not.toContain('Available hours');
  ```

  Mock the editor’s schedule query after the detail and current-user calls with the same `detail` fixture:

  ```ts
  mocks.useQuery
    .mockReturnValueOnce(detail)
    .mockReturnValueOnce(currentUser)
    .mockReturnValueOnce(detail);
  ```

- [x] **Step 2: Run the page test to verify it fails**

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ScheduleUserDetailPage.test.tsx
  ```

  Expected: FAIL because organizational owner details still render the linked Available hours summary.

- [x] **Step 3: Always render the availability editor**

  Remove `availabilityPath`, `AvailabilitySummary`, `ChevronRight`, `Globe`, and schedule-summary utility imports. Replace the conditional Availability section with:

  ```tsx
  <section className="space-y-3">
    <ScheduleAvailabilityEditor
      agentId={typedAgentId}
      workosUserId={decodedWorkosUserId}
    />
  </section>
  ```

  Preserve the existing Back link and `ScheduleUserDetailHeader` condition so only roster-context identity metadata remains.

- [x] **Step 4: Run the page test to verify it passes**

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ScheduleUserDetailPage.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 5: Commit the inline-timetable change**

  ```bash
  git add src/pages/ScheduleUserDetailPage.tsx src/pages/ScheduleUserDetailPage.test.tsx
  git commit -m "Embed availability timetable in team details"
  ```

### Task 3: Verify the completed Availability detail layout

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: completed Tasks 1 and 2.
- Produces: verified local layout and an up-to-date continuity receipt.

- [x] **Step 1: Run focused coverage**

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/leadRoutingSchedules.test.ts src/pages/ScheduleUserDetailPage.test.tsx
  ```

  Expected: PASS.

- [x] **Step 2: Run static checks**

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit && git diff --check
  ```

  Expected: zero TypeScript errors and no diff whitespace errors.

- [x] **Step 3: Update the continuity ledger**

  Record the removal of service cards, inline timetable behavior for every detail view, and the exact verification result.

- [ ] **Step 4: Commit the verification ledger**

  ```bash
  git add CONTINUITY.md
  git commit -m "Document inline availability verification"
  ```
