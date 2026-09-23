# Inbox Conversation Summary Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Inbox's broad 400-conversation/customer-join subscription with a correct, compact, paginated summary read model.

**Architecture:** `inboxConversationSummaries` is a denormalized, indexed read model built from conversations and list-visible related state. Trigger-wrapped mutations update it atomically, a migration creates historical rows, and reconciliation detects external or historical drift. The Inbox switches to a 50-item `usePaginatedQuery` list with automatic and manual load-more controls while full records remain selected-row reads.

**Tech Stack:** Convex schema, `convex-helpers` triggers and React pagination, `@convex-dev/migrations`, React, Vitest, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-23-inbox-conversation-summary-pagination-design.md`

## Global Constraints

- Use Node 22 for every script or test command: `source ~/.nvm/nvm.sh && nvm use 22` in the same shell sequence.
- `conversations`, `customers`, channels, booking sessions, and calendar events remain sources of truth; summaries are read-only derived state.
- Trigger synchronization is atomic for all application mutations that write tracked source tables.
- Dashboard/import writes do not run application triggers and must be detected by reconciliation.
- Preserve current Inbox selection, filtering, sorting, booking, escalation, permission, and responsive behavior.
- Keep production code modular and below 300 lines per code file.
- Do not add fallback values that mask a failed synchronization or missing source record.

## Review Focus

- A conversation write through an unwrapped mutation must fail CI before it can bypass summary synchronization.
- Deleting a conversation, disconnecting a channel, or deleting a linked record must remove or hide its summary rather than leaving an Inbox ghost row.
- Customer tags and lead temperature must update every linked Inbox row, including more than one conversation for a customer.
- A booking session or calendar event becoming cancelled must remove the booking marker without waiting for a conversation write.
- Pagination must not issue duplicate loads when the sentinel remains visible and must offer an accessible manual fallback.

---

## File Structure

- Create `convex/inboxConversationSummary.ts`: summary data shape, source-to-summary builder, atomic upsert/delete helpers, trigger registrations, and bounded reconciliation helpers.
- Create `convex/inboxConversationSummaryMigration.ts`: resumable historical summary backfill and runner.
- Create `convex/inboxConversationSummary.test.ts`: trigger, builder, and reconciliation regression coverage.
- Create `convex/inboxConversationSummaryMigration.test.ts`: backfill input and idempotence coverage.
- Modify `convex/schema.ts`: define the compact summary table and its lookup/pagination indexes.
- Modify `convex/triggers.ts`: register summary triggers and export the tracked-table-safe mutation wrappers.
- Modify `convex/conversations.ts`: add the authenticated paginated summary query; retire only consumers after their replacements are live.
- Modify tracked-source mutation entrypoints under `convex/{conversations,customers,channels,chat,appointmentBooking,googleCalendar,webWidgetCore}.ts`: import the trigger-wrapped mutation export wherever their execution path writes a tracked source table.
- Modify `convex/appointmentBooking/currentBooking.ts`: consume summary-backed booking identifiers after summary correctness is in place.
- Create `convex/appointmentBooking/currentBooking.test.ts`: summary-backed booking-ID query regression coverage.
- Modify `src/pages/ChatsPage.tsx`: subscribe to the paginated summary query rather than the eager linked-conversation query.
- Modify `src/components/inbox/InboxConversationList.tsx`: render the load-more sentinel, loading state, and fallback button.
- Create or modify focused Inbox list tests next to `src/pages/ChatsPage.tsx` and `src/components/inbox/InboxConversationList.tsx` using the repository's existing test naming convention.
- Create `src/pages/ChatsPage.test.tsx`: selected-conversation stability after an Inbox page append.
- Modify `eslint.config.js`: prevent raw mutation-wrapper imports in application modules that write tracked source tables.

### Task 1: Define and test the compact summary model

**Files:**
- Create: `convex/inboxConversationSummary.ts`
- Create: `convex/inboxConversationSummary.test.ts`
- Modify: `convex/schema.ts`

**Interfaces:**
- Produces `upsertInboxConversationSummary(ctx, conversationId): Promise<void>` and `removeInboxConversationSummary(ctx, conversationId): Promise<void>`.
- Produces `refreshInboxSummariesForCustomer(ctx, customerId)`, `refreshInboxSummariesForChannel(ctx, channelId)`, and `refreshInboxSummariesForCalendarEvent(ctx, calendarEventId)` for trigger handlers.
- Produces an `inboxConversationSummaries` row keyed by `conversationId`, indexed by conversation, customer, channel, workspace/agent/connection/last-message time, and personal-workspace/agent/connection/last-message time.

- [ ] **Step 1: Write failing builder tests**

```ts
test('builds one compact connected Inbox row from a conversation and customer', async () => {
  const summary = await readSummaryForFixture(fixture);
  expect(summary).toMatchObject({
    conversationId: fixture.conversationId,
    contactName: 'Ada',
    tags: ['VIP'],
    leadTemperature: 'Hot',
    hasBooking: false,
    isEscalated: false,
    isChannelConnected: true,
  });
});

test('removes the row when its conversation is deleted', async () => {
  await deleteFixtureConversation(fixture);
  expect(await readSummaryForFixture(fixture)).toBeNull();
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/inboxConversationSummary.test.ts`

Expected: FAIL because the summary table and builder do not exist.

- [ ] **Step 3: Add the schema and builder**

Define the row as a compact list shape, including `conversationId`, `customerId`, `channelId`, `orgId`, optional `userId`, optional `assignedAgentId`, `contactName`, `service`, `lastMessagePreview`, `lastMessageAt`, `unreadCount`, `status`, optional `assignedUserId`, `tags`, optional `leadTemperature`, `isEscalated`, `hasBooking`, and `isChannelConnected`. The builder must read the current source records, exclude playground conversations, calculate booking state with the same completed/uncancelled semantics as `appointmentBooking/currentBooking.ts`, and upsert exactly one row via the `by_conversationId` index.

- [ ] **Step 4: Add source-change cases to the same test file**

```ts
test('refreshes every linked row after customer tag and temperature changes', async () => {
  await updateFixtureCustomer({ tags: ['Returning'], leadTemperature: 'Warm' });
  expect(await readSummariesForCustomer(fixture.customerId)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ tags: ['Returning'], leadTemperature: 'Warm' }),
    ]),
  );
});

test('clears the booking marker after its calendar event is cancelled', async () => {
  await cancelFixtureCalendarEvent(fixture.calendarEventId);
  expect(await readSummaryForFixture(fixture)).toMatchObject({ hasBooking: false });
});
```

- [ ] **Step 5: Run the focused model tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/inboxConversationSummary.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the independently testable data model**

```bash
git add convex/schema.ts convex/inboxConversationSummary.ts convex/inboxConversationSummary.test.ts
git commit -m "Add inbox conversation summary model"
```

### Task 2: Make application writes atomic and externally auditable

**Files:**
- Modify: `convex/triggers.ts`
- Modify: `eslint.config.js`
- Modify: tracked production mutation entrypoints in `convex/conversations.ts`, `convex/customers.ts`, `convex/channels.ts`, `convex/chat/inbox.ts`, `convex/chat/threads.ts`, `convex/chat/streaming.ts`, `convex/appointmentBooking/*.ts`, `convex/googleCalendar/*.ts`, `convex/webWidgetCore.ts`, `convex/avatar.ts`, `convex/customerImportPool.ts`, and their root mutation callers.
- Modify: `convex/inboxConversationSummary.test.ts`

**Interfaces:**
- Consumes the Task 1 refresh helpers.
- Produces trigger registrations for `conversations`, `customers`, `channels`, `appointmentBookingSessions`, and `calendarEvents`.
- Produces an enforced convention: tracked source-table writes execute through the trigger-wrapped `mutation` or `internalMutation` export from `convex/triggers.ts`.

- [ ] **Step 1: Write failing atomicity and coverage tests**

```ts
test('rolls back a source write when the summary trigger throws', async () => {
  await expect(writeFixtureConversationWithFailingSummary()).rejects.toThrow(
    'Inbox summary synchronization failed',
  );
  expect(await readFixtureConversation()).toBeNull();
});

test('production tracked-table writer entrypoints use the trigger mutation wrapper', () => {
  expect(listUnwrappedTrackedTableWriters()).toEqual([]);
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/inboxConversationSummary.test.ts`

Expected: FAIL because the new triggers are not registered and tracked writers still bypass the wrapper.

- [ ] **Step 3: Register triggers and migrate all tracked writer entrypoints**

Register source-table triggers in `convex/triggers.ts`. The conversation trigger creates, updates, or removes one summary; customer/channel/session/calendar-event triggers locate associated summaries through their indexes and refresh them. Do not register a trigger for the summary table itself.

For every production mutation path that writes a tracked table, replace raw `mutation`/`internalMutation` imports with the trigger-wrapped exports. Preserve raw `query` and `action` imports. Add the ESLint restriction and the structural test so new tracked-table writers cannot be merged without the wrapper.

- [ ] **Step 4: Add all source-state regression tests**

```ts
test.each([
  'message preview and unread count',
  'assignment and escalation',
  'channel disconnect and reconnect',
  'booking session lifecycle',
  'calendar event cancellation',
])('keeps the summary current after %s', async (change) => {
  await applyFixtureChange(change);
  expect(await summaryMatchesSource(fixture.conversationId)).toBe(true);
});
```

- [ ] **Step 5: Run focused trigger and lint tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/inboxConversationSummary.test.ts && bunx eslint convex/triggers.ts convex/inboxConversationSummary.ts`

Expected: PASS.

- [ ] **Step 6: Commit synchronization coverage**

```bash
git add convex/triggers.ts eslint.config.js convex/inboxConversationSummary.test.ts convex/conversations.ts convex/customers.ts convex/channels.ts convex/chat convex/appointmentBooking convex/googleCalendar convex/webWidgetCore.ts convex/avatar.ts convex/customerImportPool.ts
git commit -m "Synchronize inbox summaries with source writes"
```

### Task 3: Backfill and reconcile summaries before reader cutover

**Files:**
- Create: `convex/inboxConversationSummaryMigration.ts`
- Create: `convex/inboxConversationSummaryMigration.test.ts`
- Modify: `convex/inboxConversationSummary.ts`

**Interfaces:**
- Consumes `upsertInboxConversationSummary` from Task 1.
- Produces `runBackfillInboxConversationSummaries` and private bounded reconciliation/repair functions.

- [ ] **Step 1: Write failing migration and reconciliation tests**

```ts
test('backfill creates a summary for a legacy conversation and is idempotent', async () => {
  await runBackfillForFixtureConversation();
  await runBackfillForFixtureConversation();
  expect(await countSummaries(fixture.conversationId)).toBe(1);
});

test('reconciliation reports and repairs a stale summary', async () => {
  await corruptFixtureSummary();
  expect(await reconcileFixture({ repair: false })).toMatchObject({ stale: 1 });
  expect(await reconcileFixture({ repair: true })).toMatchObject({ repaired: 1 });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/inboxConversationSummaryMigration.test.ts`

Expected: FAIL because the migration and reconciliation runner do not exist.

- [ ] **Step 3: Implement the resumable migration and bounded reconciliation**

Use `Migrations<DataModel>(components.migrations)` with a conservative conversation batch size. The migration invokes the shared builder for each source conversation. Reconciliation must process a bounded page of conversation IDs, return missing/duplicate/stale counts, and only repair rows when explicitly requested. It must never run from the Inbox query.

- [ ] **Step 4: Run migration tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/inboxConversationSummaryMigration.test.ts convex/inboxConversationSummary.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit migration support**

```bash
git add convex/inboxConversationSummaryMigration.ts convex/inboxConversationSummaryMigration.test.ts convex/inboxConversationSummary.ts
git commit -m "Add inbox summary backfill and reconciliation"
```

### Task 4: Expose the indexed paginated Inbox reader

**Files:**
- Modify: `convex/conversations.ts`
- Modify: `convex/appointmentBooking/currentBooking.ts`
- Create: `convex/appointmentBooking/currentBooking.test.ts`
- Modify: `convex/inboxConversationSummary.test.ts`

**Interfaces:**
- Produces `conversations.listInboxSummariesForCurrentOrg({ agentId?, paginationOpts })` returning Convex pagination results of compact, connected, non-playground summary rows.
- Produces a summary-backed booking-ID reader or removes the current broad helper consumer after the summary query is live.

- [ ] **Step 1: Write failing reader tests**

```ts
test('paginates only connected summaries for the caller workspace', async () => {
  const firstPage = await listInboxSummaries({ numItems: 2, cursor: null });
  expect(firstPage.page).toHaveLength(2);
  expect(firstPage.page.every((row) => row.isChannelConnected)).toBe(true);
});

test('scopes agent Inbox rows without reading another agent summary', async () => {
  expect(await listInboxSummariesForAgent(fixture.agentId)).toEqual([
    expect.objectContaining({ assignedAgentId: fixture.agentId }),
  ]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/inboxConversationSummary.test.ts`

Expected: FAIL because the paginated reader does not exist.

- [ ] **Step 3: Implement the reader and replace companion scans**

Use `paginationOptsValidator` and the summary scope indexes, ordered by `lastMessageAt` descending. Authenticate and authorize with the same Inbox access rules as the current reader. Return only list-row fields. Replace `listActiveBookingConversationIdsForCurrentOrg`'s shared 400-row helper scan with summary-backed state. Preserve the old linked reader until the production migration/reconciliation gate succeeds.

- [ ] **Step 4: Run reader regressions**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/inboxConversationSummary.test.ts convex/appointmentBooking/currentBooking.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the paginated reader**

```bash
git add convex/conversations.ts convex/appointmentBooking/currentBooking.ts convex/inboxConversationSummary.test.ts
git commit -m "Add paginated inbox summary reader"
```

### Task 5: Render Inbox pages incrementally with accessible load more

**Files:**
- Modify: `src/pages/ChatsPage.tsx`
- Modify: `src/components/inbox/InboxConversationList.tsx`
- Create: `src/components/inbox/InboxConversationList.test.tsx`
- Create: `src/pages/ChatsPage.test.tsx`

**Interfaces:**
- Consumes `listInboxSummariesForCurrentOrg` with `{ initialNumItems: 50 }`.
- Consumes `loadMore(50)` and paginated status values from `usePaginatedQuery`.
- Produces an Inbox list that renders the same `Chat` row shape and loads subsequent pages once per visible sentinel.

- [ ] **Step 1: Write failing load-more component tests**

```tsx
test('loads another page when the end sentinel enters view', async () => {
  renderInboxList({ paginationStatus: 'CanLoadMore' });
  triggerEndSentinelIntersection();
  expect(loadMore).toHaveBeenCalledWith(50);
});

test('offers a manual load-more button and hides both controls when done', () => {
  const { rerender } = renderInboxList({ paginationStatus: 'CanLoadMore' });
  expect(screen.getByRole('button', { name: 'Load more conversations' })).toBeVisible();
  rerenderInboxList({ paginationStatus: 'Exhausted' });
  expect(screen.queryByRole('button', { name: 'Load more conversations' })).toBeNull();
});
```

- [ ] **Step 2: Run the component test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/InboxConversationList.test.tsx`

Expected: FAIL because the list has no pagination controls.

- [ ] **Step 3: Implement the client query and controls**

Replace `linkedConversations` with `usePaginatedQuery(api.conversations.listInboxSummariesForCurrentOrg, args, { initialNumItems: 50 })`. Preserve the existing row mapping and selected-detail query. Pass pagination status and `onLoadMore` to `InboxConversationList`. Add a callback-ref-owned `IntersectionObserver` that disconnects before observing a replacement sentinel and only calls `loadMore(50)` when status is `CanLoadMore`. Render `Loading more conversations…` for `LoadingMore` and the fallback button only for `CanLoadMore`.

- [ ] **Step 4: Add behavior regressions**

```tsx
test('does not request another page while a page is already loading', () => {
  renderInboxList({ paginationStatus: 'LoadingMore' });
  triggerEndSentinelIntersection();
  expect(loadMore).not.toHaveBeenCalled();
});

test('keeps the selected conversation open after a new page is appended', async () => {
  renderChatsPageWithSelectedConversation();
  appendSecondPage();
  expect(await screen.findByText('Selected customer')).toBeVisible();
});
```

- [ ] **Step 5: Run focused frontend tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/InboxConversationList.test.tsx src/pages/ChatsPage.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the Inbox cutover**

```bash
git add src/pages/ChatsPage.tsx src/components/inbox/InboxConversationList.tsx src/components/inbox/InboxConversationList.test.tsx src/pages/ChatsPage.test.tsx
git commit -m "Paginate inbox conversation list"
```

### Task 6: Deploy safely, cut over, and measure

**Files:**
- Modify: `CONTINUITY.md`
- Modify: `kilobot-docs/docs/releases/changelog.mdx` only after confirmed production availability.

**Interfaces:**
- Consumes the migration runner and private reconciliation runner from Task 3.
- Consumes the new reader from Task 4.
- Produces a documented rollout receipt and confirmed production I/O comparison.

- [ ] **Step 1: Deploy dual-write schema and trigger code to development**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx convex dev --once`

Expected: schema and functions deploy without validation or type errors.

- [ ] **Step 2: Dry-run and apply the development migration, then reconcile**

Run the generated migration runner with its documented dry-run mode, apply it only after the dry run reports success, then run reconciliation in report mode followed by repair mode only if it reports drift.

Expected: one summary per eligible conversation and zero missing, duplicate, or stale rows after repair.

- [ ] **Step 3: Deploy to production and repeat migration/reconciliation**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx convex deploy --yes`

Expected: dual writes are live before the production backfill begins; record the exact run IDs and reconciliation counts in `CONTINUITY.md`.

- [ ] **Step 4: Enable the summary reader only after production reconciliation succeeds**

Deploy the reader/UI cutover, open the Inbox for a workspace with multiple pages, verify automatic and manual loading, tags, lead temperature, booking, escalation, assignment, channel filters, and selected-thread behavior.

- [ ] **Step 5: Compare Convex I/O after normal Inbox usage**

Use Convex Health/Insights to compare the replaced function's bandwidth, documents read, and subscription reruns against the original `conversations.listLinkedForCurrentOrg` measurement. Record the observed values, not estimates, in `CONTINUITY.md`.

- [ ] **Step 6: Update the release record when availability is confirmed**

Add one customer-facing `Performance improvements` bullet under the production release date only after the change is confirmed live. Do not mention internal table names, triggers, migrations, or tests.

- [ ] **Step 7: Commit rollout documentation**

```bash
git add CONTINUITY.md kilobot-docs/docs/releases/changelog.mdx
git commit -m "Document inbox summary rollout"
```
