# Team Subscription Deletion Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permanently delete an organizational workspace and all owned local, component, storage, channel, and WorkOS data after Stripe emits `customer.subscription.deleted`, while presenting an explicit downgrade warning and a minimal stale-route recovery action.

**Architecture:** A short webhook transaction marks the team `deleting`, moves active members to Personal, and creates one idempotent deletion job. A dedicated Workpool coordinator advances bounded external and local cleanup phases from an explicit deletion manifest, deleting the WorkOS organization, memberships, team, and job only after every dependency is gone. Shared access guards prevent new workspace activity while cleanup runs; React handles pre-downgrade confirmation and stale routes.

**Tech Stack:** TypeScript 6, Convex 1.36, `@convex-dev/workpool` 0.4.8, `@convex-dev/agent` 0.6, WorkOS Node SDK 9, Stripe Convex component, React 19, React Router 7, shadcn/Base UI, Vitest 1.6, `convex-test`.

## Global Constraints

- Read `convex/_generated/ai/guidelines.md` and use `convex:convex-expert` before editing any file under `convex/`.
- Use Node v22 in the same shell execution for every script and test command.
- No code file may exceed 300 lines; split modules before they reach the limit.
- Do not add comments unless a non-obvious workaround cannot be made self-explanatory.
- Do not add default fallbacks that hide missing deletion coverage or corrupted billing configuration.
- Personal Free workspaces and other organizational workspaces must remain untouched.
- Cleanup starts only from verified `customer.subscription.deleted` or `organization.deleted` events.
- All cleanup is permanent, idempotent, bounded, and retryable.
- The downgrade modal copy and stale-route copy must match the approved design exactly.
- Do not update the public changelog until production availability is confirmed.

---

## File Structure

### New backend modules

- `convex/teamDeletion/schema.ts`: deletion validators and `teamDeletionJobs` table definition.
- `convex/teamDeletion/model.ts`: lifecycle types, terminal-state helpers, and job-phase transitions.
- `convex/teamDeletion/access.ts`: shared read helpers that classify a team as active, deleting, or missing.
- `convex/teamDeletion/request.ts`: idempotent Stripe/WorkOS deletion request transaction and Personal fallback.
- `convex/teamDeletion/pool.ts`: dedicated Workpool instance and retry configuration.
- `convex/teamDeletion/worker.ts`: phase coordinator only; no table-specific deletion loops.
- `convex/teamDeletion/external.ts`: WorkOS, channel, Agent component, R2, Convex storage, and Cloudflare cleanup.
- `convex/teamDeletion/manifest.ts`: explicit ordered manifest of every team-owned table/resource and its ownership path.
- `convex/teamDeletion/local.ts`: bounded local deletion primitives driven by the manifest.
- `convex/teamDeletion/verify.ts`: final residual-data verification before team deletion.
- `convex/teamDeletion/testHelpers.ts`: seeded complete-workspace fixture and residual-row assertions used only by tests.

### New frontend modules

- `src/components/billing/ConfirmTeamDowngradeDialog.tsx`: approved warning modal and actions.
- `src/components/billing/ConfirmTeamDowngradeDialog.test.tsx`: copy and behavior contract.
- `src/components/WorkspaceUnavailable.tsx`: minimal unavailable state and Personal redirect.
- `src/components/WorkspaceUnavailable.test.tsx`: stale-route recovery contract.

### Existing files modified

- `convex/schema.ts`: import the deletion table and add transient team deletion fields.
- `convex/convex.config.ts`: register `teamDeletionWorkpool`.
- `convex/stripe.ts`: delegate deleted subscriptions to the deletion request and return canceled without throwing.
- `convex/plans.ts`: resolve deleting/canceled teams as Free with canceled status.
- `convex/http.ts`: preserve the existing verified Stripe route and stable handler entrypoint.
- `convex/workosWebhook.ts`: join `organization.deleted` to the same cleanup lifecycle.
- `convex/authUtils.ts`: refuse a deleting organizational scope.
- `convex/teamAccess.ts`: expose unavailable instead of granting team access.
- `convex/chat/threads.ts`: reject new ingestion for deleting teams before any conversation/thread write.
- `convex/whatsappWebhook.ts`, `convex/instagramWebhook.ts`, `convex/messengerWebhook.ts`, `convex/webWidget.ts`, `convex/avatarConversation.ts`: acknowledge or return unavailable before persistence.
- `convex/broadcastPool.ts`, `convex/followUpPool.ts`, `convex/workflowReminderRuntime.ts`, `convex/workflowFollowUpRuntime.ts`, `convex/inboundMediaUnderstanding.ts`: no-op delayed work after deletion begins.
- `src/components/AdjustPlanDialog.tsx`: gate paid-team-to-Free portal navigation behind confirmation.
- `src/layouts/DashboardLayout.tsx`: show the unavailable state for stale deleted-agent routes.
- `CONTINUITY.md`: record verified implementation and deployment state.

Generated `convex/_generated/api.d.ts` changes only through Convex code generation.

---

### Task 1: Add the Team Deletion Lifecycle Model

**Files:**
- Create: `convex/teamDeletion/schema.ts`
- Create: `convex/teamDeletion/model.ts`
- Test: `convex/teamDeletionModel.test.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/convex.config.ts`

**Interfaces:**
- Produces: `teamDeletionStatusValidator`, `teamDeletionPhaseValidator`, `TeamDeletionPhase`, `isTeamDeleting(team)`, `nextTeamDeletionPhase(phase)`.
- Produces: `teamDeletionJobs` indexed by `teamId`, `workosOrgId`, and `stripeSubscriptionId`.
- Produces: `teamDeletionWorkpool` component registration for Task 2.

- [ ] **Step 1: Write the failing lifecycle test**

```ts
import { describe, expect, test } from "vitest";
import {
  isTeamDeleting,
  nextTeamDeletionPhase,
} from "./teamDeletion/model";

describe("team deletion lifecycle", () => {
  test("only the deleting state blocks workspace activity", () => {
    expect(isTeamDeleting({ deletionStatus: undefined })).toBe(false);
    expect(isTeamDeleting({ deletionStatus: "deleting" })).toBe(true);
  });

  test("advances through the complete ordered phase list", () => {
    expect(nextTeamDeletionPhase("stopWork")).toBe("disconnectChannels");
    expect(nextTeamDeletionPhase("disconnectChannels")).toBe("externalData");
    expect(nextTeamDeletionPhase("externalData")).toBe("localData");
    expect(nextTeamDeletionPhase("localData")).toBe("verify");
    expect(nextTeamDeletionPhase("verify")).toBe("deleteOrganization");
    expect(nextTeamDeletionPhase("deleteOrganization")).toBe("finalize");
    expect(nextTeamDeletionPhase("finalize")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the lifecycle test and verify RED**

Run:

```bash
/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/teamDeletionModel.test.ts'
```

Expected: FAIL because `convex/teamDeletion/model.ts` does not exist.

- [ ] **Step 3: Implement the lifecycle model**

```ts
export const TEAM_DELETION_PHASES = [
  "stopWork",
  "disconnectChannels",
  "externalData",
  "localData",
  "verify",
  "deleteOrganization",
  "finalize",
] as const;

export type TeamDeletionPhase = (typeof TEAM_DELETION_PHASES)[number];

export function isTeamDeleting(team: {
  deletionStatus?: "deleting";
}): boolean {
  return team.deletionStatus === "deleting";
}

export function nextTeamDeletionPhase(
  phase: TeamDeletionPhase,
): TeamDeletionPhase | null {
  const index = TEAM_DELETION_PHASES.indexOf(phase);
  return TEAM_DELETION_PHASES[index + 1] ?? null;
}
```

Define validators in `convex/teamDeletion/schema.ts` and export:

```ts
export const teamDeletionStatusValidator = v.literal("deleting");
export const teamDeletionPhaseValidator = v.union(
  v.literal("stopWork"),
  v.literal("disconnectChannels"),
  v.literal("externalData"),
  v.literal("localData"),
  v.literal("verify"),
  v.literal("deleteOrganization"),
  v.literal("finalize"),
);
```

Define `teamDeletionJobsTable` with:

```ts
{
  teamId: v.id("teams"),
  workosOrgId: v.string(),
  stripeSubscriptionId: v.optional(v.string()),
  source: v.union(v.literal("stripe"), v.literal("workos")),
  phase: teamDeletionPhaseValidator,
  cursor: v.optional(v.string()),
  workId: v.optional(v.string()),
  lastError: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
}
```

Add `deletionStatus` and `deletionStartedAt` to `teams`, import `teamDeletionJobsTable` into `convex/schema.ts`, and register `teamDeletionWorkpool` in `convex/convex.config.ts`.

- [ ] **Step 4: Run the lifecycle test and verify GREEN**

Run:

```bash
/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/teamDeletionModel.test.ts'
```

Expected: PASS.

- [ ] **Step 5: Generate Convex API types**

Run:

```bash
/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen'
```

Expected: code generation succeeds and adds the nested `teamDeletion/*` APIs.

- [ ] **Step 6: Commit the lifecycle model**

```bash
git add convex/teamDeletion/schema.ts convex/teamDeletion/model.ts convex/teamDeletionModel.test.ts convex/schema.ts convex/convex.config.ts convex/_generated/api.d.ts
git commit -m "Add team deletion lifecycle model"
```

---

### Task 2: Resolve Canceled Teams Without Throwing and Request Cleanup Once

**Files:**
- Create: `convex/teamDeletion/pool.ts`
- Create: `convex/teamDeletion/request.ts`
- Test: `convex/teamSubscriptionDeletion.test.ts`
- Modify: `convex/stripe.ts`
- Modify: `convex/plans.ts`
- Modify: `convex/http.ts`

**Interfaces:**
- Consumes: `isTeamDeleting`, `teamDeletionJobs`, `teamDeletionWorkpool`.
- Produces: `requestTeamDeletion(ctx, { workosOrgId, stripeSubscriptionId, source })`.
- Produces: `internal.teamDeletion.request.fromStripe` and `internal.teamDeletion.request.fromWorkos`.
- Produces: plan result `{ plan: "free", status: "canceled" }` for canceled/deleting teams.

- [ ] **Step 1: Write failing Convex tests for canceled resolution and idempotent request**

Seed an owner, Personal team, paid organizational team, membership, and active team. Assert:

```ts
const first = await t.mutation(internal.teamDeletion.request.fromStripe, {
  workosOrgId: "org_team",
  stripeSubscriptionId: "sub_team",
});
const second = await t.mutation(internal.teamDeletion.request.fromStripe, {
  workosOrgId: "org_team",
  stripeSubscriptionId: "sub_team",
});

expect(first).toEqual({ accepted: true, duplicate: false });
expect(second).toEqual({ accepted: true, duplicate: true });
expect((await t.run((ctx) => ctx.db.get(teamId)))?.deletionStatus).toBe("deleting");
expect((await t.run((ctx) => ctx.db.get(ownerId)))?.activeTeamId).toBe(personalTeamId);
expect(await countDeletionJobs(t, teamId)).toBe(1);
```

Add a direct helper test showing a deleting team resolves:

```ts
expect(await resolveDeletingTeamPlan(team)).toEqual({
  plan: "free",
  status: "canceled",
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/teamSubscriptionDeletion.test.ts'
```

Expected: FAIL because the request functions and canceled plan behavior are absent.

- [ ] **Step 3: Implement the dedicated pool and request transaction**

In `convex/teamDeletion/pool.ts`:

```ts
export const teamDeletionPool = new Workpool(
  components.teamDeletionWorkpool,
  {
    maxParallelism: 1,
    retryActionsByDefault: true,
  },
);
```

In `requestTeamDeletion`:

1. Resolve the team by `workosOrgId`.
2. Return `{ accepted: true, duplicate: true }` if missing or already deleting.
3. Patch `deletionStatus: "deleting"` and `deletionStartedAt`.
4. Clear owner and team subscription fields and set owner status to `canceled`.
5. Page through memberships and move currently active users to their Personal teams.
6. Insert one `teamDeletionJobs` row at phase `stopWork`.
7. Enqueue `internal.teamDeletion.worker.run` with `{ retry: true }`.
8. Store the returned `workId`.

Keep the exported helper signature:

```ts
export async function requestTeamDeletion(
  ctx: MutationCtx,
  args: {
    workosOrgId: string;
    stripeSubscriptionId?: string;
    source: "stripe" | "workos";
  },
): Promise<{ accepted: true; duplicate: boolean }>;
```

- [ ] **Step 4: Delegate the stable Stripe entrypoint**

Keep `handleSubscriptionDeletedInternal` public shape stable and replace its body with:

```ts
return await requestTeamDeletion(ctx, {
  workosOrgId: args.orgId,
  stripeSubscriptionId: args.stripeSubscriptionId,
  source: "stripe",
});
```

Keep the verified route in `convex/http.ts` calling this entrypoint.

- [ ] **Step 5: Return canceled instead of throwing**

Extract a pure resolver in `convex/plans.ts`:

```ts
export function resolveDeletingTeamPlan(team: {
  deletionStatus?: "deleting";
}) {
  if (team.deletionStatus === "deleting") {
    return { plan: "free" as const, status: "canceled" as const };
  }
  return null;
}
```

Use it before reading `team.stripeSubscriptionId`. When a team has no subscription and the owner status is canceled, return Free/canceled. Continue throwing for an active subscription with an unknown price ID.

- [ ] **Step 6: Run the focused test and verify GREEN**

Run:

```bash
/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/teamSubscriptionDeletion.test.ts'
```

Expected: PASS with one deletion job and no inactive-subscription exception.

- [ ] **Step 7: Commit subscription handling**

```bash
git add convex/teamDeletion/pool.ts convex/teamDeletion/request.ts convex/teamSubscriptionDeletion.test.ts convex/stripe.ts convex/plans.ts convex/http.ts
git commit -m "Queue cleanup for canceled team subscriptions"
```

---

### Task 3: Block New Workspace Activity and Converge WorkOS Deletion

**Files:**
- Create: `convex/teamDeletion/access.ts`
- Test: `convex/teamDeletionAccess.test.ts`
- Modify: `convex/authUtils.ts`
- Modify: `convex/teamAccess.ts`
- Modify: `convex/workosWebhook.ts`
- Modify: `convex/chat/threads.ts`
- Modify: `convex/whatsappWebhook.ts`
- Modify: `convex/instagramWebhook.ts`
- Modify: `convex/messengerWebhook.ts`
- Modify: `convex/webWidget.ts`
- Modify: `convex/avatarConversation.ts`
- Modify: `convex/broadcastPool.ts`
- Modify: `convex/followUpPool.ts`
- Modify: `convex/workflowReminderRuntime.ts`
- Modify: `convex/workflowFollowUpRuntime.ts`
- Modify: `convex/inboundMediaUnderstanding.ts`

**Interfaces:**
- Consumes: transient team `deletionStatus`.
- Produces: `getWorkspaceAvailability(ctx, orgId)` returning `"active" | "deleting" | "missing" | "personal"`.
- Produces: `canProcessWorkspaceActivity(ctx, orgId): Promise<boolean>`.

- [ ] **Step 1: Write failing access-boundary tests**

Seed an active and deleting team. Assert:

```ts
expect(await getWorkspaceAvailability(ctx, "")).toBe("personal");
expect(await getWorkspaceAvailability(ctx, "org_active")).toBe("active");
expect(await getWorkspaceAvailability(ctx, "org_deleting")).toBe("deleting");
expect(await getWorkspaceAvailability(ctx, "org_missing")).toBe("missing");
```

Add source-contract assertions that every listed ingestion and delayed-worker entrypoint calls `canProcessWorkspaceActivity` before its first insert, enqueue, or provider send.

- [ ] **Step 2: Run the access tests and verify RED**

Run:

```bash
/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/teamDeletionAccess.test.ts'
```

Expected: FAIL because the shared availability helper and gates do not exist.

- [ ] **Step 3: Implement the shared availability helper**

```ts
export async function getWorkspaceAvailability(
  ctx: QueryCtx | MutationCtx,
  orgId: string,
): Promise<"active" | "deleting" | "missing" | "personal"> {
  if (!orgId) return "personal";
  const team = await getTeamByWorkosOrgId(ctx, orgId);
  if (!team) return "missing";
  return team.deletionStatus === "deleting" ? "deleting" : "active";
}

export async function canProcessWorkspaceActivity(
  ctx: QueryCtx | MutationCtx,
  orgId: string,
): Promise<boolean> {
  const availability = await getWorkspaceAvailability(ctx, orgId);
  return availability === "active" || availability === "personal";
}
```

- [ ] **Step 4: Gate authenticated and public boundaries**

Use the helper in:

- `authUtils` and `teamAccess` to refuse deleting team scope.
- `chat/threads` before creating a conversation or Agent thread.
- Meta webhook mutations before persistence; return acknowledged/skipped.
- Web widget and avatar public entrypoints; return unavailable.
- Broadcast, follow-up, reminder, workflow follow-up, and inbound-media workers before provider calls.

Every worker returns a typed skipped result such as:

```ts
return { skipped: true, reason: "workspace_unavailable" };
```

- [ ] **Step 5: Route WorkOS organization deletion into the same job**

Replace direct membership/team deletion in `workosWebhook.ts` with:

```ts
await requestTeamDeletion(ctx, {
  workosOrgId,
  source: "workos",
});
```

When a Stripe deletion job already exists, the WorkOS event returns duplicate success and does not remove the team early.

- [ ] **Step 6: Run the access tests and verify GREEN**

Run:

```bash
/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/teamDeletionAccess.test.ts'
```

Expected: PASS and all source contracts find the guard before side effects.

- [ ] **Step 7: Commit activity isolation**

```bash
git add convex/teamDeletion/access.ts convex/teamDeletionAccess.test.ts convex/authUtils.ts convex/teamAccess.ts convex/workosWebhook.ts convex/chat/threads.ts convex/whatsappWebhook.ts convex/instagramWebhook.ts convex/messengerWebhook.ts convex/webWidget.ts convex/avatarConversation.ts convex/broadcastPool.ts convex/followUpPool.ts convex/workflowReminderRuntime.ts convex/workflowFollowUpRuntime.ts convex/inboundMediaUnderstanding.ts
git commit -m "Block activity for deleting team workspaces"
```

---

### Task 4: Build the External Cleanup Coordinator

**Files:**
- Create: `convex/teamDeletion/worker.ts`
- Create: `convex/teamDeletion/external.ts`
- Test: `convex/teamDeletionExternal.test.ts`
- Modify: `convex/channels.ts`
- Modify: `convex/workosOrganizationActions.ts`

**Interfaces:**
- Consumes: `teamDeletionJobs`, `nextTeamDeletionPhase`, existing Agent/R2/Cloudflare/channel clients.
- Produces: `internal.teamDeletion.worker.run({ jobId })`.
- Produces: `deleteExternalPage(ctx, job): Promise<{ done: boolean; cursor?: string }>` and idempotent provider helpers.

- [ ] **Step 1: Write failing external-order and retry tests**

Seed two channels, two conversations with Agent thread IDs, R2/storage references, and Cloudflare item IDs. Stub external clients and assert:

```ts
expect(calls).toEqual([
  "disable:channel-a",
  "disconnect:channel-a",
  "disable:channel-b",
  "disconnect:channel-b",
  "delete-thread:thread-a",
  "delete-thread:thread-b",
  "delete-storage",
  "delete-cloudflare",
]);
```

Inject a failure after the first thread, rerun the worker, and assert the first completed resource is not recreated or treated as an error.

- [ ] **Step 2: Run the external test and verify RED**

Run:

```bash
/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/teamDeletionExternal.test.ts'
```

Expected: FAIL because the coordinator and external phase helpers do not exist.

- [ ] **Step 3: Implement the phase-only coordinator**

`worker.run` must:

```ts
const job = await ctx.runQuery(internal.teamDeletion.worker.getJob, {
  jobId: args.jobId,
});
if (!job) return { completed: true };

const result = await runTeamDeletionPhase(ctx, job);
await ctx.runMutation(internal.teamDeletion.worker.recordPhaseResult, {
  jobId: job._id,
  phase: job.phase,
  cursor: result.cursor,
  done: result.done,
});
return { completed: result.done && job.phase === "finalize" };
```

When a page completes but the job is not final, enqueue the same worker with the next phase. When a page is incomplete, enqueue it with the updated cursor.

- [ ] **Step 4: Implement safe external cleanup**

`external.ts` performs:

- local channel disable before provider calls;
- provider unsubscribe/disconnect while tokens still exist;
- Agent `deleteThreadAsync` using captured conversation `threadId`;
- R2 and Convex storage deletion using existing media helpers;
- Cloudflare item deletion using existing `cfItemId` paths.

Use bounded pages of at most 50 identifiers. Treat not-found as success; rethrow authentication, rate-limit, and network failures so Workpool retries.

- [ ] **Step 5: Add WorkOS deletion as the penultimate external action**

Export an internal-only helper:

```ts
export async function deleteWorkosOrganization(
  workosOrgId: string,
): Promise<void>;
```

It calls `workos.organizations.deleteOrganization(workosOrgId)` and treats provider not-found as success. It runs only in `deleteOrganization`, after residual workspace data verification.

- [ ] **Step 6: Run the external tests and verify GREEN**

Run:

```bash
/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/teamDeletionExternal.test.ts'
```

Expected: PASS with safe ordering and successful retry.

- [ ] **Step 7: Commit external cleanup**

```bash
git add convex/teamDeletion/worker.ts convex/teamDeletion/external.ts convex/teamDeletionExternal.test.ts convex/channels.ts convex/workosOrganizationActions.ts
git commit -m "Delete external resources for canceled teams"
```

---

### Task 5: Implement and Verify the Complete Local Deletion Manifest

**Files:**
- Create: `convex/teamDeletion/manifest.ts`
- Create: `convex/teamDeletion/local.ts`
- Create: `convex/teamDeletion/verify.ts`
- Create: `convex/teamDeletion/testHelpers.ts`
- Test: `convex/teamDeletionCascade.test.ts`
- Modify: `convex/schema.ts`

**Interfaces:**
- Consumes: team, org, agent, channel, customer, conversation, and workflow ownership paths.
- Produces: `TEAM_DELETION_MANIFEST`, `deleteLocalPage`, `findDeletionResidue`, `finalizeTeamDeletion`.

- [ ] **Step 1: Write the seeded full-cascade test**

Create a fixture that seeds one row from every manifest family:

- agents and all knowledge/workflow descendants;
- channels and connection/sync/template/widget/avatar descendants;
- customers, conversations, Agent thread IDs, messages, media, topics, facts, projections, metrics, logs, and agent-overview rows;
- lead routing, appointments, calendar, quick replies, broadcasts, follow-ups, imports, usage, workspace logs, setup, invitations, and memberships;
- one Personal workspace row and one unrelated team row as controls.

After running all local phases, assert:

```ts
expect(await findDeletionResidue(ctx, target)).toEqual([]);
expect(await findDeletionResidue(ctx, personalControl)).not.toEqual([]);
expect(await findDeletionResidue(ctx, otherTeamControl)).not.toEqual([]);
expect(await ctx.db.get(target.teamId)).toBeNull();
expect(await ctx.db.get(target.jobId)).toBeNull();
```

- [ ] **Step 2: Run the cascade test and verify RED**

Run:

```bash
/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/teamDeletionCascade.test.ts'
```

Expected: FAIL with seeded residue because no manifest-driven cascade exists.

- [ ] **Step 3: Define the explicit manifest**

Each manifest entry contains:

```ts
export type TeamDeletionManifestEntry = {
  key: string;
  table: TableNamesInDataModel;
  ownership:
    | { kind: "orgId"; index: string }
    | { kind: "teamId"; index: string }
    | { kind: "agentId"; index: string }
    | { kind: "channelId"; index: string }
    | { kind: "conversationId"; index: string }
    | { kind: "workflowId"; index: string }
    | { kind: "customerId"; index: string };
  phase: number;
};
```

Populate it with every team-owned table identified in the design spec. Add missing ownership indexes in `convex/schema.ts`; never use an unbounded `.collect()` or `.filter()`.

The manifest must contain these exact current table groups:

```ts
export const DIRECT_ORG_TABLES = [
  "workspaceSetupChecklistStates",
  "agents",
  "workflows",
  "textEntries",
  "fileEntries",
  "webEntries",
  "qaEntries",
  "channels",
  "webWidgetSettings",
  "avatarConfigurations",
  "whatsappSyncRequests",
  "whatsappAccountUpdates",
  "whatsappConnectionAttempts",
  "whatsappHistorySyncBatches",
  "whatsappHistoryIngestThreads",
  "whatsappHistoryIngestMessages",
  "customers",
  "conversations",
  "messages",
  "agentOverviewDailyConversationFacts",
  "agentOverviewHumanEscalationFacts",
  "conversationAnalyticsFacts",
  "analyticsMetricEntries",
  "conversationTopics",
  "conversationTopicAssignments",
  "oauthSessions",
  "mediaUploads",
  "creditLogs",
  "creditUsageEvents",
  "whatsappBroadcastSchedules",
  "whatsappBroadcastRecipients",
  "followUpRules",
  "followUpSends",
  "conversationLogs",
  "whatsappTemplates",
  "whatsappTemplateMediaAssets",
  "customerImports",
  "customerImportJobs",
] as const satisfies readonly TableNames[];

export const TEAM_ID_TABLES = [
  "quickReplies",
  "calendarEvents",
  "calendarEventParticipants",
  "teamMemberships",
] as const satisfies readonly TableNames[];

export const WORKOS_ORG_TABLES = [
  "teamInvitationRecords",
] as const satisfies readonly TableNames[];

export const AGENT_DESCENDANT_TABLES = [
  "leadAssignmentSettings",
  "userSchedules",
  "appointmentServices",
  "appointmentBookingSessions",
  "rawAgentUsage",
] as const satisfies readonly TableNames[];

export const WORKFLOW_DESCENDANT_TABLES = [
  "workflowAutomationRuns",
  "workflowAutomationCostTotals",
  "workflowAutomationOperations",
  "workflowFollowUpTimers",
  "workflowTemplateUsage",
  "workflowTemplateUsageTotals",
  "workflowNodes",
  "workflowEdges",
] as const satisfies readonly TableNames[];

export const CONVERSATION_DESCENDANT_TABLES = [
  "inboundMediaBatches",
  "conversationAnalyticsRefreshRequests",
  "conversationAnalyticsDirtyRequests",
  "conversationAnalyticsProjectionStates",
] as const satisfies readonly TableNames[];

export const SECOND_LEVEL_TABLES = [
  "avatarSessions",
  "avatarEvents",
  "inboundMediaBatchItems",
  "userShifts",
  "userTimeOff",
  "customerImportRows",
] as const satisfies readonly TableNames[];
```

Import `TableNames` from `convex/_generated/dataModel`. Keep these account-owned tables explicitly excluded and assert their preservation in tests:

```ts
export const ACCOUNT_OWNED_TABLES = [
  "users",
  "userCreditPeriods",
  "topUpEntries",
  "referralCodes",
  "referralRedemptions",
  "processedStripePayments",
] as const satisfies readonly TableNames[];
```

Global operational tables `processedEvents`, `contactRequests`, and `adminSessions` are neither team data nor deletion targets.

- [ ] **Step 4: Implement bounded deletion**

`deleteLocalPage` deletes at most 100 rows from one manifest entry and returns:

```ts
type DeleteLocalPageResult = {
  done: boolean;
  nextManifestIndex: number;
};
```

The job cursor stores the manifest index. Child phases precede parents. Embedded data disappears with its parent document and is named in the manifest entry description.

- [ ] **Step 5: Implement residual verification and finalization**

`findDeletionResidue` reads at most one row per manifest entry and returns exact manifest keys. It also verifies no Agent component thread, R2/storage object, usable channel token, or pending known work ID remains.

`finalizeTeamDeletion`:

1. confirms residue is empty;
2. moves any remaining active user to Personal;
3. deletes invitations and memberships;
4. deletes the team;
5. deletes the deletion job.

If residue exists, throw:

```ts
throw new Error(
  `Team deletion verification failed: ${residue.join(", ")}`,
);
```

- [ ] **Step 6: Run the cascade test and verify GREEN**

Run:

```bash
/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/teamDeletionCascade.test.ts'
```

Expected: PASS, with all target residue absent and both controls intact.

- [ ] **Step 7: Commit the local cascade**

```bash
git add convex/teamDeletion/manifest.ts convex/teamDeletion/local.ts convex/teamDeletion/verify.ts convex/teamDeletion/testHelpers.ts convex/teamDeletionCascade.test.ts convex/schema.ts
git commit -m "Purge all canceled team workspace data"
```

---

### Task 6: Add the Destructive Downgrade Confirmation

**Files:**
- Create: `src/components/billing/ConfirmTeamDowngradeDialog.tsx`
- Create: `src/components/billing/ConfirmTeamDowngradeDialog.test.tsx`
- Modify: `src/components/AdjustPlanDialog.tsx`

**Interfaces:**
- Consumes: `planAndUsage.isTeam`, existing `handlePortal`.
- Produces: `ConfirmTeamDowngradeDialog` props `{ open, onOpenChange, onConfirm, loading }`.

- [ ] **Step 1: Write the failing modal contract test**

```ts
expect(source).toContain("Confirm downgrade");
expect(source).toContain("Your conversations will be deleted");
expect(source).toContain("Your workspace data will be cleared");
expect(source).toContain("Your channels will be disconnected");
expect(source).toContain("Confirm downgrade");
expect(source).toContain("Go back");
```

Add a component behavior test asserting `Go back` closes without calling `onConfirm`, while `Confirm downgrade` calls it once.

- [ ] **Step 2: Run the UI test and verify RED**

Run:

```bash
/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/billing/ConfirmTeamDowngradeDialog.test.tsx'
```

Expected: FAIL because the dialog does not exist.

- [ ] **Step 3: Implement the focused dialog**

Use three icon rows with `MessageSquareOff`, `Trash2`, and `Unplug`. Render the approved copy exactly. Keep `Go back` as a text-style button and `Confirm downgrade` destructive.

```ts
type ConfirmTeamDowngradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
};
```

- [ ] **Step 4: Gate portal navigation in `AdjustPlanDialog`**

For a Free target:

```ts
if (planAndUsage.isTeam) {
  setConfirmDowngradeOpen(true);
  return;
}
await handlePortal();
```

The dialog confirmation calls `handlePortal`; opening or closing the dialog never mutates billing or workspace data.

- [ ] **Step 5: Run the UI test and verify GREEN**

Run:

```bash
/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/billing/ConfirmTeamDowngradeDialog.test.tsx'
```

Expected: PASS.

- [ ] **Step 6: Commit the confirmation UI**

```bash
git add src/components/billing/ConfirmTeamDowngradeDialog.tsx src/components/billing/ConfirmTeamDowngradeDialog.test.tsx src/components/AdjustPlanDialog.tsx
git commit -m "Warn before deleting a downgraded team"
```

---

### Task 7: Add the Minimal Unavailable State

**Files:**
- Create: `src/components/WorkspaceUnavailable.tsx`
- Create: `src/components/WorkspaceUnavailable.test.tsx`
- Modify: `src/layouts/DashboardLayout.tsx`

**Interfaces:**
- Produces: `WorkspaceUnavailable({ onBackToPersonal })`.
- Consumes: `useActiveTeam`, React Router navigation.

- [ ] **Step 1: Write the failing unavailable-state test**

```ts
expect(source).toContain("Workspace no longer available");
expect(source).toContain("Back to Personal");
expect(source).not.toContain("Contact support");
```

Add a behavior test that clicks `Back to Personal` and asserts the Personal switch runs before navigation to `/workspace`.

- [ ] **Step 2: Run the UI test and verify RED**

Run:

```bash
/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WorkspaceUnavailable.test.tsx'
```

Expected: FAIL because the component does not exist and stale agent routes redirect silently.

- [ ] **Step 3: Implement the minimal state**

```tsx
export function WorkspaceUnavailable({
  onBackToPersonal,
}: {
  onBackToPersonal: () => Promise<void>;
}) {
  return (
    <Dialog open>
      <DialogContent showCloseButton={false}>
        <DialogTitle>Workspace no longer available</DialogTitle>
        <Button onClick={() => void onBackToPersonal()}>
          Back to Personal
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

Do not add body copy or secondary actions.

- [ ] **Step 4: Replace the stale-agent redirect**

When `api.agents.get` returns `null`, render `WorkspaceUnavailable`. Its action finds the Personal team, switches if necessary, and navigates to `/workspace` with `replace: true`.

- [ ] **Step 5: Run the UI test and verify GREEN**

Run:

```bash
/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WorkspaceUnavailable.test.tsx'
```

Expected: PASS with only the approved title and action.

- [ ] **Step 6: Commit the unavailable state**

```bash
git add src/components/WorkspaceUnavailable.tsx src/components/WorkspaceUnavailable.test.tsx src/layouts/DashboardLayout.tsx
git commit -m "Show unavailable state for deleted teams"
```

---

### Task 8: Run the End-to-End Deletion Rehearsal and Final Verification

**Files:**
- Create: `convex/teamSubscriptionDeletion.integration.test.ts`
- Modify: `CONTINUITY.md`
- Modify only when production availability is confirmed: `kilobot-docs/docs/releases/changelog.mdx`

**Interfaces:**
- Consumes: complete webhook, isolation, coordinator, external cleanup stubs, manifest, and UI behavior.
- Produces: a single regression proving target deletion and control preservation.

- [ ] **Step 1: Write the end-to-end webhook regression test**

Seed the full fixture, invoke the same internal function used by the Stripe route, drain scheduled Workpool functions, and assert:

```ts
expect(await getTeamByOrgId(t, "org_deleted")).toBeNull();
expect(await countMemberships(t, deletedTeamId)).toBe(0);
expect(await findAnyWorkspaceRows(t, "org_deleted")).toEqual([]);
expect(await getActiveTeamId(t, ownerId)).toBe(personalTeamId);
expect(await getTeamByOrgId(t, "org_control")).not.toBeNull();
expect(await getPersonalConversation(t, ownerId)).not.toBeNull();
```

Deliver the same Stripe event again and assert it returns success without creating a job or changing controls.

- [ ] **Step 2: Run the end-to-end regression test**

Run:

```bash
/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/teamSubscriptionDeletion.integration.test.ts'
```

Expected: PASS. If it fails because a seeded target row remains, add that exact table to the manifest ownership group shown in Task 5, add its bounded index or parent traversal, and rerun without weakening the assertion.

- [ ] **Step 3: Close any exact manifest gap reported by the test**

For each reported manifest key, add the table to the matching exact group in `TEAM_DELETION_MANIFEST`, add the corresponding fixture row and preservation control, then rerun Step 2. Do not add a generic catch-all scan.

- [ ] **Step 4: Run all focused tests**

Run:

```bash
/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/teamDeletionModel.test.ts convex/teamSubscriptionDeletion.test.ts convex/teamDeletionAccess.test.ts convex/teamDeletionExternal.test.ts convex/teamDeletionCascade.test.ts convex/teamSubscriptionDeletion.integration.test.ts src/components/billing/ConfirmTeamDowngradeDialog.test.tsx src/components/WorkspaceUnavailable.test.tsx'
```

Expected: all focused tests PASS with no warnings or unhandled rejections.

- [ ] **Step 5: Run proportional project verification**

Run:

```bash
/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen && bunx vitest run'
```

Expected: Convex code generation and the complete Vitest suite PASS.

Run the large-task build check:

```bash
/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bun run build'
```

Expected: TypeScript and Vite build PASS.

- [ ] **Step 6: Verify repository and module constraints**

Run:

```bash
git diff --check
find convex/teamDeletion src/components/billing -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 | xargs -0 wc -l
git status --short
```

Expected: no whitespace errors; every new code file is at most 300 lines; only intended files are changed.

- [ ] **Step 7: Update continuity and assess the changelog**

Record the verified behavior, tests, deployment state, and working set in `CONTINUITY.md`. Do not add a public changelog entry unless production availability has been confirmed.

- [ ] **Step 8: Commit integration and verification**

```bash
git add convex/teamSubscriptionDeletion.integration.test.ts CONTINUITY.md
git commit -m "Verify canceled team workspace cleanup"
```
