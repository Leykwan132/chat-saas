# Local WhatsApp Template Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make local Convex records the only application read source for WhatsApp templates, with Meta submission followed by webhook-driven approval and approved-only sending selectors.

**Architecture:** Add a small shared lifecycle module, bounded authenticated query module, migration module, and isolated webhook mutation module around `whatsappTemplates`. Meta creation and update actions remain write-only integrations, while every frontend consumer switches from the Meta-list action to reactive Convex queries.

**Tech Stack:** TypeScript 6, Convex 1.36, React 19, Vitest, `convex-test`, `@convex-dev/migrations`, Sonner, Lucide.

## Global Constraints

- Run every script and test under Node v22 using `source ~/.nvm/nvm.sh && nvm use 22` in the same command.
- Read `convex/_generated/ai/guidelines.md` before changing Convex code.
- No application code file may exceed 300 lines; put lifecycle, query, webhook, and UI presentation logic in focused modules.
- Do not add comments unless a workaround cannot be expressed through clear names and structure.
- Do not add polling or a Meta template-list fallback.
- Remove template debug and routine success logging; retained warnings/errors must never include tokens, signed URLs, payloads, components, or customer-facing content.
- New writes use only `submitting | in_review | approved | failed`; legacy `submitted` exists only during migration.
- A successful Meta request means `in_review`, never `approved`.
- Only `approved` templates may be selected for Broadcast, Follow-up, or Workflow sending.
- Management pages display every local status and use the exact label `In review`.
- Preserve the current first-connected-channel behavior on the main Templates page.
- Do not push or run a production migration without explicit user authorization.

---

## File Structure

- Create `convex/whatsappTemplateLifecycle.ts`: status validator, event mapping, normalization, transition guards, and user-facing failure reasons.
- Create `convex/whatsappTemplateQueries.ts`: authenticated bounded management, approved-only, and exact template queries plus internal lookup helpers.
- Modify `convex/whatsappTemplates.ts`: local-first creation and narrowly scoped lifecycle mutations.
- Create `convex/whatsappTemplateMigration.ts`: widen-phase backfill and runner.
- Create `convex/whatsappTemplateWebhook.ts`: WABA-aware template status mutation, matching, and idempotent patching.
- Modify `convex/whatsappTemplatesAction.ts`: require Meta ID and finalize submission without overwriting webhook approval.
- Modify `convex/whatsappTemplateUpdate.ts` and `convex/whatsappTemplateUpdateHelpers.ts`: update from the stored Meta ID and local components, without collection reads.
- Modify `convex/whatsappBroadcast.ts`: remove `listTemplates` and direct inline Meta creation.
- Create `src/components/templates/whatsappTemplateStatus.ts`: typed status label/indicator presentation.
- Modify the management and selector consumers listed in Tasks 6 and 7 to use reactive local queries.
- Add focused backend and frontend regressions adjacent to each module.

---

### Task 1: Define the local lifecycle, schema, and authenticated query API

**Files:**
- Create: `convex/whatsappTemplateLifecycle.ts`
- Create: `convex/whatsappTemplateQueries.ts`
- Create: `convex/whatsappTemplateQueries.test.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/whatsappTemplates.ts`
- Modify: `convex/personalWorkspace.test.ts`

**Interfaces:**
- Produces `whatsappTemplateStatusValidator`, `type WhatsAppTemplateStatus`, `normalizeWhatsAppTemplateLanguage(value)`, `mapMetaTemplateEvent(event, reason)`, and `projectWhatsAppTemplate(template)`.
- Produces public queries `listForChannel`, `listApprovedForChannel`, and `getForChannelByNameAndLanguage`.
- Produces internal queries `getById`, `getByChannelAndNameAndLanguage`, and `getByChannelAndMetaTemplateId`.
- List queries return at most 200 newest-first rows; exact queries return one row or `null`.

- [ ] **Step 1: Write failing lifecycle and query tests**

Create `convex/whatsappTemplateQueries.test.ts` with authenticated organization and personal-workspace fixtures. Insert `submitting`, legacy `submitted`, `in_review`, `approved`, and `failed` templates for two channels and assert:

```ts
const management = await authed.query(api.whatsappTemplateQueries.listForChannel, {
  channelId,
});
expect(management.map((row) => row.status)).toEqual([
  'failed',
  'approved',
  'in_review',
  'submitted',
  'submitting',
]);

const approved = await authed.query(
  api.whatsappTemplateQueries.listApprovedForChannel,
  { channelId },
);
expect(approved.map((row) => row.name)).toEqual(['approved_template']);

const exact = await authed.query(
  api.whatsappTemplateQueries.getForChannelByNameAndLanguage,
  { channelId, name: 'approved_template', language: 'en_US' },
);
expect(exact?.metaTemplateId).toBe('meta-approved');
```

Also assert a foreign-organization identity receives `Channel not found`, a non-WhatsApp channel is rejected, and inserting 205 rows returns exactly 200.

- [ ] **Step 2: Run the focused test and verify red**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappTemplateQueries.test.ts
```

Expected: FAIL because the new module and schema fields do not exist.

- [ ] **Step 3: Add the lifecycle primitives**

Implement `convex/whatsappTemplateLifecycle.ts` with these exact exports:

```ts
import { v } from 'convex/values';

export const whatsappTemplateStatusValidator = v.union(
  v.literal('submitting'),
  v.literal('submitted'),
  v.literal('in_review'),
  v.literal('approved'),
  v.literal('failed'),
);

export type WhatsAppTemplateStatus =
  | 'submitting'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'failed';

export function normalizeWhatsAppTemplateLanguage(value: string) {
  return value.trim().toLowerCase().replaceAll('-', '_');
}

export function mapMetaTemplateEvent(event: string, reason?: string) {
  const normalizedEvent = event.trim().toUpperCase();
  if (normalizedEvent === 'APPROVED' || normalizedEvent === 'REINSTATED') {
    return { status: 'approved' as const, error: undefined };
  }
  if (normalizedEvent === 'PENDING' || normalizedEvent === 'IN_APPEAL') {
    return { status: 'in_review' as const, error: undefined };
  }
  if (['REJECTED', 'PENDING_DELETION', 'DELETED', 'DISABLED', 'FLAGGED'].includes(normalizedEvent)) {
    return {
      status: 'failed' as const,
      error: reason?.trim() || `Meta reported ${normalizedEvent.toLowerCase().replaceAll('_', ' ')}.`,
    };
  }
  return null;
}

export function canApplyMetaTemplateStatus(
  current: WhatsAppTemplateStatus,
  next: 'in_review' | 'approved' | 'failed',
) {
  return next !== 'in_review' || (current !== 'approved' && current !== 'failed');
}
```

- [ ] **Step 4: Widen the schema and add indexes**

Update `whatsappTemplates` in `convex/schema.ts` to use `whatsappTemplateStatusValidator`, add optional `metaTemplateId` and `statusUpdatedAt`, and add:

```ts
.index('by_orgId_and_channelId_and_status', ['orgId', 'channelId', 'status'])
.index('by_channelId_and_metaTemplateId', ['channelId', 'metaTemplateId'])
```

Keep `by_channelId_and_name_and_language` for legacy matching and exact reads.

- [ ] **Step 5: Implement bounded authenticated queries**

In `convex/whatsappTemplateQueries.ts`, centralize channel authorization in:

```ts
async function requireOrgWhatsAppChannel(
  ctx: QueryCtx,
  channelId: Id<'channels'>,
) {
  const { orgId, userId } = await getAuthContext(ctx);
  const resolvedOrgId = resolveChannelOrgId(orgId, userId);
  const channel = await ctx.db.get(channelId);
  if (channel === null || channel.orgId !== resolvedOrgId) throw new Error('Channel not found');
  if (channel.service !== 'whatsapp') throw new Error('Not a WhatsApp channel');
  return { channel, resolvedOrgId };
}
```

Use `.order('desc').take(200)` on `by_orgId_and_channelId` for management, the full `by_orgId_and_channelId_and_status` equality prefix for approved selectors, and `.unique()` on `by_channelId_and_name_and_language` after authorization for exact reads. Map every public result through one `projectWhatsAppTemplate` function returning `_id`, `channelId`, `name`, `language`, `purpose`, `category`, `parameterFormat`, `components`, `status`, `error`, `metaTemplateId`, `createdAt`, and `statusUpdatedAt`; internal queries continue returning raw documents.

Remove the superseded `listLocalTemplates` query from `convex/whatsappTemplates.ts` and update `convex/personalWorkspace.test.ts` to call `api.whatsappTemplateQueries.listForChannel`.

- [ ] **Step 6: Run the focused tests and commit**

Run the Task 1 test command; expect PASS. Then:

```bash
git add convex/schema.ts convex/whatsappTemplateLifecycle.ts convex/whatsappTemplateQueries.ts convex/whatsappTemplateQueries.test.ts convex/whatsappTemplates.ts convex/personalWorkspace.test.ts
git commit -m "Add local WhatsApp template queries"
```

---

### Task 2: Migrate legacy submitted records to in-review

**Files:**
- Create: `convex/whatsappTemplateMigration.ts`
- Create: `convex/whatsappTemplateMigration.test.ts`

**Interfaces:**
- Produces `getWhatsAppTemplateMigrationPatch(template)` for deterministic unit tests.
- Produces `backfillWhatsAppTemplateLifecycle` and `runBackfillWhatsAppTemplateLifecycle`.

- [ ] **Step 1: Write the failing migration tests**

Cover these exact cases:

```ts
expect(getWhatsAppTemplateMigrationPatch({
  status: 'submitted',
  createdAt: 100,
  statusUpdatedAt: undefined,
})).toEqual({ status: 'in_review', statusUpdatedAt: 100 });

expect(getWhatsAppTemplateMigrationPatch({
  status: 'approved',
  createdAt: 100,
  statusUpdatedAt: 200,
})).toBeUndefined();

expect(getWhatsAppTemplateMigrationPatch({
  status: 'failed',
  createdAt: 100,
  statusUpdatedAt: undefined,
})).toEqual({ statusUpdatedAt: 100 });
```

- [ ] **Step 2: Run the focused test and verify red**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappTemplateMigration.test.ts
```

Expected: FAIL because the migration helper does not exist.

- [ ] **Step 3: Implement the migration**

Use `new Migrations<DataModel>(components.migrations)` and a batch size of 25. `migrateOne` must return `undefined` for already-complete rows, translate only `submitted` to `in_review`, and initialize missing `statusUpdatedAt` from `createdAt` for every other status.

- [ ] **Step 4: Run the migration tests and commit**

Run the Task 2 test command; expect PASS. Then:

```bash
git add convex/whatsappTemplateMigration.ts convex/whatsappTemplateMigration.test.ts
git commit -m "Add WhatsApp template lifecycle migration"
```

---

### Task 3: Make template creation local-first and race-safe

**Files:**
- Modify: `convex/whatsappTemplates.ts`
- Modify: `convex/whatsappTemplatesAction.ts`
- Create: `convex/whatsappTemplateSubmission.test.ts`
- Modify: `convex/whatsappBroadcast.ts`
- Modify: `src/pages/ChannelWhatsAppTemplatesPage.tsx`
- Modify: `src/pages/AutomationsBroadcastPage.tsx`

**Interfaces:**
- `api.whatsappTemplates.createLocalTemplate` remains the only creation entry point.
- Internal mutation `completeTemplateSubmission({ templateId, metaTemplateId })` transitions only `submitting` to `in_review`.
- Internal mutation `failTemplateSubmission({ templateId, error })` sets `failed` unless the row is already `approved`.

- [ ] **Step 1: Write failing creation lifecycle tests**

Mock `fetch` for `internal.whatsappTemplatesAction.submitTemplateToMeta` and assert:

```ts
expect(saved).toMatchObject({
  status: 'in_review',
  metaTemplateId: '123456789',
  error: undefined,
});
expect(saved.statusUpdatedAt).toEqual(expect.any(Number));
```

Add cases for a Meta error becoming `failed`, a 200 response without `id` becoming `failed`, and an `approved` row remaining `approved` after the delayed completion mutation.

- [ ] **Step 2: Run the focused test and verify red**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappTemplateSubmission.test.ts
```

Expected: FAIL because success still writes `submitted` and does not store Meta's ID.

- [ ] **Step 3: Implement race-safe creation mutations**

In `createLocalTemplate`, set both `createdAt` and `statusUpdatedAt` to one `now`. Replace `updateTemplateStatus` with explicit internal mutations:

```ts
export const completeTemplateSubmission = internalMutation({
  args: { templateId: v.id('whatsappTemplates'), metaTemplateId: v.string() },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (template === null) throw new Error('Template not found');
    const metaTemplateId = args.metaTemplateId.trim();
    if (!metaTemplateId) throw new Error('Meta template creation returned no template ID.');
    if (template.status !== 'submitting') {
      await ctx.db.patch(args.templateId, { metaTemplateId });
      return;
    }
    await ctx.db.patch(args.templateId, {
      metaTemplateId,
      status: 'in_review',
      error: undefined,
      statusUpdatedAt: Date.now(),
    });
  },
});
```

`failTemplateSubmission` throws for a missing row, preserves `approved`, and otherwise patches `failed`, the exact error, and `statusUpdatedAt`.

- [ ] **Step 4: Require the Meta ID in the submission action**

Capture `readGraphObject`'s return value, require a non-empty string `id`, call `completeTemplateSubmission`, then enqueue media preparation. On any thrown error call `failTemplateSubmission`. Never write `submitted`. Remove routine submission start/success `console.log` calls; keep one concise error diagnostic containing only the local template ID and normalized error message.

- [ ] **Step 5: Route the channel inline creator through local creation**

Delete `createTemplate` from `convex/whatsappBroadcast.ts`. In both `ChannelWhatsAppTemplatesPage` and the inline creator in `AutomationsBroadcastPage`, replace `useAction(api.whatsappBroadcast.createTemplate)` with `useMutation(api.whatsappTemplates.createLocalTemplate)` and submit:

```ts
await createLocalTemplate({
  channelId: channelId as Id<'channels'>,
  name,
  language,
  purpose: category === 'MARKETING' ? 'broadcasting' : 'follow_up',
  components: [{ type: 'BODY', text: bodyText.trim() }],
});
```

Do not manually reload after success; Task 6 will make the page reactive.

- [ ] **Step 6: Run focused tests and commit**

Run Task 3 tests; expect PASS. Then:

```bash
git add convex/whatsappTemplates.ts convex/whatsappTemplatesAction.ts convex/whatsappTemplateSubmission.test.ts convex/whatsappBroadcast.ts src/pages/ChannelWhatsAppTemplatesPage.tsx src/pages/AutomationsBroadcastPage.tsx
git commit -m "Persist WhatsApp template submissions locally"
```

---

### Task 4: Update templates using the stored Meta ID

**Files:**
- Modify: `convex/whatsappTemplateUpdate.ts`
- Modify: `convex/whatsappTemplateUpdateHelpers.ts`
- Create: `convex/whatsappTemplateUpdate.test.ts`
- Modify: `convex/whatsappTemplates.ts`

**Interfaces:**
- Internal mutation `beginTemplateUpdate` validates ownership, requires `metaTemplateId`, stores the proposed local components/category, and returns `{ metaTemplateId, existingComponents }`.
- The action performs exactly one Meta POST to `/{metaTemplateId}` and no Meta GET.
- Success and failure reuse the Task 3 completion/failure mutations.

- [ ] **Step 1: Write failing update tests**

Seed a local approved template with `metaTemplateId: 'meta-42'`, mock `fetch`, call `api.whatsappTemplateUpdate.updateTemplateComponents`, and assert:

```ts
expect(fetch).toHaveBeenCalledTimes(1);
expect(fetch).toHaveBeenCalledWith(
  expect.stringMatching(/\/meta-42$/),
  expect.objectContaining({ method: 'POST' }),
);
expect(updated.status).toBe('in_review');
```

Add cases for missing `metaTemplateId`, Meta failure becoming `failed`, and local component merge preserving untouched sections.

- [ ] **Step 2: Run the focused test and verify red**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappTemplateUpdate.test.ts
```

Expected: FAIL because the action still GETs the Meta collection through `resolveRemoteTemplate`.

- [ ] **Step 3: Add the begin-update mutation**

Look up the local row through `by_channelId_and_name_and_language`, verify `orgId`, require `metaTemplateId`, merge updates against local `components`, then patch `status: 'submitting'`, the proposed category/components, clear error, and update `statusUpdatedAt`. Return the stored Meta ID and merged components to the action.

- [ ] **Step 4: Remove remote resolution and finish against local state**

Delete `MetaTemplateRow`, `normalizeLanguage`, and `resolveRemoteTemplate` from `whatsappTemplateUpdateHelpers.ts`. In the action, call `beginTemplateUpdate` before the POST, target `graphBase()/${metaTemplateId}`, and call `completeTemplateSubmission` or `failTemplateSubmission`. Preserve media preparation for media-header updates.

- [ ] **Step 5: Run focused tests and commit**

Run Task 4 tests; expect PASS. Then:

```bash
git add convex/whatsappTemplates.ts convex/whatsappTemplateUpdate.ts convex/whatsappTemplateUpdateHelpers.ts convex/whatsappTemplateUpdate.test.ts
git commit -m "Update WhatsApp templates from local IDs"
```

---

### Task 5: Apply Meta template status webhooks

**Files:**
- Create: `convex/whatsappTemplateWebhook.ts`
- Create: `convex/whatsappTemplateWebhook.test.ts`
- Modify: `convex/whatsappWebhook.ts`

**Interfaces:**
- Internal mutation `handleTemplateStatusUpdate({ wabaId, event, metaTemplateId, name, language, reason })` returns `{ matched: number, updated: number }`.
- `whatsappWebhook.receive` dispatches `message_template_status_update` before the generic `messages` field guard.

- [ ] **Step 1: Write failing event and matching tests**

Use `convex-test` to seed two channels sharing one WABA and templates matched by Meta ID and by legacy name/language. Assert all mappings:

```ts
test.each([
  ['APPROVED', 'approved'],
  ['REINSTATED', 'approved'],
  ['PENDING', 'in_review'],
  ['IN_APPEAL', 'in_review'],
  ['REJECTED', 'failed'],
  ['PENDING_DELETION', 'failed'],
  ['DELETED', 'failed'],
  ['DISABLED', 'failed'],
  ['FLAGGED', 'failed'],
] as const)('%s maps to %s', async (event, status) => {
  const result = await t.mutation(
    internal.whatsappTemplateWebhook.handleTemplateStatusUpdate,
    webhookArgs(event),
  );
  expect(result.updated).toBe(2);
  expect((await readTemplates()).every((row) => row.status === status)).toBe(true);
});
```

Also cover hyphen/underscore language normalization, persisting the webhook ID on a legacy match, duplicate delivery, unknown-event no-op, missing local match, and stale `PENDING` not downgrading `approved` or `failed`.

- [ ] **Step 2: Run the focused test and verify red**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappTemplateWebhook.test.ts
```

Expected: FAIL because no template-status handler exists.

- [ ] **Step 3: Implement the focused webhook mutation**

Use `channels.by_wabaId.take(50)`. For each channel, first query `by_channelId_and_metaTemplateId.unique()` when the ID is present. If no ID match exists, query the prefix of `by_channelId_and_name_and_language` with channel and trimmed name, `.take(20)`, then compare `normalizeWhatsAppTemplateLanguage`. Persist `metaTemplateId` on a legacy natural-key match.

Map events through `mapMetaTemplateEvent`; return `{ matched: 0, updated: 0 }` for unknown events. Skip identical rows and disallowed stale pending transitions. Patch status, reason/error, and `statusUpdatedAt: Date.now()` otherwise. The dispatcher logs unknown events and zero-match results with only WABA/template identifiers, then still acknowledges the delivery.

- [ ] **Step 4: Dispatch the webhook without enlarging its responsibilities**

Extend `WhatsAppChangeValue` with optional `message_template_id`, `message_template_name`, `message_template_language`, and `reason`. In `receive`, add:

```ts
if (change.field === 'message_template_status_update') {
  const value = change.value;
  if (!entry.id || !value.event || !value.message_template_name || !value.message_template_language) {
    console.warn('WhatsApp template status webhook was malformed');
    continue;
  }
  await ctx.runMutation(
    internal.whatsappTemplateWebhook.handleTemplateStatusUpdate,
    {
      wabaId: entry.id,
      event: value.event,
      metaTemplateId: value.message_template_id,
      name: value.message_template_name,
      language: value.message_template_language,
      reason: value.reason,
    },
  );
  continue;
}
```

Wrap only this mutation call in the existing per-change error logging pattern so malformed template changes do not block unrelated changes.

- [ ] **Step 5: Run focused tests and commit**

Run Task 5 tests; expect PASS. Then:

```bash
git add convex/whatsappTemplateWebhook.ts convex/whatsappTemplateWebhook.test.ts convex/whatsappWebhook.ts
git commit -m "Handle WhatsApp template status webhooks"
```

---

### Task 6: Switch management and detail pages to reactive local data

**Files:**
- Create: `src/components/templates/whatsappTemplateStatus.ts`
- Create: `src/components/templates/whatsappTemplateStatus.test.ts`
- Modify: `src/pages/TemplatesPage.tsx`
- Modify: `src/pages/ChannelWhatsAppTemplatesPage.tsx`
- Modify: `src/pages/TemplateDetailPage.tsx`

**Interfaces:**
- `getWhatsAppTemplateStatusPresentation(status)` returns `{ label, indicatorClassName, pending }`.
- Management pages call `api.whatsappTemplateQueries.listForChannel`.
- Detail calls `api.whatsappTemplateQueries.getForChannelByNameAndLanguage`.

- [ ] **Step 1: Write failing status presentation tests**

```ts
expect(getWhatsAppTemplateStatusPresentation('in_review')).toEqual({
  label: 'In review',
  indicatorClassName: 'bg-amber-500',
  pending: true,
});
expect(getWhatsAppTemplateStatusPresentation('approved').label).toBe('Approved');
expect(getWhatsAppTemplateStatusPresentation('failed').label).toBe('Failed');
expect(getWhatsAppTemplateStatusPresentation('submitting').label).toBe('Submitting');
```

- [ ] **Step 2: Run the focused test and verify red**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/templates/whatsappTemplateStatus.test.ts
```

Expected: FAIL because the presentation helper does not exist.

- [ ] **Step 3: Implement neutral status presentation**

Return neutral badge text/surface metadata with green only for approved, amber for submitting/in-review, and red for failed. Treat legacy `submitted` as `In review` only during migration compatibility.

- [ ] **Step 4: Replace management action loading with subscriptions**

In `TemplatesPage`, remove `useAction`, `useCallback`, loading state, `loadTemplates`, `RefreshCw`, and the Refresh button. Use:

```ts
const templates = useQuery(
  api.whatsappTemplateQueries.listForChannel,
  channelId ? { channelId: channelId as Id<'channels'> } : 'skip',
) ?? [];
const loading = Boolean(channelId) && templatesQuery === undefined;
```

Filter by lowercase local statuses (`approved`, `in_review`, `submitting`, `failed`) and render the shared presentation. Allow opening approved and in-review detail rows; keep submitting and failed rows non-editable with the existing toast feedback.

Apply the same subscription in `ChannelWhatsAppTemplatesPage`, remove its `rows`/`loading` fetch lifecycle and Refresh control, and let creation appear reactively.

- [ ] **Step 5: Replace detail collection loading with one exact query**

In `TemplateDetailPage`, query by active channel, decoded route name, and `lang`. Remove local template array state, `listTemplates`, and post-update refresh. The action result immediately changes local status/components and Convex reactivity updates the view. Change success copy to `Template submitted to Meta for review.`

- [ ] **Step 6: Add source regressions and commit**

Add assertions to the presentation test or a focused source regression proving the three pages contain no `whatsappBroadcast.listTemplates`, no `useAction` for reads, and no Refresh label. Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/templates/whatsappTemplateStatus.test.ts
```

Then:

```bash
git add src/components/templates/whatsappTemplateStatus.ts src/components/templates/whatsappTemplateStatus.test.ts src/pages/TemplatesPage.tsx src/pages/ChannelWhatsAppTemplatesPage.tsx src/pages/TemplateDetailPage.tsx
git commit -m "Read WhatsApp templates from Convex"
```

---

### Task 7: Switch every sending selector and historical detail to local queries

**Files:**
- Modify: `src/pages/AutomationsBroadcastPage.tsx`
- Modify: `src/pages/AutomationsFollowUpPage.tsx`
- Modify: `src/pages/FollowUpDetailPage.tsx`
- Modify: `src/pages/BroadcastDetailPage.tsx`
- Modify: `src/components/workflow/workflowWhatsappTemplates.ts`
- Modify: `convex/whatsappTemplateSendPayload.ts`
- Modify: `convex/whatsappTemplateSendPayload.test.ts`
- Create: `src/components/templates/localWhatsappTemplateConsumers.test.ts`

**Interfaces:**
- Broadcast, Follow-up, and Workflow selectors call only `listApprovedForChannel` and receive no non-approved rows.
- Broadcast Detail calls `getForChannelByNameAndLanguage` so historical preview does not depend on selector status.
- Every actual template send fails before provider dispatch unless its local channel/name/language record is `approved`.

- [ ] **Step 1: Write a failing consumer source regression**

Read all eight former consumers from disk and assert none contains `api.whatsappBroadcast.listTemplates`. Assert selector files contain `api.whatsappTemplateQueries.listApprovedForChannel`, and detail files contain `getForChannelByNameAndLanguage`.

- [ ] **Step 2: Run the focused regression and verify red**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/templates/localWhatsappTemplateConsumers.test.ts
```

Expected: FAIL while the former action consumers remain.

- [ ] **Step 3: Write and run the approved-send guard regression**

Extend `convex/whatsappTemplateSendPayload.test.ts` to call `internal.whatsappTemplateSendPayload.getTemplateSendPayloadContext` with local templates in each status. Assert `approved` returns context and `submitting`, `in_review`, `failed`, legacy `submitted`, and a missing row reject with `WhatsApp template is not approved.`

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappTemplateSendPayload.test.ts
```

Expected: FAIL because the current context query accepts missing and non-approved templates.

- [ ] **Step 4: Enforce local approval at the shared send boundary**

In `getTemplateSendPayloadContext`, require that the exact local row exists, belongs to `args.orgId`, and has `status === 'approved'` before loading media or parameter values:

```ts
if (
  localTemplate === null ||
  localTemplate.orgId !== args.orgId ||
  localTemplate.status !== 'approved'
) {
  throw new Error('WhatsApp template is not approved.');
}
```

This one guard covers Broadcast, Follow-up, Reminder, and Workflow sends because they all build provider payloads through this query. Update existing send-payload fixtures from legacy `submitted` to `approved` where the test is exercising a successful send.

- [ ] **Step 5: Convert Broadcast and Follow-up selectors**

Replace action/loading effects and duplicated `status === 'APPROVED'` filters with conditional `useQuery` calls:

```ts
const templatesQuery = useQuery(
  api.whatsappTemplateQueries.listApprovedForChannel,
  channelId ? { channelId: channelId as Id<'channels'> } : 'skip',
);
const templates = templatesQuery ?? [];
const templatesLoading = Boolean(channelId) && templatesQuery === undefined;
```

Apply this to `AutomationsBroadcastPage`, `AutomationsFollowUpPage`, and `FollowUpDetailPage`. Keep selection reset behavior when channel changes. Because the backend already filters status, do not retain frontend approval filters.

- [ ] **Step 6: Convert Workflow and Broadcast Detail**

In `useWorkflowWhatsappTemplates`, replace action state/effects/toast handling with `listApprovedForChannel`; normalize the returned local rows and return them directly as `approvedTemplates`.

In `BroadcastDetailPage`, replace the full-list action/effect with `getForChannelByNameAndLanguage` using the saved schedule's channel/name/language. Preserve its loading skeleton by checking query `undefined`.

- [ ] **Step 7: Run the focused regressions and commit**

Run both Task 7 test commands; expect PASS. Then:

```bash
git add src/pages/AutomationsBroadcastPage.tsx src/pages/AutomationsFollowUpPage.tsx src/pages/FollowUpDetailPage.tsx src/pages/BroadcastDetailPage.tsx src/components/workflow/workflowWhatsappTemplates.ts src/components/templates/localWhatsappTemplateConsumers.test.ts convex/whatsappTemplateSendPayload.ts convex/whatsappTemplateSendPayload.test.ts
git commit -m "Use approved local templates in selectors"
```

---

### Task 8: Verify, migrate, and prepare the schema narrowing gate

**Files:**
- Modify: `CONTINUITY.md`
- Verify: all files changed in Tasks 1-7

**Interfaces:**
- Produces a verified widen-phase release.
- Does not remove legacy `submitted` or make `statusUpdatedAt` required until every deployment migration is confirmed complete.

- [ ] **Step 1: Prove Meta collection reads are gone**

Run:

```bash
rg -n "message_templates\?fields|whatsappBroadcast\.listTemplates|resolveRemoteTemplate" convex src
```

Expected: no output. Plain POST endpoints for creation remain and are not matched by this command.

- [ ] **Step 2: Prove template debug logging is gone**

Run:

```bash
rg -n "console\.log|meta template from meta|Submitting template|submitted successfully" convex/whatsappBroadcast.ts convex/whatsappTemplates.ts convex/whatsappTemplatesAction.ts convex/whatsappTemplateQueries.ts convex/whatsappTemplateUpdate.ts convex/whatsappTemplateWebhook.ts
```

Expected: no output. Review retained `console.warn` and `console.error` calls to confirm they contain no token, signed URL, payload, component, or customer-message values.

- [ ] **Step 3: Run focused backend and frontend tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappTemplateQueries.test.ts convex/whatsappTemplateMigration.test.ts convex/whatsappTemplateSubmission.test.ts convex/whatsappTemplateUpdate.test.ts convex/whatsappTemplateWebhook.test.ts convex/whatsappTemplateSendPayload.test.ts src/components/templates/whatsappTemplateStatus.test.ts src/components/templates/localWhatsappTemplateConsumers.test.ts
```

Expected: all focused tests PASS.

- [ ] **Step 4: Run complete verification under Node 22**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -p convex/tsconfig.json --noEmit
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/whatsappTemplateLifecycle.ts convex/whatsappTemplateQueries.ts convex/whatsappTemplates.ts convex/whatsappTemplatesAction.ts convex/whatsappTemplateMigration.ts convex/whatsappTemplateWebhook.ts convex/whatsappWebhook.ts convex/whatsappTemplateUpdate.ts convex/whatsappTemplateUpdateHelpers.ts convex/whatsappTemplateSendPayload.ts src/components/templates/whatsappTemplateStatus.ts src/pages/TemplatesPage.tsx src/pages/ChannelWhatsAppTemplatesPage.tsx src/pages/TemplateDetailPage.tsx src/pages/AutomationsBroadcastPage.tsx src/pages/AutomationsFollowUpPage.tsx src/pages/FollowUpDetailPage.tsx src/pages/BroadcastDetailPage.tsx src/components/workflow/workflowWhatsappTemplates.ts
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
git diff --check
```

Expected: every command exits 0. If a repository-wide pre-existing lint issue appears in an oversized legacy page, isolate and report it; do not suppress it.

- [ ] **Step 5: Check modularity and touched file sizes**

```bash
wc -l convex/whatsappTemplateLifecycle.ts convex/whatsappTemplateQueries.ts convex/whatsappTemplates.ts convex/whatsappTemplatesAction.ts convex/whatsappTemplateMigration.ts convex/whatsappTemplateWebhook.ts convex/whatsappTemplateUpdate.ts convex/whatsappTemplateUpdateHelpers.ts src/components/templates/whatsappTemplateStatus.ts
```

Expected: every new or focused backend/helper code file is at most 300 lines; no touched focused module crossed the cap.

- [ ] **Step 6: Dry-run the migration**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex run whatsappTemplateMigration:runBackfillWhatsAppTemplateLifecycle '{"dryRun":true}'
```

Expected: the runner reports the candidate rows without changing deployment data.

- [ ] **Step 7: Run authorized deployment migrations separately**

After explicit user authorization, run development and production migrations one deployment at a time with:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex run whatsappTemplateMigration:runBackfillWhatsAppTemplateLifecycle
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex run --prod whatsappTemplateMigration:runBackfillWhatsAppTemplateLifecycle
```

Confirm each reports completion and query that no `submitted` row or row missing `statusUpdatedAt` remains.

- [ ] **Step 8: Confirm operational webhook subscription**

In Meta App Dashboard, confirm the WhatsApp Business Account webhook subscription includes `message_template_status_update`. Submit one test template and verify the local record progresses `submitting -> in_review -> approved` or `failed` without any template collection GET.

- [ ] **Step 9: Narrow only after every migration is confirmed**

In a follow-up commit, remove `v.literal('submitted')`, make `statusUpdatedAt: v.number()`, remove legacy presentation compatibility, regenerate Convex bindings, and rerun Steps 1-4. Commit:

```bash
git add convex/schema.ts convex/whatsappTemplateLifecycle.ts src/components/templates/whatsappTemplateStatus.ts CONTINUITY.md
git commit -m "Narrow WhatsApp template lifecycle schema"
```

- [ ] **Step 10: Record final receipts**

Update `CONTINUITY.md` with the lifecycle decision, migration outcomes, webhook subscription result, verification totals, and final working set. Keep Snapshot, Done, Working set, and Receipts within their documented caps.
