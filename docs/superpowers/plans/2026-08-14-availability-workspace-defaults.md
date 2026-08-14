# Availability Workspace Defaults Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route Availability according to workspace ownership, display exact membership roles, and make future schedules accept leads by default.

**Architecture:** `SchedulePage` decides whether the active user can view the organizational roster or must be redirected to their individual detail route. The roster card and detail query use the membership role rather than a derived administrator flag. Schedule provisioning remains centralized in the existing helpers and creates enabled schedules whenever an agent or organizational membership is created.

**Tech Stack:** React 19, React Router, Convex, TypeScript, Tailwind CSS, Vitest, React server rendering.

## Global Constraints

- Run every project command with `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- Personal workspaces and organizational admins or members open their own availability detail route; organizational owners retain the roster.
- Use `Owner`, `Admin`, and `Member` labels from team membership role data.
- Every future schedule provisioned for a new agent or a new organizational member has `enabled: true`; do not modify existing schedules.
- Preserve direct-link authorization and individual schedule editing permissions.
- Do not add comments or default fallbacks to production code.
- Keep all code files below 300 lines.

---

### Task 1: Enable every newly provisioned schedule

**Files:**
- Modify: `convex/agents.ts:1-200`
- Modify: `convex/leadRouting/provision.ts:1-80`
- Modify: `convex/agentCreation.test.ts`
- Create: `convex/workosWebhookAvailability.test.ts`

**Interfaces:**
- Consumes: `ensureUserScheduleForAgent(ctx, { agentId, workosUserId, enabled })` from `convex/leadRouting/schedules.ts`.
- Produces: enabled creator schedules for personal agents, enabled schedules for all current members when creating an organizational agent, and enabled schedules for newly joined organizational members.

- [x] **Step 1: Write the failing agent-creation schedule tests**

Add a personal-agent assertion to `convex/agentCreation.test.ts`:

```ts
test("enables the creator's schedule for a new personal agent", async () => {
  const testInstance = initTest();
  const workosUserId = "personal-schedule-owner";
  const agentId = await testInstance
    .withIdentity({ subject: workosUserId })
    .mutation(api.agents.create, {
      name: "Personal Schedule Agent",
      businessName: "Personal Business",
      businessDescription: "Personal availability defaults",
      goal: "support",
    });

  const schedule = await testInstance.run(async (ctx) =>
    await ctx.db
      .query("userSchedules")
      .withIndex("by_agentId_and_workosUserId", (q) =>
        q.eq("agentId", agentId).eq("workosUserId", workosUserId),
      )
      .unique(),
  );

  expect(schedule?.enabled).toBe(true);
});
```

Add an organizational fixture with an owner and member, an organizational team with `workosOrgId: "org-schedule-defaults"`, both memberships, and the owner as the active team. Create an agent as the owner and assert both resulting schedules are enabled:

```ts
expect(schedules.map((schedule) => ({
  workosUserId: schedule.workosUserId,
  enabled: schedule.enabled,
}))).toEqual([
  { workosUserId: "org-schedule-owner", enabled: true },
  { workosUserId: "org-schedule-member", enabled: true },
]);
```

- [x] **Step 2: Write the failing membership-provisioning test**

Create `convex/workosWebhookAvailability.test.ts`. Seed an organizational team with `workosOrgId: "org-new-member"` and one existing agent, then dispatch a membership-created event:

```ts
await t.mutation(internal.workosWebhook.dispatch, {
  eventId: "event-new-member-availability",
  eventType: "organization_membership.created",
  data: {
    user_id: "new-availability-member",
    organization_id: "org-new-member",
    role: { slug: "member" },
    email: "new-member@example.com",
  },
});

const schedule = await t.run(async (ctx) =>
  await ctx.db
    .query("userSchedules")
    .withIndex("by_agentId_and_workosUserId", (q) =>
      q.eq("agentId", agentId).eq("workosUserId", "new-availability-member"),
    )
    .unique(),
);

expect(schedule?.enabled).toBe(true);
```

- [x] **Step 3: Run the new schedule tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/agentCreation.test.ts convex/workosWebhookAvailability.test.ts`

Expected: FAIL because personal agent creation creates no schedule, and the organization provisioning helper explicitly passes `enabled: false`.

- [x] **Step 4: Make agent creation provision the creator's schedule**

In `convex/agents.ts`, import `ensureUserScheduleForAgent` with the existing organization provisioner. Immediately after inserting the agent, initialize the authenticated creator's schedule:

```ts
await ensureUserScheduleForAgent(ctx, {
  agentId,
  workosUserId: userId,
  enabled: true,
});
```

Keep the organizational provisioning call afterward so all other organizational members receive schedules.

- [x] **Step 5: Make organizational provisioners create enabled schedules**

In both calls to `ensureUserScheduleForAgent` in `convex/leadRouting/provision.ts`, set `enabled: true`:

```ts
await ensureUserScheduleForAgent(ctx, {
  agentId,
  workosUserId,
  enabled: true,
});
```

and:

```ts
await ensureUserScheduleForAgent(ctx, {
  agentId,
  workosUserId: user.workosUserId,
  enabled: true,
});
```

- [x] **Step 6: Run the schedule tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/agentCreation.test.ts convex/workosWebhookAvailability.test.ts`

Expected: PASS; each newly created or joined user has an enabled schedule, while the tests only inspect records created in their fixtures.

- [x] **Step 7: Commit the schedule-default implementation**

```bash
git add convex/agents.ts convex/leadRouting/provision.ts convex/agentCreation.test.ts convex/workosWebhookAvailability.test.ts
git commit -m "Enable newly provisioned schedules"
```

### Task 2: Render exact membership roles

**Files:**
- Modify: `convex/leadRouting/schedules.ts:115-205`
- Modify: `src/pages/UserScheduleCard.tsx:48-145`
- Modify: `src/pages/SchedulePage.tsx:20-280`
- Modify: `src/pages/ScheduleUserDetailPage.tsx:45-260`
- Modify: `src/pages/SchedulePage.test.tsx`
- Modify: `convex/leadRoutingSchedules.test.ts`

**Interfaces:**
- Consumes: `teamMemberships.role` values `owner | admin | member`.
- Produces: `role` on `getForAgentUser().user`, a `role` prop for `UserScheduleCard`, and an exact user-facing role label in the roster and detail page.

- [x] **Step 1: Write the failing Owner-label frontend assertion**

In `src/pages/SchedulePage.test.tsx`, keep the roster owner fixture with `role: 'owner'` and replace the current role assertion with:

```tsx
expect(markup).toContain('>Owner</span>');
expect(markup).not.toContain('>Admin</span>');
expect(markup.indexOf('>Owner</span>')).toBeLessThan(
  markup.indexOf('>Ley Kwan Choo (You)</span>'),
);
```

Add a detail-query assertion to `convex/leadRoutingSchedules.test.ts` by querying `api.leadRouting.schedules.getForAgentUser` for an owner fixture and asserting:

```ts
expect(detail?.user.role).toBe("owner");
```

- [x] **Step 2: Run the role tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/SchedulePage.test.tsx convex/leadRoutingSchedules.test.ts`

Expected: FAIL because the card renders `Admin` from `isAdmin`, and the detail query does not return a role.

- [x] **Step 3: Return membership role from the detail query**

In `convex/leadRouting/schedules.ts`, replace the local `isAdmin`-only derivation with a role initialized to personal owner and overwritten from the organizational membership:

```ts
let role: "owner" | "admin" | "member" = "owner";
if (team !== null) {
  const membership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", user._id).eq("teamId", team._id),
    )
    .unique();
  if (membership === null) {
    throw new Error("Team membership not found");
  }
  role = membership.role;
}
const isAdmin = role === "owner" || role === "admin";
```

Include `role` alongside `isAdmin` in both returned `user` objects.

- [x] **Step 4: Pass and render the exact role**

Change `UserScheduleCard` to accept `role: 'owner' | 'admin' | 'member'` instead of `isAdmin`, and render:

```tsx
<Badge variant="outline" className="text-[11px]">
  {role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Member'}
</Badge>
```

Pass `role={teammate.role}` from `SchedulePage`. In `ScheduleUserDetailPage`, render the same role expression from `detail.user.role`.

- [x] **Step 5: Run the role tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/SchedulePage.test.tsx convex/leadRoutingSchedules.test.ts`

Expected: PASS; owners are visibly labelled Owner on roster cards and the detail data retains the same membership role.

- [x] **Step 6: Commit exact-role rendering**

```bash
git add convex/leadRouting/schedules.ts convex/leadRoutingSchedules.test.ts src/pages/UserScheduleCard.tsx src/pages/SchedulePage.tsx src/pages/ScheduleUserDetailPage.tsx src/pages/SchedulePage.test.tsx
git commit -m "Show exact availability roles"
```

### Task 3: Route non-owners directly to their availability detail

**Files:**
- Modify: `src/pages/SchedulePage.tsx:1-280`
- Modify: `src/pages/ScheduleUserDetailPage.tsx:1-260`
- Modify: `src/pages/SchedulePage.test.tsx`
- Create: `src/lib/availabilityWorkspace.ts`
- Create: `src/lib/availabilityWorkspace.test.ts`

**Interfaces:**
- Consumes: `useActiveTeam().activeTeam` and `usePermissions().role`.
- Produces: `canViewAvailabilityRoster`, a roster only for organizational owners, direct self-detail redirects for all other Availability entry contexts, and a dashboard back path where no roster is available.

- [x] **Step 1: Write failing workspace-routing tests**

Create `src/lib/availabilityWorkspace.test.ts` with direct expectations for the desired routing decision:

```ts
import { expect, test } from 'vitest';
import { canViewAvailabilityRoster } from './availabilityWorkspace';

test('only an organizational owner can view the availability roster', () => {
  expect(canViewAvailabilityRoster({ type: 'personal' }, 'owner')).toBe(false);
  expect(canViewAvailabilityRoster({ type: 'organizational' }, 'admin')).toBe(false);
  expect(canViewAvailabilityRoster({ type: 'organizational' }, 'member')).toBe(false);
  expect(canViewAvailabilityRoster({ type: 'organizational' }, 'owner')).toBe(true);
});
```

Mock `useActiveTeam` in `src/pages/SchedulePage.test.tsx` with an organizational owner active team and assert the existing owner test still renders `Search team members by name or email...`.

- [x] **Step 2: Run the routing test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/availabilityWorkspace.test.ts src/pages/SchedulePage.test.tsx`

Expected: FAIL because `canViewAvailabilityRoster` does not yet exist.

- [x] **Step 3: Gate roster rendering by workspace type and role**

Create `src/lib/availabilityWorkspace.ts`:

```ts
type AvailabilityWorkspace = { type: 'personal' | 'organizational' } | null | undefined;
type AvailabilityRole = 'owner' | 'admin' | 'member';

export function canViewAvailabilityRoster(
  activeTeam: AvailabilityWorkspace,
  role: AvailabilityRole,
) {
  return activeTeam?.type === 'organizational' && role === 'owner';
}
```

In `SchedulePage`, import `useActiveTeam` and `canViewAvailabilityRoster`, destructure `role` from `usePermissions`, and derive:

```tsx
const { activeTeam } = useActiveTeam();
const showTeamRoster = canViewAvailabilityRoster(activeTeam, role);
```

Skip roster, team-user, and lead-count queries unless `showTeamRoster` is true. Include `activeTeam === undefined` in loading state. After the permission guard and loading state, redirect non-roster contexts with a loaded current user:

```tsx
if (!showTeamRoster && currentUser) {
  return (
    <Navigate
      to={`/dashboard/${typedAgentId}/availability/${encodeURIComponent(currentUser.workosUserId)}`}
      replace
    />
  );
}
```

Keep the existing owner roster controls, cards, filters, and lead toggle behavior intact.

- [x] **Step 4: Give direct detail pages a dashboard back destination**

In `ScheduleUserDetailPage`, import `useActiveTeam` and `canViewAvailabilityRoster`, read `role`, and derive the same roster condition. Use it to define:

```tsx
const schedulePath = showTeamRoster
  ? `/dashboard/${typedAgentId}/availability`
  : `/dashboard/${typedAgentId}`;
const backLabel = showTeamRoster ? 'Back' : 'Back to dashboard';
```

Use `schedulePath` and `backLabel` for each detail-page back link and include active-team loading in the page skeleton condition.

- [x] **Step 5: Run the routing test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/availabilityWorkspace.test.ts src/pages/SchedulePage.test.tsx`

Expected: PASS; personal users and organizational admins redirect to their own detail route, while organizational owners still receive the roster.

- [x] **Step 6: Run final verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/agentCreation.test.ts convex/workosWebhookAvailability.test.ts convex/leadRoutingSchedules.test.ts src/lib/availabilityWorkspace.test.ts src/pages/SchedulePage.test.tsx && bunx tsc --noEmit && git diff --check`

Expected: all focused suites, TypeScript, and whitespace-diff checks exit 0.

- [ ] **Step 7: Commit and update the continuity ledger**

Update `CONTINUITY.md` with tested implementation state and verification receipts, then commit:

```bash
git add src/lib/availabilityWorkspace.ts src/lib/availabilityWorkspace.test.ts src/pages/SchedulePage.tsx src/pages/ScheduleUserDetailPage.tsx src/pages/SchedulePage.test.tsx CONTINUITY.md docs/superpowers/plans/2026-08-14-availability-workspace-defaults.md
git commit -m "Route availability by workspace role"
```
