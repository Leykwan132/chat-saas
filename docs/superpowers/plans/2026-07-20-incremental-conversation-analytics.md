# Incremental Conversation Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the live 500-message read and 200-row delete/reinsert rebuild with a 15-minute dirty-conversation queue that applies idempotent v2 contributions to the existing Convex aggregate.

**Architecture:** `analyticsMetricEntries` remains the source table for `analyticsMetrics`, while v2 uses deterministic source keys and versioned namespaces so individual contributions can be inserted, patched, removed, or left unchanged. Canonical writers only upsert one revisioned dirty row per conversation; a 15-minute dispatcher coalesces bursts and runs cursor-paged message projection plus bounded conversation/topic reconciliation. Rollout is widen-and-dual-write, bounded backfill and parity verification, explicit cutover, then delayed cleanup.

**Tech Stack:** Convex 1.36, `@convex-dev/aggregate` 0.2.1, `@convex-dev/migrations` 0.3.5, TypeScript 6, Vitest 1.6, `convex-test`.

## Global Constraints

- Use Node v22 for every script or test command by running `source ~/.nvm/nvm.sh && nvm use 22` in the same shell.
- Read `convex/_generated/ai/guidelines.md` before editing Convex code.
- Keep every new production code module at or below 300 lines. Do not grow existing oversized callsite modules; additions go into focused new modules and callsite edits remain import/replacement-only. Split `convex/analytics.ts` during legacy cleanup.
- Do not add default fallbacks, empty catches, or silent v1 rebuild fallback.
- Do not add comments unless a non-obvious workaround cannot be expressed through names and structure.
- Keep `api.analytics.*` public query names and existing channel ingestion entrypoints stable.
- Keep `analyticsMetrics` and its existing `analyticsMetricEntries` trigger unchanged.
- Prefix every v2 namespace and source key with `v2:`.
- Never embed mutable service, channel, or member values in v2 source keys.
- Canonical message and state mutations only upsert dirty state and must never wait for analytics computation.
- The dispatcher runs every 15 minutes, selects at most 25 requests per mutation, and advances selected requests by a 15-minute retry lease.
- Message projection reads cursor pages of exactly 50; page size is a transaction boundary, never a correctness cap.
- New activity must not postpone an existing request's `nextAttemptAt`.
- A normal live projection performs work in bounded pages independent of total conversation length.
- All v2 `analyticsMetricEntries` writers use the trigger-wrapped `internalMutation` from `convex/triggers.ts`.
- The live v2 path must contain no `MESSAGE_ANALYTICS_LIMIT`, `.take(500)`, `.take(200)`, or delete-all/reinsert-all helper.
- Production dry runs, production migrations, dashboard cutover, and v1 deletion require explicit approval and are not run automatically.

---

## Phase A: Widen, Project, and Dual Write

### Task 1: Versioned Metric Model and Projection Schema

**Files:**
- Create: `convex/analyticsMetricModel.ts`
- Create: `convex/analyticsMetricModel.test.ts`
- Modify: `convex/schema.ts:972-1021`
- Modify: `convex/analytics.ts:26-28,119-139`

**Interfaces:**
- Produces: `AnalyticsMetric`, `ConversationService`, `AnalyticsMetricVersion`.
- Produces: `teamAnalyticsNamespace`, `memberAnalyticsNamespace`, `serviceAnalyticsNamespace`, `channelAnalyticsNamespace`, `topicAnalyticsNamespace`.
- Produces: `v2ConversationSourceKey`, `v2MessageSourceKey`, and `V2_SOURCE_PREFIX`.
- Produces schema table `conversationAnalyticsDirtyRequests`, indexed by `conversationId` and `nextAttemptAt`.
- Produces schema table `conversationAnalyticsProjectionStates`, uniquely indexed by `conversationId`.
- Produces index `analyticsMetricEntries.by_sourceConversationId_and_metric_and_sourceKey`.

- [ ] **Step 1: Write namespace and source-key tests**

Create `convex/analyticsMetricModel.test.ts`:

```ts
import { expect, test } from "vitest";
import {
  channelAnalyticsNamespace,
  memberAnalyticsNamespace,
  serviceAnalyticsNamespace,
  teamAnalyticsNamespace,
  topicAnalyticsNamespace,
  v2ConversationSourceKey,
  v2MessageSourceKey,
} from "./analyticsMetricModel";

test("v1 namespaces preserve the current dashboard keys", () => {
  expect(teamAnalyticsNamespace("v1", "org-1", "conversationCount")).toBe(
    "team:org-1:metric:conversationCount",
  );
  expect(
    memberAnalyticsNamespace("v1", "org-1", "user-1", "messageSentCount"),
  ).toBe("member:org-1:user-1:metric:messageSentCount");
  expect(
    serviceAnalyticsNamespace(
      "v1",
      "org-1",
      "whatsapp",
      "channelConversationCount",
    ),
  ).toBe("channel:org-1:service:whatsapp:metric:channelConversationCount");
  expect(
    channelAnalyticsNamespace(
      "v1",
      "org-1",
      "channel-1",
      "channelConvertedCount",
    ),
  ).toBe("channel:org-1:id:channel-1:metric:channelConvertedCount");
  expect(topicAnalyticsNamespace("v1", "org-1", "topic-1")).toBe(
    "topic:org-1:topic-1:metric:topicMentionCount",
  );
});

test("v2 namespaces are isolated and source keys omit mutable dimensions", () => {
  expect(teamAnalyticsNamespace("v2", "org-1", "conversationCount")).toBe(
    "v2:team:org-1:metric:conversationCount",
  );
  expect(
    v2ConversationSourceKey("conversation-1", "member:convertedCount"),
  ).toBe("v2:conversation:conversation-1:member:convertedCount");
  expect(v2MessageSourceKey("message-1", "member:messageSentCount")).toBe(
    "v2:message:message-1:member:messageSentCount",
  );
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsMetricModel.test.ts
```

Expected: FAIL because `convex/analyticsMetricModel.ts` does not exist.

- [ ] **Step 3: Add the shared metric model**

Create `convex/analyticsMetricModel.ts` with these exports and exact namespace rules:

```ts
import type { Doc, Id } from "./_generated/dataModel";

export type AnalyticsMetric = Doc<"analyticsMetricEntries">["metric"];
export type ConversationService = Doc<"conversations">["service"];
export type AnalyticsMetricVersion = "v1" | "v2";

export const V2_SOURCE_PREFIX = "v2:";

function namespacePrefix(version: AnalyticsMetricVersion): string {
  return version === "v2" ? "v2:" : "";
}

export function teamAnalyticsNamespace(
  version: AnalyticsMetricVersion,
  orgId: string,
  metric: AnalyticsMetric,
): string {
  return `${namespacePrefix(version)}team:${orgId}:metric:${metric}`;
}

export function memberAnalyticsNamespace(
  version: AnalyticsMetricVersion,
  orgId: string,
  memberUserId: string,
  metric: AnalyticsMetric,
): string {
  return `${namespacePrefix(version)}member:${orgId}:${memberUserId}:metric:${metric}`;
}

export function serviceAnalyticsNamespace(
  version: AnalyticsMetricVersion,
  orgId: string,
  service: ConversationService,
  metric: AnalyticsMetric,
): string {
  return `${namespacePrefix(version)}channel:${orgId}:service:${service}:metric:${metric}`;
}

export function channelAnalyticsNamespace(
  version: AnalyticsMetricVersion,
  orgId: string,
  channelId: Id<"channels"> | string,
  metric: AnalyticsMetric,
): string {
  return `${namespacePrefix(version)}channel:${orgId}:id:${channelId}:metric:${metric}`;
}

export function topicAnalyticsNamespace(
  version: AnalyticsMetricVersion,
  orgId: string,
  topicId: Id<"conversationTopics"> | string,
): string {
  return `${namespacePrefix(version)}topic:${orgId}:${topicId}:metric:topicMentionCount`;
}

export function v2ConversationSourceKey(
  conversationId: Id<"conversations"> | string,
  role: string,
): string {
  return `v2:conversation:${conversationId}:${role}`;
}

export function v2MessageSourceKey(
  messageId: Id<"messages"> | string,
  role: string,
): string {
  return `v2:message:${messageId}:${role}`;
}
```

- [ ] **Step 4: Widen the schema**

Add this table immediately after `conversationAnalyticsRefreshRequests` in `convex/schema.ts`:

```ts
  conversationAnalyticsDirtyRequests: defineTable({
    conversationId: v.id("conversations"),
    revision: v.number(),
    requestedAt: v.number(),
    nextAttemptAt: v.number(),
    earliestDirtyMessageAt: v.optional(v.number()),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_nextAttemptAt", ["nextAttemptAt"]),
  conversationAnalyticsProjectionStates: defineTable({
    conversationId: v.id("conversations"),
    firstCustomerMessageAt: v.optional(v.number()),
    firstOutgoingAt: v.optional(v.number()),
    firstHumanOutgoingAt: v.optional(v.number()),
    firstHumanMessageId: v.optional(v.id("messages")),
    firstHumanMemberUserId: v.optional(v.string()),
    convertedAt: v.optional(v.number()),
    droppedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_conversationId", ["conversationId"]),
```

Add this index to `analyticsMetricEntries`:

```ts
    .index("by_sourceConversationId_and_metric_and_sourceKey", [
      "sourceConversationId",
      "metric",
      "sourceKey",
    ])
```

- [ ] **Step 5: Make v1 use the shared model without changing results**

In `convex/analytics.ts`, remove the five local namespace functions and import the shared functions. Keep v1 explicit:

```ts
const DASHBOARD_ANALYTICS_VERSION = "v1" as const;

const teamNamespace = (orgId: string, metric: AnalyticsMetric) =>
  teamAnalyticsNamespace(DASHBOARD_ANALYTICS_VERSION, orgId, metric);
const memberNamespace = (
  orgId: string,
  memberUserId: string,
  metric: AnalyticsMetric,
) =>
  memberAnalyticsNamespace(
    DASHBOARD_ANALYTICS_VERSION,
    orgId,
    memberUserId,
    metric,
  );
const serviceNamespace = (
  orgId: string,
  service: ConversationService,
  metric: AnalyticsMetric,
) =>
  serviceAnalyticsNamespace(
    DASHBOARD_ANALYTICS_VERSION,
    orgId,
    service,
    metric,
  );
const channelNamespace = (
  orgId: string,
  channelId: Id<"channels">,
  metric: AnalyticsMetric,
) =>
  channelAnalyticsNamespace(
    DASHBOARD_ANALYTICS_VERSION,
    orgId,
    channelId,
    metric,
  );
const topicNamespace = (
  orgId: string,
  topicId: Id<"conversationTopics">,
) => topicAnalyticsNamespace(DASHBOARD_ANALYTICS_VERSION, orgId, topicId);
```

- [ ] **Step 6: Run the model and existing analytics tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsMetricModel.test.ts convex/analytics.test.ts convex/analyticsRefresh.test.ts
```

Expected: PASS with v1 output unchanged.

- [ ] **Step 7: Commit**

```bash
git add convex/analyticsMetricModel.ts convex/analyticsMetricModel.test.ts convex/schema.ts convex/analytics.ts
git commit -m "Add versioned analytics metric model"
```

### Task 2: Idempotent Contribution Store

**Files:**
- Create: `convex/analyticsMetricContributions.ts`
- Create: `convex/analyticsMetricContributions.test.ts`
- Create: `convex/analyticsProjectionTestUtils.ts`

**Interfaces:**
- Consumes: versioned namespace and source-key functions from Task 1.
- Produces: `AnalyticsMetricContribution`.
- Produces: `ensureMetricContribution(ctx, desired)`.
- Produces: `replaceMetricContribution(ctx, desired)`.
- Produces: `removeMetricContribution(ctx, sourceKey)`.
- Produces: `reconcileMetricContributions(ctx, desired, sourceKeys)`.
- Produces shared test fixture helpers `analyticsProjectionTest`, `createProjectionFixture`, and `createProjectionFixtureWithMessagesAndTopics`.
- Identical rows are no-ops; changed rows patch; missing rows insert; undesired rows delete; duplicate keys throw through `.unique()`.

- [ ] **Step 1: Add the shared projection test fixture**

Create `convex/analyticsProjectionTestUtils.ts` by extracting the channel, customer, conversation, message, aggregate-registration, and metric-query setup from `convex/analytics.test.ts`. Export this interface:

```ts
export type AnalyticsProjectionFixture = {
  t: TestConvex<typeof schema>;
  orgId: string;
  channelId: Id<"channels">;
  customerId: Id<"customers">;
  conversationId: Id<"conversations">;
  insertMessage: (
    direction: "incoming" | "outgoing",
    createdAt: number,
    authorUserId?: string,
    contentType?: Doc<"messages">["contentType"],
  ) => Promise<Id<"messages">>;
  insertTopic: (slug: string) => Promise<Id<"conversationTopics">>;
  replaceAssignments: (
    assignments: Array<{
      topicId: Id<"conversationTopics">;
      rank: number;
      detectedAt: number;
    }>,
  ) => Promise<void>;
  patchConversation: (
    patch: Partial<Doc<"conversations">>,
  ) => Promise<void>;
  patchCustomer: (patch: Partial<Doc<"customers">>) => Promise<void>;
  projectionState: () => Promise<
    Doc<"conversationAnalyticsProjectionStates"> | null
  >;
  metricRows: (
    metric?: Doc<"analyticsMetricEntries">["metric"],
  ) => Promise<Doc<"analyticsMetricEntries">[]>;
  metricBySourceRole: (
    role: string,
  ) => Promise<Doc<"analyticsMetricEntries">>;
  metricBySourceRoleOrNull: (
    role: string,
  ) => Promise<Doc<"analyticsMetricEntries"> | null>;
  runMessageProjectionPage: (
    earliestDirtyMessageAt: number,
    cursor?: string | null,
  ) => Promise<{
    continueCursor: string;
    isDone: boolean;
    projectedMessages: number;
  }>;
  runConversationProjection: (observedAt?: number) => Promise<unknown>;
  runTopicProjection: () => Promise<unknown>;
  v2MetricSnapshot: () => Promise<
    Array<{
      sourceKey: string;
      namespace: string;
      sortKey: number;
      value: number;
    }>
  >;
};

export function analyticsProjectionTest(): TestConvex<typeof schema>;

export async function createProjectionFixture(
  overrides?: {
    assignedUserId?: string;
    status?: Doc<"conversations">["status"];
    tags?: string[];
    leadTemperature?: Doc<"customers">["leadTemperature"];
    service?: Doc<"conversations">["service"];
  },
): Promise<AnalyticsProjectionFixture>;

export async function createProjectionFixtureWithMessagesAndTopics(): Promise<
  AnalyticsProjectionFixture & {
    runBackfillPrimitives: () => Promise<void>;
  }
>;
```

Register `analyticsMetrics` exactly as `convex/analytics.test.ts` does. Use real typed inserts containing every required schema field. Keep this helper below 300 lines by placing snapshot sorting in the consuming test file.

- [ ] **Step 2: Write failing contribution-store tests**

Create `convex/analyticsMetricContributions.test.ts` using `analyticsProjectionTest` and four tests:

```ts
test("ensure inserts once and duplicate retry is a no-op", async () => {
  const t = analyticsProjectionTest();
  const desired = teamConversationContribution("conversation-1", 1000);
  await t.run(async (ctx) => ensureMetricContribution(ctx, desired));
  await t.run(async (ctx) => ensureMetricContribution(ctx, desired));
  const rows = await metricRowsBySourceKey(t, desired.sourceKey);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ value: 1, sortKey: 1000 });
});

test("ensure patches aggregate-relevant changes without changing createdAt", async () => {
  const t = analyticsProjectionTest();
  const original = teamConversationContribution("conversation-1", 1000);
  await t.run(async (ctx) => ensureMetricContribution(ctx, original));
  const before = (await metricRowsBySourceKey(t, original.sourceKey))[0]!;
  await t.run(async (ctx) =>
    replaceMetricContribution(ctx, { ...original, sortKey: 900 }),
  );
  const after = (await metricRowsBySourceKey(t, original.sourceKey))[0]!;
  expect(after.sortKey).toBe(900);
  expect(after.createdAt).toBe(before.createdAt);
  expect(after.updatedAt).toBeGreaterThanOrEqual(before.updatedAt);
});

test("remove subtracts and retrying removal is a no-op", async () => {
  const t = analyticsProjectionTest();
  const desired = teamConversationContribution("conversation-1", 1000);
  await t.run(async (ctx) => ensureMetricContribution(ctx, desired));
  await t.run(async (ctx) => removeMetricContribution(ctx, desired.sourceKey));
  await t.run(async (ctx) => removeMetricContribution(ctx, desired.sourceKey));
  expect(await metricRowsBySourceKey(t, desired.sourceKey)).toEqual([]);
});

test("duplicate source keys fail visibly", async () => {
  const t = analyticsProjectionTest();
  const desired = teamConversationContribution("conversation-1", 1000);
  await t.run(async (ctx) => {
    await ctx.db.insert("analyticsMetricEntries", {
      ...desired,
      createdAt: 1000,
      updatedAt: 1000,
    });
    await ctx.db.insert("analyticsMetricEntries", {
      ...desired,
      createdAt: 1001,
      updatedAt: 1001,
    });
  });
  await expect(
    t.run(async (ctx) => ensureMetricContribution(ctx, desired)),
  ).rejects.toThrow();
});
```

Define `teamConversationContribution` and `metricRowsBySourceKey` in the same file with complete `analyticsMetricEntries` fields; do not use `as any`.

- [ ] **Step 3: Run the focused test and verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsMetricContributions.test.ts
```

Expected: FAIL because the contribution-store exports do not exist.

- [ ] **Step 4: Implement deterministic storage**

Create `convex/analyticsMetricContributions.ts` around this exact data contract:

```ts
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export type AnalyticsMetricContribution = Omit<
  Doc<"analyticsMetricEntries">,
  "_id" | "_creationTime" | "createdAt" | "updatedAt"
>;

const comparableFields = [
  "namespace",
  "sortKey",
  "value",
  "metric",
  "orgId",
  "memberUserId",
  "service",
  "channelId",
  "topicId",
  "sourceConversationId",
  "sourceMessageId",
  "sourceKey",
] as const;

function contributionMatches(
  current: Doc<"analyticsMetricEntries">,
  desired: AnalyticsMetricContribution,
): boolean {
  return comparableFields.every((field) => current[field] === desired[field]);
}

async function metricContributionBySourceKey(
  ctx: MutationCtx,
  sourceKey: string,
) {
  return await ctx.db
    .query("analyticsMetricEntries")
    .withIndex("by_sourceKey", (query) => query.eq("sourceKey", sourceKey))
    .unique();
}

export async function ensureMetricContribution(
  ctx: MutationCtx,
  desired: AnalyticsMetricContribution,
) {
  const current = await metricContributionBySourceKey(ctx, desired.sourceKey);
  const now = Date.now();
  if (current === null) {
    return await ctx.db.insert("analyticsMetricEntries", {
      ...desired,
      createdAt: now,
      updatedAt: now,
    });
  }
  if (contributionMatches(current, desired)) return current._id;
  await ctx.db.patch(current._id, { ...desired, updatedAt: now });
  return current._id;
}

export const replaceMetricContribution = ensureMetricContribution;

export async function removeMetricContribution(
  ctx: MutationCtx,
  sourceKey: string,
) {
  const current = await metricContributionBySourceKey(ctx, sourceKey);
  if (current === null) return false;
  await ctx.db.delete(current._id);
  return true;
}

export async function reconcileMetricContributions(
  ctx: MutationCtx,
  desired: readonly AnalyticsMetricContribution[],
  sourceKeys: readonly string[],
) {
  const desiredBySourceKey = new Map(
    desired.map((entry) => [entry.sourceKey, entry] as const),
  );
  for (const sourceKey of sourceKeys) {
    const contribution = desiredBySourceKey.get(sourceKey);
    if (contribution === undefined) {
      await removeMetricContribution(ctx, sourceKey);
    } else {
      await ensureMetricContribution(ctx, contribution);
    }
  }
}
```

- [ ] **Step 5: Run the contribution tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsMetricContributions.test.ts
```

Expected: PASS for insert, retry no-op, patch, delete, and duplicate failure.

- [ ] **Step 6: Commit**

```bash
git add convex/analyticsMetricContributions.ts convex/analyticsMetricContributions.test.ts convex/analyticsProjectionTestUtils.ts
git commit -m "Add idempotent analytics contribution store"
```

### Task 3: Projection State Transitions

**Files:**
- Create: `convex/analyticsProjectionStateModel.ts`
- Create: `convex/analyticsProjectionState.ts`
- Create: `convex/analyticsProjectionState.test.ts`

**Interfaces:**
- Produces: `ConversationAnalyticsProjectionState`.
- Produces: `applyMessageToProjectionState(state, message)`.
- Produces: `applyConversationTransitions(state, { converted, dropped, now })`.
- Produces: `loadOrCreateProjectionState(ctx, conversation)`.
- The database initializer explicitly seeds `convertedAt` and `droppedAt` from the legacy fact during Deploy 1 only; no v1 rebuild is invoked.

- [ ] **Step 1: Write pure transition tests**

Create `emptyProjectionState` and `message` as typed local test builders, then test these exact transitions:

```ts
function emptyProjectionState(
  conversationId: Id<"conversations">,
  now: number,
): ConversationAnalyticsProjectionState {
  return {
    conversationId,
    createdAt: now,
    updatedAt: now,
  };
}

function message(
  direction: Doc<"messages">["direction"],
  createdAt: number,
  messageId = `message-${createdAt}` as Id<"messages">,
  authorUserId?: string,
) {
  return {
    _id: messageId,
    direction,
    createdAt,
    authorUserId,
  };
}
```

```ts
test("message state keeps minimum timestamps and the first human identity", () => {
  const initial = emptyProjectionState(
    "conversation-1" as Id<"conversations">,
    1000,
  );
  const afterCustomer = applyMessageToProjectionState(
    initial,
    message("incoming", 1200),
  );
  const afterAi = applyMessageToProjectionState(
    afterCustomer,
    message("outgoing", 1500),
  );
  const afterHuman = applyMessageToProjectionState(
    afterAi,
    message("outgoing", 1600, "human-message", "member-1"),
  );
  const afterLateHuman = applyMessageToProjectionState(
    afterHuman,
    message("outgoing", 1400, "late-human-message", "member-2"),
  );
  expect(afterLateHuman).toMatchObject({
    firstCustomerMessageAt: 1200,
    firstOutgoingAt: 1400,
    firstHumanOutgoingAt: 1400,
    firstHumanMessageId: "late-human-message",
    firstHumanMemberUserId: "member-2",
  });
});

test("conversion and drop transitions preserve first observation until reversal", () => {
  const initial = emptyProjectionState(
    "conversation-1" as Id<"conversations">,
    1000,
  );
  const active = applyConversationTransitions(initial, {
    converted: true,
    dropped: true,
    now: 2000,
  });
  const retried = applyConversationTransitions(active, {
    converted: true,
    dropped: true,
    now: 3000,
  });
  const reversed = applyConversationTransitions(retried, {
    converted: false,
    dropped: false,
    now: 4000,
  });
  expect(retried.convertedAt).toBe(2000);
  expect(retried.droppedAt).toBe(2000);
  expect(reversed.convertedAt).toBeUndefined();
  expect(reversed.droppedAt).toBeUndefined();
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsProjectionState.test.ts
```

Expected: FAIL because the state-model functions do not exist.

- [ ] **Step 3: Implement the pure state model**

Use minimum-time replacement. When two candidate human messages have the same `createdAt`, choose the lexically smaller message ID so retries have a deterministic tie-breaker. Ignore outgoing reply candidates that precede a known first customer message.

The exported function shapes must be:

```ts
export type ConversationAnalyticsProjectionState = {
  conversationId: Id<"conversations">;
  firstCustomerMessageAt?: number;
  firstOutgoingAt?: number;
  firstHumanOutgoingAt?: number;
  firstHumanMessageId?: Id<"messages">;
  firstHumanMemberUserId?: string;
  convertedAt?: number;
  droppedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export function applyMessageToProjectionState(
  state: ConversationAnalyticsProjectionState,
  message: Pick<
    Doc<"messages">,
    "_id" | "direction" | "createdAt" | "authorUserId"
  >,
): ConversationAnalyticsProjectionState;

export function applyConversationTransitions(
  state: ConversationAnalyticsProjectionState,
  input: { converted: boolean; dropped: boolean; now: number },
): ConversationAnalyticsProjectionState;
```

- [ ] **Step 4: Implement projection-state persistence**

`loadOrCreateProjectionState` must:

1. Query `conversationAnalyticsProjectionStates.by_conversationId` with `.unique()`.
2. Return the existing row when present.
3. Query `conversationAnalyticsFacts.by_conversationId` only during Deploy 1 initialization.
4. Insert one row with legacy `firstCustomerMessageAt`, `firstOutgoingAt`, `firstHumanOutgoingAt`, `convertedAt`, and `droppedAt` when present.
5. Resolve the first human message identity by querying `by_conversationId_and_createdAt` with equality on both `conversationId` and the exact legacy timestamp, taking at most 10 equal-timestamp rows, and choosing the deterministic human row; throw if a legacy human timestamp exists but no matching message is found.

Export:

```ts
export async function loadOrCreateProjectionState(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
): Promise<Doc<"conversationAnalyticsProjectionStates">>;

export async function replaceProjectionState(
  ctx: MutationCtx,
  stateId: Id<"conversationAnalyticsProjectionStates">,
  state: ConversationAnalyticsProjectionState,
): Promise<void>;
```

- [ ] **Step 5: Run state tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsProjectionState.test.ts
```

Expected: PASS for minimum timestamps, deterministic human identity, retries, conversion/drop preservation, and reversal.

- [ ] **Step 6: Commit**

```bash
git add convex/analyticsProjectionStateModel.ts convex/analyticsProjectionState.ts convex/analyticsProjectionState.test.ts
git commit -m "Add conversation analytics projection state"
```

### Task 4: Conversation Contribution Projection

**Files:**
- Create: `convex/analyticsConversationContributionModel.ts`
- Create: `convex/analyticsConversationProjection.ts`
- Create: `convex/analyticsConversationProjection.test.ts`

**Interfaces:**
- Consumes: contribution store and projection state.
- Produces: `buildConversationMetricContributions`.
- Produces: `reconcileConversationAnalytics(ctx, conversationId, observedAt?)`.
- Produces internal mutation `analyticsConversationProjection.run`.
- Reconciles the fixed source-key set in constant work.

- [ ] **Step 1: Write failing conversation projection tests**

Use one `convexTest` fixture with an aggregate registration and assert:

```ts
test("assignment moves stable member contributions between namespaces", async () => {
  const fixture = await createProjectionFixture({ assignedUserId: "member-1" });
  await fixture.runConversationProjection();
  await fixture.patchConversation({ assignedUserId: "member-2" });
  await fixture.runConversationProjection();
  const assigned = await fixture.metricBySourceRole(
    "member:assignedConversationCount",
  );
  expect(assigned.sourceKey).toContain(
    "v2:conversation:",
  );
  expect(assigned.sourceKey).not.toContain("member-2");
  expect(assigned.namespace).toContain(":member-2:");
});

test("close and reopen remove and recreate active contributions", async () => {
  const fixture = await createProjectionFixture({ status: "open" });
  await fixture.runConversationProjection();
  await fixture.patchConversation({ status: "closed" });
  await fixture.runConversationProjection();
  expect(await fixture.metricBySourceRoleOrNull("team:activeConversationCount"))
    .toBeNull();
  await fixture.patchConversation({ status: "open" });
  await fixture.runConversationProjection();
  expect(await fixture.metricBySourceRoleOrNull("team:activeConversationCount"))
    .not.toBeNull();
});

test("converted and Cold reversals replace or remove derived rows", async () => {
  const fixture = await createProjectionFixture({
    tags: ["converted"],
    leadTemperature: "Cold",
  });
  await fixture.runConversationProjection(2000);
  await fixture.patchConversation({ tags: [] });
  await fixture.patchCustomer({ leadTemperature: "Warm" });
  await fixture.runConversationProjection(3000);
  expect(await fixture.metricBySourceRoleOrNull("team:convertedCount")).toBeNull();
  expect(await fixture.metricBySourceRoleOrNull("team:conversionDurationMs"))
    .toBeNull();
  expect(await fixture.metricBySourceRoleOrNull("team:droppedCount")).toBeNull();
});
```

Also assert team, service, concrete channel, member denominator, first reply, first human reply, conversion duration, and drop rows match the v1 metric names and sort keys.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsConversationProjection.test.ts
```

Expected: FAIL because the conversation projection modules do not exist.

- [ ] **Step 3: Build the fixed contribution model**

`buildConversationMetricContributions` must be a pure function:

```ts
export function buildConversationMetricContributions(input: {
  conversation: Doc<"conversations">;
  customer: Doc<"customers"> | null;
  state: ConversationAnalyticsProjectionState;
}): {
  desired: AnalyticsMetricContribution[];
  sourceKeys: string[];
};
```

Use the exact v2 source-key roles from the approved design:

```ts
const CONVERSATION_SOURCE_ROLES = [
  "team:conversationCount",
  "team:activeConversationCount",
  "team:convertedCount",
  "team:conversionDurationMs",
  "team:droppedCount",
  "team:firstReplyCount",
  "team:firstReplyDurationMs",
  "service:conversationCount",
  "service:convertedCount",
  "channel:conversationCount",
  "channel:convertedCount",
  "member:assignedConversationCount",
  "member:avgMessagesPerConversationDenominator",
  "member:activeConversationCount",
  "member:convertedCount",
  "member:conversionDurationMs",
  "member:droppedCount",
  "member:firstHumanReplyCount",
  "member:firstHumanReplyDurationMs",
] as const;
```

Rules:

- `startedAt = state.firstCustomerMessageAt ?? conversation.createdAt`.
- Team and assigned-member active rows use `conversation.lastMessageAt`.
- Converted and dropped rows exist only while their state timestamp exists.
- Conversion duration uses `max(0, convertedAt - startedAt)`.
- First reply rows use `state.firstOutgoingAt` as sort key.
- First human rows use `state.firstHumanOutgoingAt`, `firstHumanMessageId`, and `firstHumanMemberUserId`.
- Member-assignment source keys remain unchanged when the assignee changes.
- Service and concrete-channel source keys remain unchanged when dimensions change.

- [ ] **Step 4: Implement the scheduled projection worker**

`reconcileConversationAnalytics` must:

1. Load the conversation and return `{ projected: false, reason: "missing" }` if deleted.
2. Return `{ projected: false, reason: "playground" }` for playground conversations.
3. Load the linked customer and projection state.
4. Apply converted/drop transitions using `observedAt ?? Date.now()`.
5. Persist state only when fields changed.
6. Build the fixed desired/source-key set.
7. Call `reconcileMetricContributions`.

Register:

```ts
export const run = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    observedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) =>
    await reconcileConversationAnalytics(
      ctx,
      args.conversationId,
      args.observedAt,
    ),
});
```

Import `internalMutation` from `./triggers` so metric writes update `analyticsMetrics`.

- [ ] **Step 5: Run conversation projection tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsConversationProjection.test.ts
```

Expected: PASS for stable-key movement, close/reopen, conversion/drop reversal, first-response values, and idempotent retries.

- [ ] **Step 6: Commit**

```bash
git add convex/analyticsConversationContributionModel.ts convex/analyticsConversationProjection.ts convex/analyticsConversationProjection.test.ts
git commit -m "Add incremental conversation analytics projection"
```

### Task 5: Cursor-Paged Message Projection

**Files:**
- Create: `convex/analyticsMessageProjection.ts`
- Create: `convex/analyticsMessageProjection.test.ts`

**Interfaces:**
- Consumes: `applyMessageToProjectionState`, `loadOrCreateProjectionState`, `replaceProjectionState`, and `ensureMetricContribution`.
- Produces: `MESSAGE_PROJECTION_PAGE_SIZE = 50`.
- Produces: `projectConversationMessagePage(ctx, args)`.
- A page updates message/state contributions only; Task 7 reconciles conversation and topics after the final page.

- [ ] **Step 1: Write failing cursor-page tests**

Create `convex/analyticsMessageProjection.test.ts`:

```ts
import { expect, test } from "vitest";
import { createProjectionFixture } from "./analyticsProjectionTestUtils";

test("projects exactly 50 messages before continuing", async () => {
  const fixture = await createProjectionFixture();
  for (let index = 0; index < 52; index += 1) {
    await fixture.insertMessage(
      index === 0 ? "incoming" : "outgoing",
      1000 + index,
      index === 0 ? undefined : "member-1",
    );
  }

  const first = await fixture.runMessageProjectionPage(1000);
  expect(first.projectedMessages).toBe(50);
  expect(first.isDone).toBe(false);

  const second = await fixture.runMessageProjectionPage(
    1000,
    first.continueCursor,
  );
  expect(second.projectedMessages).toBe(2);
  expect(second.isDone).toBe(true);
  expect(await fixture.metricRows("messageSentCount")).toHaveLength(51);
});

test("late earlier replies replace minimum-time state without duplicates", async () => {
  const fixture = await createProjectionFixture();
  await fixture.insertMessage("incoming", 1000);
  await fixture.insertMessage("outgoing", 1600, "member-1");
  await fixture.runMessageProjectionPage(1000);
  await fixture.insertMessage("outgoing", 1200, "member-2");
  await fixture.runMessageProjectionPage(1200);
  await fixture.runConversationProjection();

  expect((await fixture.metricBySourceRole("team:firstReplyDurationMs")).value)
    .toBe(200);
  expect(
    (await fixture.metricBySourceRole("member:firstHumanReplyDurationMs")).value,
  ).toBe(200);
  expect(await fixture.metricRows("firstReplyDurationMs")).toHaveLength(1);
  expect(await fixture.metricRows("firstHumanReplyDurationMs")).toHaveLength(1);
});

test("messages after the first 500 remain projectable", async () => {
  const fixture = await createProjectionFixture();
  for (let index = 0; index < 501; index += 1) {
    await fixture.insertMessage(
      index === 0 ? "incoming" : "outgoing",
      1000 + index,
      index === 0 ? undefined : "member-1",
    );
  }
  const latestId = await fixture.insertMessage(
    "outgoing",
    2000,
    "member-1",
  );
  await fixture.runMessageProjectionPage(2000);
  expect(
    await fixture.t.run(async (ctx) =>
      await ctx.db
        .query("analyticsMetricEntries")
        .withIndex("by_sourceKey", (query) =>
          query.eq(
            "sourceKey",
            `v2:message:${latestId}:member:messageSentCount`,
          ),
        )
        .unique(),
    ),
  ).not.toBeNull();
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsMessageProjection.test.ts
```

Expected: FAIL because `projectConversationMessagePage` does not exist.

- [ ] **Step 3: Implement one cursor page**

Create `convex/analyticsMessageProjection.ts` with this public contract:

```ts
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { ensureMetricContribution } from "./analyticsMetricContributions";
import {
  applyMessageToProjectionState,
  loadOrCreateProjectionState,
  replaceProjectionState,
} from "./analyticsProjectionState";
import {
  memberAnalyticsNamespace,
  v2MessageSourceKey,
} from "./analyticsMetricModel";

export const MESSAGE_PROJECTION_PAGE_SIZE = 50;

export type MessageProjectionPageArgs = {
  conversationId: Id<"conversations">;
  earliestDirtyMessageAt: number;
  cursor: string | null;
};

export type MessageProjectionPageResult = {
  continueCursor: string;
  isDone: boolean;
  projectedMessages: number;
};

export async function projectConversationMessagePage(
  ctx: MutationCtx,
  args: MessageProjectionPageArgs,
): Promise<MessageProjectionPageResult> {
  const conversation = await ctx.db.get(args.conversationId);
  if (conversation === null || conversation.service === "playground") {
    return {
      continueCursor: args.cursor ?? "",
      isDone: true,
      projectedMessages: 0,
    };
  }

  const result = await ctx.db
    .query("messages")
    .withIndex("by_conversationId_and_createdAt", (query) =>
      query
        .eq("conversationId", args.conversationId)
        .gte("createdAt", args.earliestDirtyMessageAt),
    )
    .order("asc")
    .paginate({
      cursor: args.cursor,
      numItems: MESSAGE_PROJECTION_PAGE_SIZE,
    });

  const stateRow = await loadOrCreateProjectionState(ctx, conversation);
  let nextState = stateRow;
  for (const message of result.page) {
    nextState = {
      ...nextState,
      ...applyMessageToProjectionState(nextState, message),
    };
    if (
      message.direction === "outgoing" &&
      message.authorUserId !== undefined
    ) {
      await ensureMetricContribution(ctx, {
        namespace: memberAnalyticsNamespace(
          "v2",
          conversation.orgId,
          message.authorUserId,
          "messageSentCount",
        ),
        sortKey: message.createdAt,
        value: 1,
        metric: "messageSentCount",
        orgId: conversation.orgId,
        memberUserId: message.authorUserId,
        service: conversation.service,
        channelId: conversation.channelId,
        sourceConversationId: conversation._id,
        sourceMessageId: message._id,
        sourceKey: v2MessageSourceKey(
          message._id,
          "member:messageSentCount",
        ),
      });
    }
  }

  await replaceProjectionState(ctx, stateRow._id, {
    ...nextState,
    updatedAt: Date.now(),
  });
  return {
    continueCursor: result.continueCursor,
    isDone: result.isDone,
    projectedMessages: result.page.length,
  };
}
```

- [ ] **Step 4: Add the fixture adapter and run focused tests**

Implement `runMessageProjectionPage` in `convex/analyticsProjectionTestUtils.ts` by calling `projectConversationMessagePage` inside `t.run`.

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsMessageProjection.test.ts convex/analyticsProjectionState.test.ts convex/analyticsConversationProjection.test.ts
```

Expected: PASS, with the first page limited to 50 and later pages continuing from the cursor.

- [ ] **Step 5: Commit**

```bash
git add convex/analyticsMessageProjection.ts convex/analyticsMessageProjection.test.ts convex/analyticsProjectionTestUtils.ts
git commit -m "Add cursor paged message analytics projection"
```

### Task 6: Bounded Topic Projection

**Files:**
- Create: `convex/analyticsTopicProjection.ts`
- Create: `convex/analyticsTopicProjection.test.ts`
- Modify: `convex/analyticsTopicRecords.ts:247-249`

**Interfaces:**
- Produces: `reconcileConversationTopics(ctx, conversationId)`.
- Produces internal mutation `analyticsTopicProjection.run`.
- Current topic assignments and existing v2 topic rows are each bounded to the product limit plus one integrity sentinel.

- [ ] **Step 1: Write failing topic projection tests**

Create one fixture that inserts two assignments, projects twice, removes one, changes rank, and projects again:

```ts
test("topic add remove and reorder remain idempotent", async () => {
  const fixture = await createProjectionFixture();
  const pricing = await fixture.insertTopic("pricing");
  const delivery = await fixture.insertTopic("delivery");
  await fixture.replaceAssignments([
    { topicId: pricing, rank: 0, detectedAt: 1000 },
    { topicId: delivery, rank: 1, detectedAt: 1100 },
  ]);
  await fixture.runTopicProjection();
  await fixture.runTopicProjection();
  expect(await fixture.metricRows("topicMentionCount")).toHaveLength(2);
  await fixture.replaceAssignments([
    { topicId: pricing, rank: 1, detectedAt: 1000 },
  ]);
  await fixture.runTopicProjection();
  const rows = await fixture.metricRows("topicMentionCount");
  expect(rows).toHaveLength(1);
  expect(rows[0]?.topicId).toBe(pricing);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsTopicProjection.test.ts
```

Expected: FAIL because the topic projection does not exist.

- [ ] **Step 3: Implement bounded topic reconciliation**

`reconcileConversationTopics` must:

1. Load the conversation and explicitly no-op for deleted/playground rows.
2. Read at most 6 current assignments from `by_conversationId`; throw when length exceeds 5.
3. Read at most 6 existing rows from `by_sourceConversationId_and_metric_and_sourceKey` by equating `sourceConversationId` and `topicMentionCount`, then bounding `sourceKey` from `"v2:"` inclusive to `"v2;"` exclusive; throw when more than 5 exist.
4. Build one desired row per assignment using `assignment.detectedAt`.
5. Reconcile the union of desired and existing v2 source keys.

Register:

```ts
export const run = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) =>
    await reconcileConversationTopics(ctx, args.conversationId),
});
```

- [ ] **Step 4: Replace topic rebuild with the dirty marker after Task 7 exists**

Do not leave a direct `ctx.runMutation(internal.analytics.syncConversationAnalytics, ...)` call in `analyticsTopicRecords.ts`. Task 7 supplies the helper; the final form is:

```ts
await markConversationAnalyticsDirty(ctx, {
  conversationId: args.conversationId,
});
```

- [ ] **Step 5: Run topic tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsTopicProjection.test.ts convex/analytics.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit with Task 7 if the helper import is not yet available**

Stage `analyticsTopicRecords.ts` only after Task 7 creates the helper. Commit the standalone module and test now:

```bash
git add convex/analyticsTopicProjection.ts convex/analyticsTopicProjection.test.ts
git commit -m "Add bounded topic analytics projection"
```

### Task 7: Dirty Queue, Dispatcher, Worker, and Canonical Writers

**Files:**
- Create: `convex/analyticsDirtyRequest.ts`
- Create: `convex/analyticsDirtyRequest.test.ts`
- Create: `convex/analyticsDirtyDispatcher.ts`
- Create: `convex/analyticsDirtyDispatcher.test.ts`
- Create: `convex/analyticsProjectionWorker.ts`
- Create: `convex/analyticsProjectionWorker.test.ts`
- Create: `convex/analyticsProjectionCallsites.test.ts`
- Modify: `convex/crons.ts`
- Modify: `convex/chat/inbox.ts`
- Modify: `convex/whatsappWebhook.ts`
- Modify: `convex/instagramWebhook.ts`
- Modify: `convex/messengerWebhook.ts`
- Modify: `convex/webWidget.ts`
- Modify: `convex/instagramSync.ts`
- Modify: `convex/messengerSync.ts`
- Modify: `convex/whatsappSync.ts`
- Modify: `convex/broadcastPool.ts`
- Modify: `convex/followUpPool.ts`
- Modify: `convex/conversations.ts`
- Modify: `convex/customers.ts`
- Modify: `convex/leadRouting/assign.ts`
- Modify: `convex/analyticsTopicRecords.ts`
- Modify: `convex/analyticsInsightRecords.ts`

**Interfaces:**
- Produces: `markConversationAnalyticsDirty(ctx, args)`.
- Produces internal mutation `analyticsDirtyRequest.request` for action callers.
- Produces: `DIRTY_DISPATCH_BATCH_SIZE = 25` and `DIRTY_RETRY_INTERVAL_MS = 900_000`.
- Produces internal mutations `analyticsDirtyDispatcher.dispatchDue`, `analyticsProjectionWorker.run`, and `analyticsProjectionWorker.continueRun`.
- Canonical writers perform one dirty upsert and no analytics scheduling.
- During Deploy 1, the dispatcher requests one v1 refresh and one v2 worker per due conversation.

- [ ] **Step 1: Write failing dirty-request tests**

Create `convex/analyticsDirtyRequest.test.ts`:

```ts
import { expect, test } from "vitest";
import { createProjectionFixture } from "./analyticsProjectionTestUtils";
import { markConversationAnalyticsDirty } from "./analyticsDirtyRequest";

test("repeated message changes coalesce without postponing the request", async () => {
  const fixture = await createProjectionFixture();
  const requestId = await fixture.t.run(async (ctx) =>
    await markConversationAnalyticsDirty(ctx, {
      conversationId: fixture.conversationId,
      earliestDirtyMessageAt: 1200,
      requestedAt: 2000,
    }),
  );
  await fixture.t.run(async (ctx) =>
    await markConversationAnalyticsDirty(ctx, {
      conversationId: fixture.conversationId,
      earliestDirtyMessageAt: 900,
      requestedAt: 2500,
    }),
  );
  const request = await fixture.t.run(async (ctx) =>
    await ctx.db.get(requestId),
  );
  expect(request).toMatchObject({
    revision: 2,
    requestedAt: 2500,
    nextAttemptAt: 2000,
    earliestDirtyMessageAt: 900,
  });
});

test("state-only changes preserve the existing message lower bound", async () => {
  const fixture = await createProjectionFixture();
  const requestId = await fixture.t.run(async (ctx) =>
    await markConversationAnalyticsDirty(ctx, {
      conversationId: fixture.conversationId,
      earliestDirtyMessageAt: 1000,
      requestedAt: 2000,
    }),
  );
  await fixture.t.run(async (ctx) =>
    await markConversationAnalyticsDirty(ctx, {
      conversationId: fixture.conversationId,
      requestedAt: 3000,
    }),
  );
  expect(await fixture.t.run(async (ctx) => await ctx.db.get(requestId)))
    .toMatchObject({
      revision: 2,
      nextAttemptAt: 2000,
      earliestDirtyMessageAt: 1000,
    });
});
```

- [ ] **Step 2: Implement the atomic dirty upsert**

Create `convex/analyticsDirtyRequest.ts`:

```ts
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";

export type MarkConversationAnalyticsDirtyArgs = {
  conversationId: Id<"conversations">;
  earliestDirtyMessageAt?: number;
  requestedAt?: number;
};

function minimumDefined(
  first: number | undefined,
  second: number | undefined,
): number | undefined {
  if (first === undefined) return second;
  if (second === undefined) return first;
  return Math.min(first, second);
}

export async function markConversationAnalyticsDirty(
  ctx: MutationCtx,
  args: MarkConversationAnalyticsDirtyArgs,
): Promise<Id<"conversationAnalyticsDirtyRequests">> {
  const existing = await ctx.db
    .query("conversationAnalyticsDirtyRequests")
    .withIndex("by_conversationId", (query) =>
      query.eq("conversationId", args.conversationId),
    )
    .unique();
  const requestedAt = args.requestedAt ?? Date.now();
  if (existing === null) {
    return await ctx.db.insert("conversationAnalyticsDirtyRequests", {
      conversationId: args.conversationId,
      revision: 1,
      requestedAt,
      nextAttemptAt: requestedAt,
      earliestDirtyMessageAt: args.earliestDirtyMessageAt,
    });
  }

  const earliestDirtyMessageAt = minimumDefined(
    existing.earliestDirtyMessageAt,
    args.earliestDirtyMessageAt,
  );
  const patch: Partial<Doc<"conversationAnalyticsDirtyRequests">> = {
    revision: existing.revision + 1,
    requestedAt,
  };
  if (earliestDirtyMessageAt !== undefined) {
    patch.earliestDirtyMessageAt = earliestDirtyMessageAt;
  }
  await ctx.db.patch(existing._id, patch);
  return existing._id;
}

export const request = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    earliestDirtyMessageAt: v.optional(v.number()),
    requestedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) =>
    await markConversationAnalyticsDirty(ctx, args),
});
```

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsDirtyRequest.test.ts
```

Expected: PASS for one row, revision increments, minimum timestamp, and unchanged due time.

- [ ] **Step 3: Write failing dispatcher tests**

Create `convex/analyticsDirtyDispatcher.test.ts`:

```ts
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { analyticsProjectionTest } from "./analyticsProjectionTestUtils";
import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.useRealTimers();
});

test("dispatcher leases 25 due rows and self-drains the remainder", async () => {
  vi.useFakeTimers();
  const t = analyticsProjectionTest();
  const now = 1_700_000_000_000;
  const futureAttemptAt = now + 60_000;

  const futureRequestId = await t.run(async (ctx) => {
    const channelId = await ctx.db.insert("channels", {
      orgId: "org-dispatch",
      service: "whatsapp",
      phoneNumberId: "phone-dispatch",
      accessToken: "token",
      status: "connected",
      connectedByUserId: "user-dispatch",
      createdAt: now,
      updatedAt: now,
    });
    let futureRequestId:
      | Id<"conversationAnalyticsDirtyRequests">
      | undefined;
    for (let index = 0; index < 28; index += 1) {
      const contactAddress = `+601100000${index}`;
      const customerId = await ctx.db.insert("customers", {
        orgId: "org-dispatch",
        service: "whatsapp",
        contactAddress,
        tags: [],
        source: "whatsapp",
        firstSeenAt: now,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      });
      const conversationId = await ctx.db.insert("conversations", {
        orgId: "org-dispatch",
        channelId,
        service: "whatsapp",
        orgAddress: "phone-dispatch",
        contactAddress,
        customerId,
        status: "open",
        tags: [],
        assignToAiAgent: false,
        threadId: `thread-${index}`,
        lastMessageAt: now,
        unreadCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      const requestId = await ctx.db.insert(
        "conversationAnalyticsDirtyRequests",
        {
          conversationId,
          revision: 1,
          requestedAt: now,
          nextAttemptAt: index < 27 ? now : futureAttemptAt,
        },
      );
      if (index === 27) futureRequestId = requestId;
    }
    if (futureRequestId === undefined) {
      throw new Error("Future request fixture was not created");
    }
    return futureRequestId;
  });

  const firstDispatch = await t.mutation(
    internal.analyticsDirtyDispatcher.dispatchDue,
    { now },
  );
  const afterFirstDispatch = await t.run(async (ctx) =>
    await ctx.db
      .query("conversationAnalyticsDirtyRequests")
      .withIndex("by_nextAttemptAt")
      .take(30),
  );
  expect(firstDispatch).toEqual({ dispatched: 25, continued: true });
  expect(
    afterFirstDispatch.filter(
      (request) => request.nextAttemptAt === now + 15 * 60 * 1000,
    ),
  ).toHaveLength(25);
  expect(
    afterFirstDispatch.filter((request) => request.nextAttemptAt === now),
  ).toHaveLength(2);
  expect(await t.run(async (ctx) => await ctx.db.get(futureRequestId)))
    .toMatchObject({ nextAttemptAt: futureAttemptAt });

  await t.finishAllScheduledFunctions(vi.runAllTimers);
  const remaining = await t.run(async (ctx) =>
    await ctx.db
      .query("conversationAnalyticsDirtyRequests")
      .withIndex("by_nextAttemptAt")
      .take(30),
  );
  expect(remaining).toEqual([
    expect.objectContaining({
      _id: futureRequestId,
      nextAttemptAt: futureAttemptAt,
    }),
  ]);
});
```

`analyticsProjectionTest` already registers the `analyticsMetrics` aggregate component, so scheduled workers can update metric entries.

- [ ] **Step 4: Implement bounded dispatch and the cron**

Create `convex/analyticsDirtyDispatcher.ts`:

```ts
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { requestConversationAnalyticsRefresh } from "./analyticsRefreshRequest";

export const DIRTY_DISPATCH_BATCH_SIZE = 25;
export const DIRTY_RETRY_INTERVAL_MS = 15 * 60 * 1000;

export const dispatchDue = internalMutation({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, args): Promise<{
    dispatched: number;
    continued: boolean;
  }> => {
    const now = args.now ?? Date.now();
    const requests = await ctx.db
      .query("conversationAnalyticsDirtyRequests")
      .withIndex("by_nextAttemptAt", (query) =>
        query.lte("nextAttemptAt", now),
      )
      .take(DIRTY_DISPATCH_BATCH_SIZE);

    for (const request of requests) {
      await ctx.db.patch(request._id, {
        nextAttemptAt: now + DIRTY_RETRY_INTERVAL_MS,
      });
      await requestConversationAnalyticsRefresh(ctx, request.conversationId);
      await ctx.scheduler.runAfter(
        0,
        internal.analyticsProjectionWorker.run,
        { requestId: request._id },
      );
    }

    const continued = requests.length === DIRTY_DISPATCH_BATCH_SIZE;
    if (continued) {
      await ctx.scheduler.runAfter(
        0,
        internal.analyticsDirtyDispatcher.dispatchDue,
        { now },
      );
    }
    return { dispatched: requests.length, continued };
  },
});
```

Add to `convex/crons.ts`:

```ts
crons.interval(
  "dispatch dirty conversation analytics",
  { minutes: 15 },
  internal.analyticsDirtyDispatcher.dispatchDue,
  {},
);
```

- [ ] **Step 5: Write failing revision-safe worker tests**

Create `convex/analyticsProjectionWorker.test.ts` and cover:

```ts
import { internal } from "./_generated/api";
import {
  memberAnalyticsNamespace,
  v2MessageSourceKey,
} from "./analyticsMetricModel";
import { markConversationAnalyticsDirty } from "./analyticsDirtyRequest";
import { createProjectionFixture } from "./analyticsProjectionTestUtils";
import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.useRealTimers();
});

test("unchanged revision completes every page and deletes the request", async () => {
  vi.useFakeTimers();
  const fixture = await createProjectionFixture();
  for (let index = 0; index < 52; index += 1) {
    await fixture.insertMessage(
      index === 0 ? "incoming" : "outgoing",
      1000 + index,
      index === 0 ? undefined : "member-1",
    );
  }
  const requestId = await fixture.t.run(async (ctx) =>
    await markConversationAnalyticsDirty(ctx, {
      conversationId: fixture.conversationId,
      earliestDirtyMessageAt: 1000,
      requestedAt: 2000,
    }),
  );
  await fixture.t.mutation(internal.analyticsProjectionWorker.run, {
    requestId,
  });
  await fixture.t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await fixture.t.run(async (ctx) => await ctx.db.get(requestId)))
    .toBeNull();
  expect(await fixture.metricRows("messageSentCount")).toHaveLength(51);
});

test("changed revision stops the stale chain and retains the request", async () => {
  vi.useFakeTimers();
  const fixture = await createProjectionFixture();
  const requestId = await createDirtyFixtureWithMoreThanOnePage(fixture);
  await fixture.t.mutation(internal.analyticsProjectionWorker.run, {
    requestId,
  });
  await fixture.t.run(async (ctx) =>
    await markConversationAnalyticsDirty(ctx, {
      conversationId: fixture.conversationId,
      earliestDirtyMessageAt: 900,
      requestedAt: 3000,
    }),
  );
  await fixture.t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await fixture.t.run(async (ctx) => await ctx.db.get(requestId)))
    .toMatchObject({ revision: 2, earliestDirtyMessageAt: 900 });
});

test("failed projection leaves the dirty request retryable", async () => {
  const fixture = await createProjectionFixture();
  const messageId = await fixture.insertMessage("outgoing", 1000, "member-1");
  const duplicate = {
    namespace: memberAnalyticsNamespace(
      "v2",
      fixture.orgId,
      "member-1",
      "messageSentCount",
    ),
    sortKey: 1000,
    value: 1,
    metric: "messageSentCount" as const,
    orgId: fixture.orgId,
    memberUserId: "member-1",
    service: "whatsapp" as const,
    channelId: fixture.channelId,
    sourceConversationId: fixture.conversationId,
    sourceMessageId: messageId,
    sourceKey: v2MessageSourceKey(
      messageId,
      "member:messageSentCount",
    ),
  };
  await fixture.t.run(async (ctx) => {
    await ctx.db.insert("analyticsMetricEntries", {
      ...duplicate,
      createdAt: 1000,
      updatedAt: 1000,
    });
    await ctx.db.insert("analyticsMetricEntries", {
      ...duplicate,
      createdAt: 1001,
      updatedAt: 1001,
    });
  });
  const requestId = await fixture.t.run(async (ctx) =>
    await markConversationAnalyticsDirty(ctx, {
      conversationId: fixture.conversationId,
      earliestDirtyMessageAt: 1000,
      requestedAt: 2000,
    }),
  );
  await expect(
    fixture.t.mutation(internal.analyticsProjectionWorker.run, {
      requestId,
    }),
  ).rejects.toThrow();
  expect(await fixture.t.run(async (ctx) => await ctx.db.get(requestId)))
    .toMatchObject({ revision: 1, nextAttemptAt: 2000 });
});
```

Define `createDirtyFixtureWithMoreThanOnePage` in the test with 52 typed message inserts and no casts to `any`.

- [ ] **Step 6: Implement page orchestration and completion**

Create `convex/analyticsProjectionWorker.ts`:

```ts
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./triggers";
import { reconcileConversationAnalytics } from "./analyticsConversationProjection";
import { projectConversationMessagePage } from "./analyticsMessageProjection";
import { reconcileConversationTopics } from "./analyticsTopicProjection";

async function finishRequest(
  ctx: MutationCtx,
  requestId: Id<"conversationAnalyticsDirtyRequests">,
  revision: number,
  conversationId: Id<"conversations">,
) {
  await reconcileConversationAnalytics(ctx, conversationId);
  await reconcileConversationTopics(ctx, conversationId);
  const current = await ctx.db.get(requestId);
  if (current?.revision === revision) {
    await ctx.db.delete(requestId);
    return { completed: true, stale: false };
  }
  return { completed: false, stale: true };
}

async function continueProjection(
  ctx: MutationCtx,
  args: {
    requestId: Id<"conversationAnalyticsDirtyRequests">;
    revision: number;
    conversationId: Id<"conversations">;
    earliestDirtyMessageAt: number;
    cursor: string | null;
  },
) {
  const current = await ctx.db.get(args.requestId);
  if (current === null || current.revision !== args.revision) {
    return { completed: false, stale: true };
  }
  const page = await projectConversationMessagePage(ctx, {
    conversationId: args.conversationId,
    earliestDirtyMessageAt: args.earliestDirtyMessageAt,
    cursor: args.cursor,
  });
  if (!page.isDone) {
    await ctx.scheduler.runAfter(
      0,
      internal.analyticsProjectionWorker.continueRun,
      { ...args, cursor: page.continueCursor },
    );
    return { completed: false, stale: false };
  }
  return await finishRequest(
    ctx,
    args.requestId,
    args.revision,
    args.conversationId,
  );
}

export const run = internalMutation({
  args: {
    requestId: v.id("conversationAnalyticsDirtyRequests"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (request === null) return { completed: false, stale: true };
    if (request.earliestDirtyMessageAt === undefined) {
      return await finishRequest(
        ctx,
        request._id,
        request.revision,
        request.conversationId,
      );
    }
    return await continueProjection(ctx, {
      requestId: request._id,
      revision: request.revision,
      conversationId: request.conversationId,
      earliestDirtyMessageAt: request.earliestDirtyMessageAt,
      cursor: null,
    });
  },
});

export const continueRun = internalMutation({
  args: {
    requestId: v.id("conversationAnalyticsDirtyRequests"),
    revision: v.number(),
    conversationId: v.id("conversations"),
    earliestDirtyMessageAt: v.number(),
    cursor: v.string(),
  },
  handler: async (ctx, args) =>
    await continueProjection(ctx, {
      ...args,
      cursor: args.cursor,
    }),
});
```

The trigger-wrapped `internalMutation` is mandatory because message, conversation, and topic helpers write `analyticsMetricEntries`.

- [ ] **Step 7: Write the source-level canonical-writer guard**

Create `convex/analyticsProjectionCallsites.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const messageWriters = [
  "convex/chat/inbox.ts",
  "convex/whatsappWebhook.ts",
  "convex/instagramWebhook.ts",
  "convex/messengerWebhook.ts",
  "convex/webWidget.ts",
  "convex/instagramSync.ts",
  "convex/messengerSync.ts",
  "convex/broadcastPool.ts",
  "convex/followUpPool.ts",
];

const stateAndTopicWriters = [
  "convex/conversations.ts",
  "convex/customers.ts",
  "convex/leadRouting/assign.ts",
  "convex/analyticsTopicRecords.ts",
];

const actionMessageWriters = [
  "convex/whatsappSync.ts",
];

test("canonical writers mark dirty without scheduling projection workers", () => {
  for (const path of [...messageWriters, ...stateAndTopicWriters]) {
    const source = readFileSync(path, "utf8");
    expect(source).toContain("markConversationAnalyticsDirty");
    expect(source).not.toContain("analyticsProjectionWorker");
  }
  for (const path of actionMessageWriters) {
    const source = readFileSync(path, "utf8");
    expect(source).toContain("internal.analyticsDirtyRequest.request");
    expect(source).not.toContain("analyticsProjectionWorker");
  }
});

test("no canonical writer directly calls the full rebuild", () => {
  for (const path of [
    ...messageWriters,
    ...actionMessageWriters,
    ...stateAndTopicWriters,
    "convex/analyticsInsightRecords.ts",
  ]) {
    expect(readFileSync(path, "utf8")).not.toContain(
      "internal.analytics.syncConversationAnalytics",
    );
  }
});
```

- [ ] **Step 8: Replace every message refresh with one dirty upsert**

Replace every `requestConversationAnalyticsRefresh` import/call in the message writers with `markConversationAnalyticsDirty`.

Use these exact timestamps:

- `convex/chat/inbox.ts`: the existing `now` shared by all rows in each human/AI text or media persistence mutation.
- WhatsApp, Instagram, and Messenger webhooks: `args.timestampMs`.
- Instagram and Messenger sync: `args.timestampMs`.
- WhatsApp history sync: accumulate the minimum `message.timestampMs` per `result.conversationId` for each contact batch, including deduplicated results, then call `internal.analyticsDirtyRequest.request` once per conversation through `ctx.runMutation`.
- Web Widget: capture `const receivedAt = Date.now()` before ingestion, pass it as `timestampMs`, then use it for `earliestDirtyMessageAt`.
- Broadcast and Follow-up pools: capture `const sentAt = Date.now()` before ingestion, pass it as `timestampMs`, then use it for `earliestDirtyMessageAt`.

Every replacement has this form:

```ts
await markConversationAnalyticsDirty(ctx, {
  conversationId: result.conversationId,
  earliestDirtyMessageAt: args.timestampMs,
});
```

Use `ingestResult` and `sentAt` in the two pool modules. One media batch calls the helper once because every ledger row shares `now`.

The WhatsApp history action uses this exact batching shape:

```ts
const earliestDirtyByConversation = new Map<Id<"conversations">, number>();

for (const message of work.messages) {
  const result = await ctx.runMutation(
    internal.chat.inbox.internalIngestHistoricalChannelMessage,
    {
      channelId: channel._id,
      externalId: message.externalId,
      contactAddress: message.contactAddress,
      contactPhone: message.contactAddress,
      direction: message.direction,
      content: message.content,
      contentType: message.contentType,
      timestampMs: message.timestampMs,
      isHistorical: true,
      outboundStatus: message.outboundStatus,
    },
  );
  const existing = earliestDirtyByConversation.get(result.conversationId);
  earliestDirtyByConversation.set(
    result.conversationId,
    existing === undefined
      ? message.timestampMs
      : Math.min(existing, message.timestampMs),
  );
}

for (const [conversationId, earliestDirtyMessageAt] of
  earliestDirtyByConversation) {
  await ctx.runMutation(internal.analyticsDirtyRequest.request, {
    conversationId,
    earliestDirtyMessageAt,
  });
}
```

- [ ] **Step 9: Mark relevant state and topic changes**

Call:

```ts
await markConversationAnalyticsDirty(ctx, { conversationId });
```

after `assignedUserId`, `status`, `lastMessageAt`, converted-tag, linked-customer lead-temperature, lead-routing assignment/unassignment, escalation raise/resolve, or topic-assignment changes.

Remove analytics requests entirely after changes that affect only `assignedAgentId`, `assignToAiAgent`, or sentiment. `analyticsInsightRecords.ts` must contain no analytics refresh or dirty call after sentiment synchronization.

- [ ] **Step 10: Run queue, worker, callsite, and regression tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsDirtyRequest.test.ts convex/analyticsDirtyDispatcher.test.ts convex/analyticsProjectionWorker.test.ts convex/analyticsProjectionCallsites.test.ts convex/analyticsMessageProjection.test.ts convex/analyticsConversationProjection.test.ts convex/analyticsTopicProjection.test.ts convex/analyticsRefresh.test.ts convex/doubleSave.test.ts convex/whatsappWebhookReceive.test.ts convex/webWidget.test.ts convex/whatsappFollowUp.test.ts convex/workflowAutomationOutbound.test.ts
```

Expected: PASS. Canonical writes leave a dirty row even when the later projection worker fails.

- [ ] **Step 11: Commit**

```bash
git add convex/analyticsDirtyRequest.ts convex/analyticsDirtyRequest.test.ts convex/analyticsDirtyDispatcher.ts convex/analyticsDirtyDispatcher.test.ts convex/analyticsProjectionWorker.ts convex/analyticsProjectionWorker.test.ts convex/analyticsProjectionCallsites.test.ts convex/crons.ts convex/chat/inbox.ts convex/whatsappWebhook.ts convex/instagramWebhook.ts convex/messengerWebhook.ts convex/webWidget.ts convex/instagramSync.ts convex/messengerSync.ts convex/whatsappSync.ts convex/broadcastPool.ts convex/followUpPool.ts convex/conversations.ts convex/customers.ts convex/leadRouting/assign.ts convex/analyticsTopicRecords.ts convex/analyticsInsightRecords.ts
git commit -m "Add coalesced analytics dirty queue"
```

### Task 8: Bounded Backfill and Repair

**Files:**
- Create: `convex/analyticsProjectionMigration.ts`
- Create: `convex/analyticsProjectionRepair.ts`
- Create: `convex/analyticsProjectionMigration.test.ts`
- Create: `convex/analyticsProjectionRepair.test.ts`

**Interfaces:**
- Produces one conversation migration whose repair order is messages, conversation/customer state, then topics.
- Produces runner `runBackfillAnalyticsV2`.
- Produces `repairConversation` and `repairConversationPage`.
- Migration batches schedule the trigger-wrapped repair mutation so `analyticsMetrics` is always updated.

- [ ] **Step 1: Write failing migration idempotency tests**

Tests must run the underlying projection helpers twice over the same fixture:

```ts
test("message conversation and topic backfill operations are idempotent", async () => {
  const fixture = await createProjectionFixtureWithMessagesAndTopics();
  await fixture.runBackfillPrimitives();
  const first = await fixture.v2MetricSnapshot();
  await fixture.runBackfillPrimitives();
  const second = await fixture.v2MetricSnapshot();
  expect(second).toEqual(first);
});
```

Add a repair test with 123 messages and assert the first call processes 50, scheduled continuations project the remaining 73, and a second full repair leaves an identical contribution snapshot.

- [ ] **Step 2: Run focused tests and verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsProjectionMigration.test.ts convex/analyticsProjectionRepair.test.ts
```

Expected: FAIL because migration and repair modules do not exist.

- [ ] **Step 3: Define the bounded conversation migration**

Create `convex/analyticsProjectionMigration.ts`:

```ts
import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

const migrations = new Migrations<DataModel>(components.migrations);

export const backfillAnalyticsV2Conversations = migrations.define({
  table: "conversations",
  batchSize: 10,
  migrateOne: async (ctx, conversation) => {
    await ctx.scheduler.runAfter(
      0,
      internal.analyticsProjectionRepair.repairConversation,
      { conversationId: conversation._id },
    );
  },
});

export const runBackfillAnalyticsV2 = migrations.runner([
  internal.analyticsProjectionMigration.backfillAnalyticsV2Conversations,
]);
```

Do not write `analyticsMetricEntries` directly from a migrations-component context. Those writes would bypass `convex/triggers.ts`. Duplicate scheduled repairs are expected and safe.

- [ ] **Step 4: Implement targeted bounded repair**

Register both repair functions with the trigger-wrapped `internalMutation` from `convex/triggers.ts`.

`repairConversation` loads the first message through `by_conversationId_and_createdAt` using `.order("asc").take(1)`. When there is no message, it reconciles conversation and topics directly. Otherwise it calls `projectConversationMessagePage` with the first message's `createdAt` and a null cursor.

`repairConversationPage` accepts:

```ts
{
  conversationId: v.id("conversations"),
  earliestDirtyMessageAt: v.number(),
  cursor: v.string(),
}
```

Each invocation calls `projectConversationMessagePage`. If the page is incomplete, schedule `repairConversationPage` with `page.continueCursor`. At the final page, call `reconcileConversationAnalytics` and `reconcileConversationTopics` once. Missing conversations return `{ repaired: false, reason: "missing" }`.

- [ ] **Step 5: Run migration and repair tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsProjectionMigration.test.ts convex/analyticsProjectionRepair.test.ts convex/analyticsMessageProjection.test.ts convex/analyticsConversationProjection.test.ts convex/analyticsTopicProjection.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add convex/analyticsProjectionMigration.ts convex/analyticsProjectionRepair.ts convex/analyticsProjectionMigration.test.ts convex/analyticsProjectionRepair.test.ts
git commit -m "Add bounded analytics backfill and repair"
```

### Task 9: v1/v2 Verification and Deploy 1 Readiness

**Files:**
- Create: `convex/analyticsProjectionVerification.ts`
- Create: `convex/analyticsProjectionParity.test.ts`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Produces internal queries `compareTeam`, `compareMember`, `compareService`, `compareChannel`, `compareTopic`, and `inspectConversation`.
- Each comparison returns v1 value, v2 value, and delta for the same range bounds.

- [ ] **Step 1: Write parity tests**

Build one fixture containing:

- two conversations;
- incoming, AI, and human messages;
- two assigned members;
- WhatsApp and web services;
- one converted conversation;
- one Cold customer;
- two topics.

Run the legacy rebuild and v2 projection for both conversations, then compare the raw aggregate sums for overview, member, service, concrete channel, drop-off, and topic namespaces:

```ts
expect(
  await t.query(internal.analyticsProjectionVerification.compareTeam, {
    orgId: "org-1",
  }),
).toEqual({
  conversationCount: { v1: 2, v2: 2, delta: 0 },
  convertedCount: { v1: 1, v2: 1, delta: 0 },
  droppedCount: { v1: 1, v2: 1, delta: 0 },
  firstReplyCount: { v1: 2, v2: 2, delta: 0 },
});
```

Also assert no v1 namespace contains v2 rows and no v2 namespace contains v1 rows.

- [ ] **Step 2: Run parity tests and verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsProjectionParity.test.ts
```

Expected: FAIL because verification helpers do not exist.

- [ ] **Step 3: Implement bounded comparison queries**

Use the shared namespace builders with both versions and the same range-bound function. Each function accepts one dimension at a time, so it never scans all members/channels/topics:

```ts
export const compareMember = internalQuery({
  args: {
    orgId: v.string(),
    memberUserId: v.string(),
    start: v.optional(v.number()),
    end: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await compareNamespaces(ctx, [
      {
        metric: "messageSentCount",
        v1: memberAnalyticsNamespace(
          "v1",
          args.orgId,
          args.memberUserId,
          "messageSentCount",
        ),
        v2: memberAnalyticsNamespace(
          "v2",
          args.orgId,
          args.memberUserId,
          "messageSentCount",
        ),
      },
    ], args.start, args.end);
  },
});
```

`inspectConversation` reads the projection state plus at most 50 v2 metric rows for one conversation and returns duplicate source keys as a non-empty array. It must not repair data.

Register the remaining functions with these exact arguments:

```ts
compareTeam: {
  orgId: string;
  start?: number;
  end?: number;
};
compareService: {
  orgId: string;
  service: ConversationService;
  start?: number;
  end?: number;
};
compareChannel: {
  orgId: string;
  channelId: Id<"channels">;
  start?: number;
  end?: number;
};
compareTopic: {
  orgId: string;
  topicId: Id<"conversationTopics">;
  start?: number;
  end?: number;
};
inspectConversation: {
  conversationId: Id<"conversations">;
};
```

Every comparison result is a record keyed by metric with `{ v1, v2, delta }`, where `delta = v2 - v1`.

- [ ] **Step 4: Run parity and regression tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsProjectionParity.test.ts convex/analytics.test.ts convex/analyticsRefresh.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run big-task verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsMetricModel.test.ts convex/analyticsMetricContributions.test.ts convex/analyticsProjectionState.test.ts convex/analyticsMessageProjection.test.ts convex/analyticsConversationProjection.test.ts convex/analyticsTopicProjection.test.ts convex/analyticsDirtyRequest.test.ts convex/analyticsDirtyDispatcher.test.ts convex/analyticsProjectionWorker.test.ts convex/analyticsProjectionCallsites.test.ts convex/analyticsProjectionMigration.test.ts convex/analyticsProjectionRepair.test.ts convex/analyticsProjectionParity.test.ts convex/analytics.test.ts convex/analyticsRefresh.test.ts convex/doubleSave.test.ts convex/whatsappWebhookReceive.test.ts convex/webWidget.test.ts convex/whatsappFollowUp.test.ts convex/workflowAutomationOutbound.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b --pretty false
```

Expected: codegen, focused tests, and TypeScript build all pass.

- [ ] **Step 6: Update the continuity ledger and commit Deploy 1 code**

Record:

- Deploy 1 implementation complete.
- No production migration or cutover run.
- Exact verification commands and results.
- The development dry-run command is the next operational step.

Then commit:

```bash
git add convex/analyticsProjectionVerification.ts convex/analyticsProjectionParity.test.ts CONTINUITY.md
git commit -m "Add analytics projection parity verification"
```

## Operational Gate: Development Backfill

Do not proceed to Phase B until the user approves deployment/backfill operations.

- [ ] **Step 1: Deploy widened schema and dual-write code to development**

Use the project’s configured development deployment. Do not use `--prod`.

- [ ] **Step 2: Dry-run the ordered migration**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex run analyticsProjectionMigration:runBackfillAnalyticsV2 '{"dryRun":true}'
```

Expected: one batch rolls back cleanly with no duplicate-key or transaction-limit error.

- [ ] **Step 3: Run and monitor the development migration**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex run analyticsProjectionMigration:runBackfillAnalyticsV2
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex run --component migrations lib:getStatus --watch
```

Expected: the conversation migration completes. Stop monitoring after terminal completion.

Migration completion proves all repair jobs were durably scheduled. Wait for the scheduled repair queue to drain before treating parity as final; zero deltas in the next step are the completion signal for projected data.

- [ ] **Step 4: Verify development parity**

Run the internal comparison functions for the active org, representative members, services, concrete channels, and topics. Every delta must be zero. Inspect at least:

- one new conversation created during migration;
- one conversation with more than 500 messages;
- one converted conversation;
- one Cold customer;
- one reassigned conversation;
- one multi-topic conversation.

- [ ] **Step 5: Inspect Convex health**

Confirm:

- no projection function timeout;
- no duplicate v2 source-key error;
- no message webhook persistence failure caused by analytics;
- no significant new OCC cluster on `conversationAnalyticsProjectionStates`;
- aggregate component mutations complete successfully.

Record exact findings in `CONTINUITY.md`.

---

## Phase B: Explicit Dashboard Cutover

### Task 10: Switch Reads to v2 and Stop v1 Live Rebuilds

**Files:**
- Modify: `convex/analytics.ts`
- Modify: `convex/analyticsDirtyDispatcher.ts`
- Modify: `convex/analyticsProjectionCallsites.test.ts`
- Modify: `convex/analyticsProjectionState.ts`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Dashboard queries keep their public names and response shapes.
- The dirty dispatcher schedules only the v2 worker.
- Canonical writers continue to perform only the dirty upsert.
- Legacy rebuild functions remain available only for observation/explicit comparison during this phase.

- [ ] **Step 1: Strengthen the callsite guard before cutover**

Add:

```ts
test("cutover helpers do not request legacy refreshes", () => {
  const source = readFileSync(
    "convex/analyticsDirtyDispatcher.ts",
    "utf8",
  );
  expect(source).not.toContain("requestConversationAnalyticsRefresh");
});
```

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsProjectionCallsites.test.ts
```

Expected: FAIL while Deploy 1 dual-write remains active.

- [ ] **Step 2: Switch the dashboard namespace version**

Change exactly:

```ts
const DASHBOARD_ANALYTICS_VERSION = "v2" as const;
```

Do not change query validators, authorization, response shapes, range bounds, formatting, or public export names.

- [ ] **Step 3: Remove v1 requests from the dirty dispatcher**

Delete the `requestConversationAnalyticsRefresh` import and its one call from `analyticsDirtyDispatcher.ts`. Keep the retry lease, v2 worker schedule, and self-draining continuation unchanged.

- [ ] **Step 4: Remove the Deploy 1 legacy-state initializer bridge**

`loadOrCreateProjectionState` must no longer query `conversationAnalyticsFacts`. A missing v2 state after verified backfill initializes empty timestamps and is then repairable through the bounded repair entrypoint. Because cutover requires verified completeness, this path should only occur for newly created conversations.

- [ ] **Step 5: Run cutover tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsDirtyRequest.test.ts convex/analyticsDirtyDispatcher.test.ts convex/analyticsProjectionWorker.test.ts convex/analyticsProjectionCallsites.test.ts convex/analyticsProjectionParity.test.ts convex/analytics.test.ts convex/analyticsRefresh.test.ts convex/analyticsMessageProjection.test.ts convex/analyticsConversationProjection.test.ts convex/analyticsTopicProjection.test.ts
```

Expected: PASS, with the source guard proving no canonical writer requests a full rebuild.

- [ ] **Step 6: Run codegen and TypeScript verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b --pretty false
```

Expected: PASS.

- [ ] **Step 7: Commit the cutover separately**

```bash
git add convex/analytics.ts convex/analyticsDirtyDispatcher.ts convex/analyticsProjectionCallsites.test.ts convex/analyticsProjectionState.ts CONTINUITY.md
git commit -m "Cut analytics dashboards over to v2 projections"
```

- [ ] **Step 8: Deploy cutover only after explicit production approval**

After deployment, observe dashboard parity, projection errors, aggregate health, webhook persistence, and OCC insights. Do not delete v1 data during the observation window.

---

## Phase C: Delayed Cleanup After Observation

### Task 11: Remove v1 Rebuild Infrastructure in Bounded Steps

**Files:**
- Create: `convex/analyticsLegacyCleanup.ts`
- Modify: `convex/analytics.ts`
- Delete after cleanup verification: `convex/analyticsRefreshRequest.ts`
- Delete after cleanup verification: `convex/analyticsRefreshWorker.ts`
- Modify: `convex/analyticsRefresh.test.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/whatsappWebhook.ts`
- Modify: `convex/customers.ts`
- Modify: `convex/whatsappUninstall.test.ts`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Deletes v1 metric rows in cursor batches of at most 25.
- Deletes legacy facts and refresh requests only after confirming no consumer remains.
- Keeps `conversationAnalyticsDirtyRequests` plus v2 repair and verification entrypoints.

- [ ] **Step 1: Add a cleanup source guard**

Assert no production module imports or references:

```ts
[
  "syncConversationAnalyticsHandler",
  "syncConversationAnalytics",
  "conversationAnalyticsRefreshRequests",
  "conversationAnalyticsFacts",
]
```

Allow those strings only in the cleanup module, migration history tests, and schema until each bounded data cleanup completes.

- [ ] **Step 2: Implement cursor-batched v1 metric deletion**

Use `analyticsMetricEntries.by_orgId_and_metric_and_sortKey` with explicit `orgId`, one metric at a time, and `paginate({ numItems: 25, cursor })`. Delete only rows whose namespace does not start with `v2:`. Schedule continuation using the returned cursor.

- [ ] **Step 3: Run cleanup in development and verify v2 dashboards remain unchanged**

Do not run in production without separate approval.

- [ ] **Step 4: Remove legacy refresh and rebuild code**

After the observation window and successful cleanup:

- Remove `syncConversationAnalyticsHandler`, `syncConversationAnalytics`, `backfillRecentConversations`, and `debugSyncConversation`.
- Remove `conversationAnalyticsRefreshRequests` and `conversationAnalyticsFacts` only after their tables are empty.
- Remove analytics cleanup branches from uninstall/customer deletion paths.
- Keep public dashboard queries and v2 modules.

- [ ] **Step 5: Split `convex/analytics.ts` if it remains over 300 lines**

Preserve `api.analytics.*` by keeping registered exports in `convex/analytics.ts` and move focused handler logic into:

- `convex/analyticsOverviewQueries.ts`
- `convex/analyticsMemberQueries.ts`
- `convex/analyticsChannelQueries.ts`
- `convex/analyticsTopicQueries.ts`

Each module must remain at or below 300 lines.

- [ ] **Step 6: Run final verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b --pretty false
git diff --check
```

Expected: all tests and checks pass; no live callsite references v1 rebuild infrastructure.

- [ ] **Step 7: Commit cleanup separately**

```bash
git add convex CONTINUITY.md
git commit -m "Retire legacy conversation analytics rebuilds"
```

## Completion Evidence

The work is complete only when:

- normal canonical message marking cost is constant relative to conversation length, and projection work is capped at 50 messages per mutation;
- duplicate message and state scheduling leaves aggregate totals unchanged;
- conversations beyond 500 messages receive correct new message contributions;
- no live projection deletes an arbitrary conversation-wide metric set;
- assignee, active, conversion, drop, and topic reversals remove or replace old contributions;
- v1/v2 comparison deltas are zero before cutover;
- message persistence succeeds independently of projection outcomes;
- development dry run and monitored migration complete;
- production migration and cutover occur only with explicit approval;
- the legacy rebuild and v1 data are removed only after the observation window.
