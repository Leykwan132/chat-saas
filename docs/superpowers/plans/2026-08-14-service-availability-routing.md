# Service Availability and Lead Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Accepting leads and assign bookable services only to selected teammates whose weekly hours, time off, and calendars allow the booking.

**Architecture:** Keep weekly-hours and time-off evaluation in the existing scheduling and booking modules. Add an optional `assignedWorkosUserIds` service field for the online migration, constrain booking-assignee selection to that list, and ignore legacy schedule status fields for lead routing. The UI removes status controls and manages selected teammates as part of service configuration.

**Tech Stack:** Convex, `@convex-dev/migrations`, React, TypeScript, shadcn/ui, Vitest, convex-test.

## Global Constraints

- Run all scripts under Node v22 using `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- Keep source files below 300 lines and do not add code comments.
- Use bounded Convex reads and object-form functions with validators.
- `assignedWorkosUserIds` remains optional until the production backfill has completed; deploy and run that migration only with explicit user authorization.
- Weekly hours and active time off determine lead eligibility. Booking additionally requires a selected service teammate and no calendar conflict.

---

### Task 1: Add migration-safe service teammate assignments

**Files:**
- Modify: `convex/schema.ts:1490-1510`
- Create: `convex/serviceAvailabilityMigration.ts`
- Modify: `convex/appointmentBooking/services.ts:95-155`
- Modify: `convex/leadRouting/provision.ts:1-61`
- Create: `convex/serviceAvailabilityMigration.test.ts`
- Test: `convex/appointmentBookingServiceAssignments.test.ts`

**Interfaces:**
- Produces: `appointmentServices.assignedWorkosUserIds?: string[]` and a migration runner `api.serviceAvailabilityMigration.runBackfillServiceAvailability`.
- Consumes: `teamMemberships` through `by_teamId`, schedules through `by_agentId`, and agent ownership already resolved by appointment-service access helpers.

- [ ] **Step 1: Write failing migration and service tests**

Add convex-test cases that seed an agent, a team, two memberships, a service without `assignedWorkosUserIds`, and a disabled manual schedule. Assert the migration definition patches the service with both WorkOS IDs and changes the schedule to `enabled: true`, `mode: 'scheduled'`, and `manualStatus: 'available'`. Add a separate case that provisions a joining teammate and asserts their ID is appended exactly once to each existing service for the agent.

```ts
expect(service?.assignedWorkosUserIds).toEqual(['owner-id', 'member-id']);
expect(schedule).toMatchObject({
  enabled: true,
  mode: 'scheduled',
  manualStatus: 'available',
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/serviceAvailabilityMigration.test.ts
```

Expected: FAIL because the service field, migration definition, and provision-time service update do not exist.

- [ ] **Step 3: Implement the optional field and bounded migration**

Add the optional schema field:

```ts
assignedWorkosUserIds: v.optional(v.array(v.string())),
```

Create a migration module using the installed component pattern with separate service and schedule migrations, both using a batch size of 25:

```ts
const migrations = new Migrations<DataModel>(components.migrations);

export const backfillServiceAvailability = migrations.define({
  table: 'appointmentServices',
  batchSize: 25,
  migrateOne: async (ctx, service) => {
    const agent = await ctx.db.get(service.agentId);
    if (agent === null || !agent.orgId || agent.orgId === 'personal') return;
    const team = await ctx.db.query('teams')
      .withIndex('by_workosOrgId', (q) => q.eq('workosOrgId', agent.orgId))
      .unique();
    if (team === null) return;
    const memberships = await ctx.db.query('teamMemberships')
      .withIndex('by_teamId', (q) => q.eq('teamId', team._id))
      .take(100);
    const assignedWorkosUserIds = (await Promise.all(memberships.map(async (membership) => {
      const user = await ctx.db.get(membership.userId);
      return user?.workosUserId;
    }))).filter((workosUserId): workosUserId is string => workosUserId !== undefined);
    if (service.assignedWorkosUserIds === undefined) {
      await ctx.db.patch(service._id, { assignedWorkosUserIds, updatedAt: Date.now() });
    }
  },
});
```

Define and export both component runners with `internal.serviceAvailabilityMigration`. Add `assignedWorkosUserIds: v.optional(v.array(v.string()))` to the `updateService` arguments. Validate that every submitted ID belongs to the agent’s resolved team, reject an empty list, and reject `specific_user` when its user ID is outside the submitted list. In `provisionMemberSchedulesForOrg`, after creating the schedule, query that agent’s services by `by_agentId_and_isActive` with `.take(100)` and append the joining user to each list only when absent. When creating a service, resolve the agent team and persist its current member IDs as the initial list.

- [ ] **Step 4: Regenerate Convex types and run tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx convex codegen && bunx vitest run convex/serviceAvailabilityMigration.test.ts convex/appointmentBookingServiceAssignments.test.ts convex/leadRoutingSchedules.test.ts && bunx tsc --noEmit
```

Expected: the field and migration tests pass and generated API types are current.

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts convex/serviceAvailabilityMigration.ts convex/serviceAvailabilityMigration.test.ts convex/appointmentBooking/services.ts convex/leadRouting/provision.ts convex/leadRoutingSchedules.test.ts convex/_generated CONTINUITY.md docs/superpowers/plans/2026-08-14-service-availability-routing.md
git commit -m "Add service teammate assignments"
```

### Task 2: Make routing and booking honor the new availability rules

**Files:**
- Modify: `convex/leadRouting/eligibility.ts:44-65`
- Modify: `convex/appointmentBooking/availability.ts:20-175`
- Modify: `convex/workflowNodeReadiness.ts:10-110`
- Test: `convex/leadRoutingEligibility.test.ts`
- Test: `convex/appointmentBookingAvailability.test.ts`
- Test: `convex/workflowNodeReadiness.test.ts`

**Interfaces:**
- Produces: `isUserEligible(now, schedule, shifts, timeOffRows)` based only on shift coverage and time off.
- Consumes: `service.assignedWorkosUserIds`, with only an absent list treated as all roster members during the migration window.

- [ ] **Step 1: Write failing eligibility tests**

Add tests proving a previously disabled or manual-away schedule is eligible when its weekly shift covers `now`, and ineligible when it has active time off. Add booking-slot tests with two roster entries where only the selected teammate is considered, then prove a selected teammate is skipped for overlapping time off and calendar conflict.

```ts
expect(isUserEligible(now, disabledManualSchedule, shifts, [])).toBe(true);
expect(isUserEligible(now, disabledManualSchedule, shifts, activeTimeOff)).toBe(false);
expect(slots.map((slot) => slot.assignedWorkosUserId)).toEqual(['selected-user']);
```

- [ ] **Step 2: Run focused tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/leadRoutingEligibility.test.ts convex/appointmentBookingAvailability.test.ts convex/workflowNodeReadiness.test.ts
```

Expected: FAIL because legacy status currently gates eligibility and booking scans every roster member.

- [ ] **Step 3: Implement the smallest eligibility change**

Make `isUserEligible` return only shift coverage and no active time off:

```ts
export function isUserEligible(
  now: number,
  schedule: Doc<'userSchedules'>,
  shifts: Doc<'userShifts'>[],
  timeOffRows: Doc<'userTimeOff'>[],
): boolean {
  return !hasActiveTimeOff(now, timeOffRows) && isOnShift(now, schedule.timezone, shifts);
}
```

In booking availability, add the service-assignment membership check before shift, time-off, and calendar checks:

```ts
function isAssignedToService(service: Doc<'appointmentServices'>, workosUserId: string) {
  return service.assignedWorkosUserIds === undefined
    || service.assignedWorkosUserIds.includes(workosUserId);
}
```

Pass `service` to `entryAvailableForSlot`, reject entries not assigned to it, and leave strategy selection unchanged after the pool is filtered. Remove `hasAcceptingLeadMember` from workflow-readiness facts and book-appointment issue counts so an active permitted service is the only availability prerequisite.

- [ ] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/leadRoutingEligibility.test.ts convex/appointmentBookingAvailability.test.ts convex/manualBookingAvailability.test.ts convex/workflowNodeReadiness.test.ts && bunx tsc --noEmit
```

Expected: lead routing and booking respect weekly hours, time off, selected service teammates, and calendar conflicts; readiness no longer depends on legacy status.

- [ ] **Step 5: Commit**

```bash
git add convex/leadRouting/eligibility.ts convex/appointmentBooking/availability.ts convex/workflowNodeReadiness.ts convex/leadRoutingEligibility.test.ts convex/appointmentBookingAvailability.test.ts convex/workflowNodeReadiness.test.ts
git commit -m "Route availability by hours and time off"
```

### Task 3: Let service editors select teammates safely

**Files:**
- Modify: `src/lib/serviceForm.ts:5-185`
- Modify: `src/components/services/serviceFormShared.tsx:52-760`
- Modify: `src/components/services/CreateServiceWizard.tsx:330-375`
- Modify: `src/pages/ServicePage.tsx:70-150`
- Test: `src/lib/serviceForm.test.ts`
- Test: `src/components/services/serviceFormShared.test.tsx`

**Interfaces:**
- Produces: `ServiceForm.assignedWorkosUserIds: string[]` and `ServiceRow.assignedWorkosUserIds?: string[]`.
- Consumes: `TeamUserOption[]` already loaded by service pages and the optional persisted service list during migration.

- [ ] **Step 1: Write failing form and rendering tests**

Add a pure form test proving `serviceToForm` maps a stored assigned list and `buildServiceMutationArgs` sends the selected IDs. Add a rendered form test that selects two teammates, verifies both checkboxes are represented in the draft, and rejects saving with no selected teammate or a specific teammate not in the selected list.

```ts
expect(buildServiceMutationArgs({ ...form, assignedWorkosUserIds: ['owner-id'] }))
  .toMatchObject({ assignedWorkosUserIds: ['owner-id'] });
expect(validateServiceAssignment({ assignedWorkosUserIds: [], assignmentStrategy: 'balanced', specificWorkosUserId: '' }))
  .toBe('Select at least one teammate.');
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/lib/serviceForm.test.ts src/components/services/serviceFormShared.test.tsx
```

Expected: FAIL because the form has no selected-teammate state or validation.

- [ ] **Step 3: Implement service teammate selection**

Extend the form model and mapper:

```ts
export type ServiceForm = {
  assignedWorkosUserIds: string[];
  assignmentStrategy: AssignmentStrategy;
  specificWorkosUserId: string;
};
```

Export this pure validator from `src/lib/serviceForm.ts` and use it in both create and edit save handlers:

```ts
export function validateServiceAssignment(form: Pick<ServiceForm, 'assignedWorkosUserIds' | 'assignmentStrategy' | 'specificWorkosUserId'>) {
  if (form.assignedWorkosUserIds.length === 0) return 'Select at least one teammate.';
  if (form.assignmentStrategy === 'specific_user' && !form.assignedWorkosUserIds.includes(form.specificWorkosUserId)) {
    return 'Select the specific teammate for this service.';
  }
  return null;
}
```

Render one checkbox row per `TeamUserOption` in `ServiceAssignmentFields`, using `checked={form.assignedWorkosUserIds.includes(option.value)}` and immutable add/remove updates. Use the label `Teammates who can perform this service`. Disable or omit the specific-teammate option for IDs not selected. Before invoking the update mutation, show an error and keep the form open when `validateServiceAssignment` returns text. When the creation wizard first receives team members, initialize its draft with all their IDs. When editing a legacy service with no stored list, initialize the draft from the loaded team IDs so its first save writes the concrete migrated value. Include `assignedWorkosUserIds` in the existing create-wizard follow-up update and the edit mutation payload.

- [ ] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/lib/serviceForm.test.ts src/components/services/serviceFormShared.test.tsx src/pages/ServicePage.test.tsx && bunx tsc --noEmit
```

Expected: services persist an explicit teammate list and invalid selections cannot be saved.

- [ ] **Step 5: Commit**

```bash
git add src/lib/serviceForm.ts src/lib/serviceForm.test.ts src/components/services/serviceFormShared.tsx src/components/services/serviceFormShared.test.tsx src/components/services/CreateServiceWizard.tsx src/pages/ServicePage.tsx src/pages/ServicePage.test.tsx
git commit -m "Select teammates for appointment services"
```

### Task 4: Remove legacy status controls from Availability

**Files:**
- Modify: `src/pages/SchedulePage.tsx:1-300`
- Modify: `src/pages/UserScheduleCard.tsx:1-190`
- Modify: `src/pages/ScheduleUserDetailPage.tsx:1-281`
- Modify: `src/components/workflow/WorkflowBookingAvailabilitySection.tsx:1-250`
- Modify: `src/components/schedule/ScheduleUserDetailHeader.tsx:1-80`
- Test: `src/pages/SchedulePage.test.tsx`
- Test: `src/pages/ScheduleUserDetailPage.test.tsx`
- Test: `src/components/workflow/WorkflowBookingAvailabilitySection.test.tsx`

**Interfaces:**
- Consumes: weekly shifts, time off, open-lead counts, and service availability without `schedule.enabled` controls.
- Produces: Availability and workflow booking surfaces with no Accepting leads, Active, or Inactive UI.

- [ ] **Step 1: Write failing UI tests**

Add or update static-render tests for the roster card, self detail page, and workflow booking section. Assert their markup no longer contains `Accepting leads`, `Inactive`, `Active`, `Turning on availability`, or `Turning off availability`, while still showing weekly-hours and Time off content.

```ts
expect(markup).not.toContain('Accepting leads');
expect(markup).not.toContain('Inactive');
expect(markup).toContain('Time off');
```

- [ ] **Step 2: Run focused tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/pages/SchedulePage.test.tsx src/pages/ScheduleUserDetailPage.test.tsx src/components/workflow/WorkflowBookingAvailabilitySection.test.tsx
```

Expected: FAIL because the status badge, status section, filtering, and switches are still rendered.

- [ ] **Step 3: Remove status-only UI and data flow**

Delete the schedule-enable mutation handlers, active-only filter, status props, switches, status badges, disabled opacity, and status skeleton rows. Keep roster search, lead counts, role badges, clock-prefixed weekly hours, Availability editor, and Time off. Remove the Booking workflow availability switch list and replace its explanatory copy with the selected-service teammate rule.

- [ ] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/pages/SchedulePage.test.tsx src/pages/ScheduleUserDetailPage.test.tsx src/components/workflow/WorkflowBookingAvailabilitySection.test.tsx src/components/schedule/ScheduleAvailabilityEditor.test.tsx && bunx tsc --noEmit && git diff --check
```

Expected: Availability retains hours and time-off editing without lead-status controls.

- [ ] **Step 5: Commit**

```bash
git add src/pages/SchedulePage.tsx src/pages/UserScheduleCard.tsx src/pages/ScheduleUserDetailPage.tsx src/components/workflow/WorkflowBookingAvailabilitySection.tsx src/components/schedule/ScheduleUserDetailHeader.tsx src/pages/SchedulePage.test.tsx src/pages/ScheduleUserDetailPage.test.tsx src/components/workflow/WorkflowBookingAvailabilitySection.test.tsx
git commit -m "Remove accepting leads status"
```

### Task 5: Verify migration readiness and complete the local change

**Files:**
- Modify: `CONTINUITY.md`
- Test: `convex/serviceAvailabilityMigration.test.ts`

**Interfaces:**
- Consumes: migration runner, generated API references, and the optional service assignment field.
- Produces: a locally verified change ready for a separately authorized deploy and migration run.

- [ ] **Step 1: Record the production migration boundary**

Add a ledger entry stating that deployment, `npx convex run serviceAvailabilityMigration:runBackfillServiceAvailability '{"dryRun": true}' --prod`, migration-status monitoring, and schema narrowing are pending explicit user authorization. Do not invoke a production migration in this task.

- [ ] **Step 2: Run final local verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx convex codegen && bunx vitest run convex/serviceAvailabilityMigration.test.ts convex/appointmentBookingServiceAssignments.test.ts convex/leadRoutingEligibility.test.ts convex/appointmentBookingAvailability.test.ts src/lib/serviceForm.test.ts src/components/services/serviceFormShared.test.tsx src/pages/SchedulePage.test.tsx src/pages/ScheduleUserDetailPage.test.tsx src/components/workflow/WorkflowBookingAvailabilitySection.test.tsx && bunx tsc --noEmit && bun run test && git diff --check
```

Expected: focused migration, backend, form, Availability, full application, and Docs tests pass with generated types current.

- [ ] **Step 3: Commit**

```bash
git add convex/serviceAvailabilityMigration.ts convex/serviceAvailabilityMigration.test.ts convex/_generated CONTINUITY.md docs/superpowers/plans/2026-08-14-service-availability-routing.md
git commit -m "Prepare availability migration"
```
