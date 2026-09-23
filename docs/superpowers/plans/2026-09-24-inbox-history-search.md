# Inbox History Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Search every eligible Inbox contact and historical customer-visible text message, returning Chats and Matched Messages sections without loading Inbox history into the browser.

**Architecture:** Add two compact search projections: a contact document per Inbox summary and a message document per eligible ledger message. Their full-text indexes are scoped by authenticated workspace, selected agent, and connection state. The page switches from its current client-side substring filter to debounced server queries when search text is present; it keeps current newest-first Inbox pagination when search is empty.

**Tech Stack:** Convex schema/search indexes, Convex trigger-wrapped mutations, `@convex-dev/migrations`, React, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-24-inbox-history-search-design.md`

## Global Constraints

- Node.js 22 is required for all scripts and tests.
- Preserve workspace and selected-agent authorization server-side; callers never send a workspace scope.
- Search only incoming/outgoing text messages with non-empty content.
- Exclude disconnected channels immediately through trigger-maintained scope fields.
- Chats returns at most five rows; Matched Messages loads 20 rows per page.
- Empty search keeps the current 50-row newest-first Inbox summary query.
- Code files stay below 300 lines and use no comments unless unavoidable.

## Review Focus

- A personal workspace with `orgId: ""` cannot see another personal workspace's contact or message results.
- Reassigning a conversation moves all of its message-search documents to the new selected-agent scope.
- Disconnecting a channel removes its chats and historical message hits before the mutation completes.
- Repeated matches from the same conversation remain separate Matched Messages rows.
- Highlighting treats punctuation and letter case safely without injecting message content as HTML.

---

### Task 1: Define search projections and their lifecycle helpers

**Files:**
- Modify: `convex/schema.ts:1272-1325,1369-1452`
- Create: `convex/inboxSearchProjection.ts`
- Modify: `convex/triggers.ts:18-73`
- Test: `convex/inboxSearchProjection.test.ts`

**Interfaces:**
- Consumes: `Doc<"inboxConversationSummaries">`, `Doc<"messages">`, and the existing `MutationCtx` trigger context.
- Produces: `upsertInboxChatSearchDocument`, `removeInboxChatSearchDocument`, `upsertInboxMessageSearchDocument`, `removeInboxMessageSearchDocument`, and `refreshInboxMessageSearchDocumentsForConversation`.

- [ ] **Step 1: Write failing projection tests**

```ts
test('creates searchable contact and text-message documents in the conversation scope', async () => {
  await fixture.t.run(async (ctx) => {
    await upsertInboxChatSearchDocument(ctx, fixture.conversationId);
    await upsertInboxMessageSearchDocument(ctx, fixture.messageId);
  });

  expect(await fixture.chatSearch()).toMatchObject({
    conversationId: fixture.conversationId,
    searchText: expect.stringContaining('Aisha'),
    isChannelConnected: true,
  });
  expect(await fixture.messageSearch()).toMatchObject({
    messageId: fixture.messageId,
    content: 'Need to reschedule Friday',
    assignedAgentId: fixture.agentId,
  });
});

test('excludes media-only messages and removes search documents on deletion', async () => {
  // Insert an image message with empty content, then delete a text message.
});
```

- [ ] **Step 2: Run the failing projection test**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --exclude '.worktrees/**' convex/inboxSearchProjection.test.ts`

Expected: FAIL because the search-projection module and tables do not exist.

- [ ] **Step 3: Add schema tables and search indexes**

```ts
inboxChatSearchDocuments: defineTable({
  conversationId: v.id('conversations'),
  orgId: v.string(),
  userId: v.optional(v.string()),
  assignedAgentId: v.optional(v.id('agents')),
  isChannelConnected: v.boolean(),
  searchText: v.string(),
}).index('by_conversationId', ['conversationId']).searchIndex('search_text', {
  searchField: 'searchText',
  filterFields: ['orgId', 'userId', 'assignedAgentId', 'isChannelConnected'],
}),
inboxMessageSearchDocuments: defineTable({
  messageId: v.id('messages'),
  conversationId: v.id('conversations'),
  orgId: v.string(),
  userId: v.optional(v.string()),
  assignedAgentId: v.optional(v.id('agents')),
  isChannelConnected: v.boolean(),
  content: v.string(),
  createdAt: v.number(),
}).index('by_messageId', ['messageId']).index('by_conversationId', ['conversationId']).searchIndex('search_content', {
  searchField: 'content',
  filterFields: ['orgId', 'userId', 'assignedAgentId', 'isChannelConnected'],
}),
```

Implement `inboxSearchProjection.ts` so contact text is built from name, phone, email, and contact address; message documents exist only for non-empty text messages whose current summary exists; and scope changes refresh every message document for that conversation. Register `messages` and `inboxConversationSummaries` triggers so normal writes maintain both tables.

- [ ] **Step 4: Run the projection tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --exclude '.worktrees/**' convex/inboxSearchProjection.test.ts convex/inboxConversationSummary.test.ts`

Expected: PASS, including message eligibility, current scope fields, deletion, reassignment, and channel disconnection propagation.

- [ ] **Step 5: Commit the projection foundation**

```bash
git add convex/schema.ts convex/inboxSearchProjection.ts convex/inboxSearchProjection.test.ts convex/triggers.ts
git commit -m "Add Inbox search projections"
```

### Task 2: Backfill and reconcile existing search documents

**Files:**
- Create: `convex/inboxSearchMigration.ts`
- Test: `convex/inboxSearchMigration.test.ts`

**Interfaces:**
- Consumes: `upsertInboxChatSearchDocument`, `upsertInboxMessageSearchDocument`, and `components.migrations`.
- Produces: `runBackfillInboxSearchDocuments` and `reconcileInboxSearchDocuments`.

- [ ] **Step 1: Write failing migration tests**

```ts
test('backfills contact and eligible message search documents', async () => {
  await backfillInboxSearchDocuments.handler(fixture.ctx, {});
  expect(await fixture.chatSearchDocuments()).toHaveLength(1);
  expect(await fixture.messageSearchDocuments()).toHaveLength(1);
});

test('reconciliation removes a search document for a disconnected conversation', async () => {
  await fixture.disconnectChannel();
  const result = await reconcileInboxSearchDocuments.handler(fixture.ctx, {
    paginationOpts: { cursor: null, numItems: 25 },
    repair: true,
  });
  expect(result.repaired).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the failing migration test**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --exclude '.worktrees/**' convex/inboxSearchMigration.test.ts`

Expected: FAIL because no migration or reconciliation functions exist.

- [ ] **Step 3: Implement resumable backfill and bounded reconciliation**

```ts
export const backfillInboxSearchDocuments = migrations.define({
  table: 'messages',
  batchSize: 25,
  migrateOne: async (ctx, message) => {
    await upsertInboxMessageSearchDocument(ctx, message._id);
  },
});

export const runBackfillInboxSearchDocuments = migrations.runner(
  internal.inboxSearchMigration.backfillInboxSearchDocuments,
);
```

Add a second runner for chat documents and a public reconciliation mutation that scans one bounded page, compares expected documents with stored documents, and repairs only mismatches. New writes are already dual-written by Task 1 before the backfill runs.

- [ ] **Step 4: Run migration tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --exclude '.worktrees/**' convex/inboxSearchMigration.test.ts convex/inboxSearchProjection.test.ts`

Expected: PASS, including idempotent reruns and no stale documents after repair.

- [ ] **Step 5: Commit migration support**

```bash
git add convex/inboxSearchMigration.ts convex/inboxSearchMigration.test.ts convex/convex.config.ts
git commit -m "Add Inbox search backfill"
```

### Task 3: Query authorized Chats and Matched Messages

**Files:**
- Create: `convex/inboxSearch.ts`
- Test: `convex/inboxSearch.test.ts`

**Interfaces:**
- Consumes: the two search projections, `inboxConversationSummaries`, `getAuthContext`, and `paginationOptsValidator`.
- Produces: `searchChatsForCurrentOrg` and `searchMessagesForCurrentOrg` public Convex queries.

- [ ] **Step 1: Write failing query tests**

```ts
test('returns at most five scoped contact matches', async () => {
  const result = await fixture.client.query(api.inboxSearch.searchChatsForCurrentOrg, {
    agentId: fixture.agentId,
    searchQuery: 'aisha',
  });
  expect(result).toHaveLength(5);
  expect(result.every((row) => row.contactName.includes('Aisha'))).toBe(true);
});

test('returns separate message hits with current summary presentation data', async () => {
  const result = await fixture.client.query(api.inboxSearch.searchMessagesForCurrentOrg, {
    agentId: fixture.agentId,
    searchQuery: 'reschedule',
    paginationOpts: { cursor: null, numItems: 20 },
  });
  expect(result.page).toHaveLength(2);
  expect(result.page[0]).toMatchObject({
    matchedMessage: 'Need to reschedule Friday',
    matchedMessageAt: expect.any(Number),
  });
});
```

- [ ] **Step 2: Run the failing query test**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --exclude '.worktrees/**' convex/inboxSearch.test.ts`

Expected: FAIL because the public search queries do not exist.

- [ ] **Step 3: Implement scope-safe full-text queries**

```ts
const search = await ctx.db
  .query('inboxMessageSearchDocuments')
  .withSearchIndex('search_content', (q) =>
    q
      .search('content', args.searchQuery)
      .eq('orgId', orgId)
      .eq('assignedAgentId', args.agentId)
      .eq('isChannelConnected', true),
  )
  .paginate(args.paginationOpts);
```

For personal workspaces, use the same search index with `.eq('userId', userId)` instead of `.eq('orgId', orgId)`. Resolve each returned message hit to its current summary by `conversationId`; omit a hit if the summary has been deleted or no longer matches the requested scope. The contact query uses the chat projection index and returns no more than five current summaries. Validate that the requested agent belongs to the authenticated scope before searching.

- [ ] **Step 4: Run query tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --exclude '.worktrees/**' convex/inboxSearch.test.ts`

Expected: PASS for team and personal scope isolation, agent isolation, disconnection exclusion, five-chat cap, 20-message pages, and repeated hits from one conversation.

- [ ] **Step 5: Commit the search API**

```bash
git add convex/inboxSearch.ts convex/inboxSearch.test.ts
git commit -m "Add Inbox history search queries"
```

### Task 4: Render two-section search results in the Inbox

**Files:**
- Create: `src/components/inbox/InboxSearchResults.tsx`
- Create: `src/components/inbox/inboxSearchHighlight.tsx`
- Modify: `src/pages/ChatsPage.tsx:278-286,499-618,1229-1310`
- Modify: `src/components/inbox/InboxConversationList.tsx:28-234`
- Test: `src/components/inbox/InboxSearchResults.test.tsx`
- Test: `src/pages/ChatsPage.test.tsx`

**Interfaces:**
- Consumes: `api.inboxSearch.searchChatsForCurrentOrg`, `api.inboxSearch.searchMessagesForCurrentOrg`, and the existing Inbox row selection callback.
- Produces: `InboxSearchResults`, which renders `Chats` and `Matched Messages` sections and requests another 20 message hits.

- [ ] **Step 1: Write failing UI tests**

```tsx
test('shows five Chats before Matched Messages and retains repeated conversation hits', () => {
  render(<InboxSearchResults searchQuery="reschedule" chats={chatMatches} messages={messageMatches} />);
  expect(screen.getByText('Chats')).toBeVisible();
  expect(screen.getByText('Matched Messages')).toBeVisible();
  expect(screen.getAllByText('Need to reschedule Friday')).toHaveLength(2);
});

test('uses the matched message date and highlights every search term safely', () => {
  render(<InboxSearchHighlight text="Need to reschedule Friday" query="RESCHEDULE friday" />);
  expect(screen.getByText('reschedule')).toHaveStyle({ fontWeight: '700' });
  expect(screen.getByText('Friday')).toHaveStyle({ fontWeight: '700' });
});
```

- [ ] **Step 2: Run the failing UI tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --exclude '.worktrees/**' src/components/inbox/InboxSearchResults.test.tsx src/pages/ChatsPage.test.tsx`

Expected: FAIL because the search result component and server-search wiring do not exist.

- [ ] **Step 3: Implement debounced server search and two result sections**

```tsx
const deferredSearchQuery = useDeferredValue(searchQuery.trim());
const chatMatches = useQuery(
  api.inboxSearch.searchChatsForCurrentOrg,
  deferredSearchQuery ? { agentId: typedAgentId, searchQuery: deferredSearchQuery } : 'skip',
);
const { results: messageMatches, status, loadMore } = usePaginatedQuery(
  api.inboxSearch.searchMessagesForCurrentOrg,
  deferredSearchQuery ? { agentId: typedAgentId, searchQuery: deferredSearchQuery } : 'skip',
  { initialNumItems: 20 },
);
```

When the query is blank, render the existing pinned/unpinned summary list and its 50-row pagination unchanged. When it is non-empty, render `InboxSearchResults`; preserve row selection, display the matched message timestamp, use React text nodes for highlighting, and provide `Load more messages` only while the message query can continue.

- [ ] **Step 4: Run UI tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --exclude '.worktrees/**' src/components/inbox/InboxSearchResults.test.tsx src/pages/ChatsPage.test.tsx src/components/inbox/InboxConversationList.test.tsx`

Expected: PASS for blank-search fallback, section ordering, date selection, repeated hits, highlight behavior, and message pagination.

- [ ] **Step 5: Commit the Inbox search UI**

```bash
git add src/components/inbox/InboxSearchResults.tsx src/components/inbox/inboxSearchHighlight.tsx src/components/inbox/InboxSearchResults.test.tsx src/pages/ChatsPage.tsx src/pages/ChatsPage.test.tsx src/components/inbox/InboxConversationList.tsx
git commit -m "Add Inbox history search results"
```

### Task 5: Verify development data and release readiness

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: all completed migrations, reconciliation queries, focused test suites, and the active development deployment.
- Produces: verified development search documents and a concise continuity receipt.

- [ ] **Step 1: Deploy with the active development watcher and run the backfill**

```bash
source ~/.nvm/nvm.sh && nvm use 22
bunx convex run --deployment dev inboxSearchMigration:runBackfillInboxSearchDocuments '{}'
```

Expected: the migration starts and reaches `state: "success"` through the migrations component status query.

- [ ] **Step 2: Run a bounded reconciliation audit and repair only if needed**

```bash
source ~/.nvm/nvm.sh && nvm use 22
bunx convex run --deployment dev inboxSearchMigration:reconcileInboxSearchDocuments '{"paginationOpts":{"cursor":null,"numItems":100},"repair":false}'
```

Expected: missing, stale, and duplicate counts are zero after any required repair pass.

- [ ] **Step 3: Run focused verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --exclude '.worktrees/**' convex/inboxSearchProjection.test.ts convex/inboxSearchMigration.test.ts convex/inboxSearch.test.ts src/components/inbox/InboxSearchResults.test.tsx src/pages/ChatsPage.test.tsx && bunx tsc -b --pretty false && git diff --check`

Expected: all focused tests, TypeScript, and whitespace validation pass.

- [ ] **Step 4: Record the verified development outcome**

Add a dated `[TOOL]` receipt to `CONTINUITY.md` recording the completed development migration and reconciliation result. Do not add a production changelog entry until this feature is released.

## Plan Self-Review

- Spec coverage: Tasks 1-3 cover searchable projections, scope, indexes, immediate lifecycle updates, and migrations; Task 4 covers both result sections, limits, timestamps, highlighting, and blank-query behavior; Task 5 covers development backfill, audit, and verification.
- Placeholder scan: no implementation placeholders are present.
- Type consistency: all tasks use the same `inboxChatSearchDocuments`, `inboxMessageSearchDocuments`, and exported helper/query names.
- Review focus: each listed failure mode is covered by the Task 1, Task 3, or Task 4 test steps.
