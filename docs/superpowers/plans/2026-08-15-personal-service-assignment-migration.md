# Personal Service Assignment Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair personal services whose assignee IDs were populated from an organization and prevent that mismatch from recurring.

**Architecture:** Personal agents resolve their owner’s personal team, never the owner’s mutable active team. A resumable Convex migration rewrites only personal services with a stale assignee list to the owner’s WorkOS user ID. Organization services retain their selected team assignments.

**Tech Stack:** Convex, `@convex-dev/migrations`, Vitest with `convex-test`.

## Global Constraints

- Use Node v22 for verification.
- Keep the migration idempotent and batch-based.
- Do not run the migration or deploy it without explicit production approval.
- Keep code files below 300 lines and avoid code comments.

---

### Task 1: Establish the personal-team resolver contract

**Files:**
- Modify: `convex/appointmentBooking/access.ts`
- Test: `convex/appointmentBookingServiceAssignments.test.ts`

**Interfaces:**
- Produces: `resolveTeamForAgent(ctx, agent)` resolving a personal agent to its owner’s personal team.

- [ ] **Step 1: Write the failing test**

```ts
expect(await listTeamWorkosUserIds(ctx, personalAgent)).toEqual(["personal-owner"]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run convex/appointmentBookingServiceAssignments.test.ts`

Expected: the personal agent resolves the owner’s active organization team instead of its personal team.

- [ ] **Step 3: Write minimal implementation**

```ts
const owner = await getUserByWorkosId(ctx, agent.userId);
if (owner === null) throw new Error("Agent owner not found");
const personalTeam = await getPersonalTeamForUser(ctx, owner._id);
if (personalTeam === null) throw new Error("Personal team not found");
return personalTeam;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run convex/appointmentBookingServiceAssignments.test.ts`

Expected: PASS.

### Task 2: Repair legacy personal-service assignees

**Files:**
- Modify: `convex/serviceAvailabilityMigration.ts`
- Test: `convex/appointmentBookingServiceAssignments.test.ts`

**Interfaces:**
- Produces: `normalizePersonalServiceAssignments` and `runNormalizePersonalServiceAssignments`.

- [ ] **Step 1: Write the failing test**

```ts
expect(service.assignedWorkosUserIds).toEqual(["personal-owner"]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run convex/appointmentBookingServiceAssignments.test.ts`

Expected: the legacy personal service still stores the stale organization ID.

- [ ] **Step 3: Write minimal implementation**

```ts
if (isPersonalAgent(agent) && !sameIds(service.assignedWorkosUserIds, [agent.userId])) {
  await ctx.db.patch(service._id, {
    assignedWorkosUserIds: [agent.userId],
    updatedAt: Date.now(),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run convex/appointmentBookingServiceAssignments.test.ts`

Expected: PASS and a second migration invocation leaves the row unchanged.

### Task 3: Verify and record rollout status

**Files:**
- Modify: `CONTINUITY.md`

- [ ] **Step 1: Run focused verification**

Run: `bunx vitest run convex/appointmentBookingServiceAssignments.test.ts && bunx tsc --noEmit -p convex/tsconfig.json && git diff --check`

Expected: all commands exit 0.

- [ ] **Step 2: Record deployment boundary**

Add a receipt that the migration is implemented but not run until explicit production approval.
