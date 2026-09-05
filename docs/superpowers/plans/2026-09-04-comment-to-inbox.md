# Comment-to-Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a feature-gated Comment-to-Inbox experience that converts qualifying Instagram and Messenger comments into private inbox messages, with optional public replies and automation reporting.

**Architecture:** Isolate automation configuration and delivery state in three Convex tables. Normalize both Meta comment webhook shapes into a shared ingestion service that persists the customer/conversation before a worker sends the private message and optional public reply. Add one concise dashboard route with a create/edit modal and a paginated detail activity list.

**Tech Stack:** React, React Router, shadcn/ui, PostHog, Convex, Meta Graph API, Vitest, Node 22.

**Spec:** `docs/superpowers/specs/2026-09-04-comment-to-inbox-design.md`

## Global Constraints

- The navigation label is exactly `Comment-to-Inbox`; persisted records use `Comment automation` terminology.
- Show the feature only when `enable_comment_to_inbox` is enabled and the authenticated email equals `leykwan132@gmail.com` case-insensitively.
- Free workspaces may store one automation total; paid workspaces are unlimited. Enforce the limit server-side.
- A automation has one or more connected Instagram/Messenger pages, `any_comment` or `keywords` trigger, a required private message, and optional public reply.
- Persist the customer and conversation before sending either reply.
- Treat duplicate comment deliveries idempotently and increment sent/responded counters transactionally only once.
- Do not add explanatory copy beyond field labels, compact errors, empty states, and button text.
- Keep source files below 300 lines; split by responsibility. Use Node 22 for every command that runs code.

---

## File Structure

- Create `convex/commentAutomations.ts`: authorized automation queries and mutations, including plan-limit enforcement.
- Create `convex/commentAutomationSubscriptions.ts`: comment subscription requests for selected channel resources.
- Create `convex/commentAutomationDelivery.ts`: webhook-normalized matching, customer-first persistence, send orchestration, and response attribution.
- Create `convex/commentAutomationMeta.ts`: Meta Graph request helpers for comment subscriptions, private replies, and public replies.
- Create `convex/commentAutomationTypes.ts`: shared validators and normalized event types.
- Create `src/pages/CommentToInboxPage.tsx`: list, detail, and modal composition.
- Create `src/components/comment-to-inbox/CommentAutomationModal.tsx`: concise create/edit modal.
- Create focused component and Convex test files alongside each module.
- Modify `convex/schema.ts`, `convex/http.ts`, `convex/instagramWebhook.ts`, `convex/messengerWebhook.ts`, `convex/messengerConnect.ts`, `src/lib/posthogFeatureFlags.ts`, `src/components/app-sidebar.tsx`, `src/components/app-sidebar-nav.ts`, `src/main.tsx`, and `CONTINUITY.md`.

### Task 1: Define automation storage, access, and plan limits

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/commentAutomationTypes.ts`
- Create: `convex/commentAutomations.ts`
- Create: `convex/commentAutomations.test.ts`

**Interfaces:**
- Produces `commentAutomations`, `commentAutomationPages`, and `commentAutomationDeliveries` schema tables.
- Produces `api.commentAutomations.list`, `api.commentAutomations.get`, `api.commentAutomations.create`, `api.commentAutomations.update`, and `api.commentAutomations.setActive`.
- Uses `getAuthContext`, `resolveChannelOrgId`, and `getPlanFromStripe` to derive authorization and plan on the server.

- [ ] **Step 1: Write failing Convex tests**

```ts
it('allows one stored automation on Free and rejects a second', async () => {
  await t.mutation(api.commentAutomations.create, freeAutomationInput);
  await expect(t.mutation(api.commentAutomations.create, freeAutomationInput)).rejects.toThrow(
    'Free workspaces can create one Comment automation',
  );
});

it('rejects a selected channel owned by another workspace', async () => {
  await expect(t.mutation(api.commentAutomations.create, otherWorkspaceChannelInput)).rejects.toThrow(
    'Selected page is unavailable',
  );
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/commentAutomations.test.ts`

Expected: FAIL because the module and schema tables do not exist.

- [ ] **Step 3: Add validators and indexed tables**

```ts
const commentTriggerValidator = v.union(v.literal('any_comment'), v.literal('keywords'));
const commentAutomationStatusValidator = v.union(v.literal('inactive'), v.literal('active'));

commentAutomations: defineTable({
  orgId: v.string(), name: v.string(), status: commentAutomationStatusValidator,
  trigger: commentTriggerValidator, keywords: v.array(v.string()),
  privateMessage: v.string(), publicReply: v.optional(v.string()),
  sentCount: v.number(), respondedCount: v.number(), createdByUserId: v.string(),
}).index('by_orgId', ['orgId']),
```

Add `commentAutomationPages` indexed by automation and channel, and `commentAutomationDeliveries` indexed by external comment ID, automation/time, and customer/channel/unresponded state. Implement bounded automation listing and server-side validation that every selected channel is connected Instagram or Messenger in the caller's workspace.

- [ ] **Step 4: Run focused tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/commentAutomations.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the independently testable foundation**

```bash
git add convex/schema.ts convex/commentAutomationTypes.ts convex/commentAutomations.ts convex/commentAutomations.test.ts
git commit -m "feat: add comment automation storage"
```

### Task 2: Add safe Meta subscription and reply primitives

**Files:**
- Create: `convex/commentAutomationMeta.ts`
- Create: `convex/commentAutomationSubscriptions.ts`
- Create: `convex/commentAutomationMeta.test.ts`
- Modify: `convex/messengerConnect.ts`

**Interfaces:**
- Produces `ensureCommentSubscription(channel)` and `sendCommentPrivateReply(channel, commentId, text)`.
- Produces `sendCommentPublicReply(channel, commentId, text)`.
- Produces `internal.commentAutomationSubscriptions.activateAutomationPages`.

- [ ] **Step 1: Write failing request-shape tests**

```ts
it('subscribes a Messenger page to messaging and comment events', async () => {
  await ensureCommentSubscription(messengerChannel);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/subscribed_apps'), expect.objectContaining({ method: 'POST' }));
});

it('sends the private reply with the comment id recipient', async () => {
  await sendCommentPrivateReply(instagramChannel, 'comment-1', 'Thanks');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    recipient: { comment_id: 'comment-1' }, message: { text: 'Thanks' },
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/commentAutomationMeta.test.ts`

Expected: FAIL because the Meta module does not exist.

- [ ] **Step 3: Implement channel-specific Graph helpers**

Implement one module that resolves the Graph endpoint and bearer token from a connected `channels` document, rejects unconnected channels, parses Graph error bodies into compact errors, and returns `{ ok, externalId?, error? }`. Extend Messenger connection subscription fields so existing/new connections include the required comment field. Activation must execute each selected resource subscription and patch its `commentAutomationPages` row to `subscribed` or `failed`; it must not activate the automation until all rows succeed.

- [ ] **Step 4: Run focused tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/commentAutomationMeta.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Meta integration primitives**

```bash
git add convex/commentAutomationMeta.ts convex/commentAutomationSubscriptions.ts convex/commentAutomationMeta.test.ts convex/messengerConnect.ts
git commit -m "feat: subscribe comment automation pages"
```

### Task 3: Normalize comment webhooks and persist eligible deliveries

**Files:**
- Create: `convex/commentAutomationDelivery.ts`
- Create: `convex/commentAutomationDelivery.test.ts`
- Modify: `convex/instagramWebhook.ts`
- Modify: `convex/messengerWebhook.ts`
- Modify: `convex/http.ts`

**Interfaces:**
- Produces `internal.commentAutomationDelivery.ingestComment` with `{ channelId, externalCommentId, authorAddress, text, timestampMs }`.
- Consumes normalized Instagram/Messenger comment events.
- Produces one pending `commentAutomationDeliveries` row per matching automation/comment pair and schedules its sender.

- [ ] **Step 1: Write failing behavior tests**

```ts
it('matches any-comment and case-insensitive keyword automations once', async () => {
  await ingestComment({ text: 'I WANT Pricing', externalCommentId: 'comment-1' });
  expect(await automationDeliveryRows()).toHaveLength(2);
  await ingestComment({ text: 'I WANT Pricing', externalCommentId: 'comment-1' });
  expect(await automationDeliveryRows()).toHaveLength(2);
});

it('creates the customer and conversation before queuing delivery', async () => {
  await ingestComment(commentInput);
  expect(await customerFor(commentInput.authorAddress)).not.toBeNull();
  expect(await conversationFor(commentInput.authorAddress)).not.toBeNull();
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/commentAutomationDelivery.test.ts`

Expected: FAIL because comment ingestion is not registered.

- [ ] **Step 3: Implement normalized ingestion**

Parse only supported comment change events in each webhook; preserve existing DM behavior. Resolve the connected channel from the receiving Instagram account or Messenger page, use an index on external comment ID for idempotency, and use the existing internal inbox ingestion path to upsert customer/conversation before inserting delivery rows. Match `any_comment` directly and match `keywords` by lower-casing the comment and every non-empty keyword. Schedule delivery only for rows created in this transaction.

- [ ] **Step 4: Run focused tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/commentAutomationDelivery.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit webhook ingestion**

```bash
git add convex/commentAutomationDelivery.ts convex/commentAutomationDelivery.test.ts convex/instagramWebhook.ts convex/messengerWebhook.ts convex/http.ts
git commit -m "feat: ingest comment automation events"
```

### Task 4: Send replies and attribute customer responses

**Files:**
- Modify: `convex/commentAutomationDelivery.ts`
- Modify: `convex/instagramWebhook.ts`
- Modify: `convex/messengerWebhook.ts`
- Create: `convex/commentAutomationResponse.test.ts`

**Interfaces:**
- Produces `internal.commentAutomationDelivery.sendDelivery({ deliveryId })`.
- Produces `internal.commentAutomationDelivery.recordCustomerResponse({ channelId, contactAddress, timestampMs })`.
- Consumes Task 2 Meta helpers and Task 3 delivery rows.

- [ ] **Step 1: Write failing outcome tests**

```ts
it('increments sent only after the private reply succeeds', async () => {
  await sendDelivery(privateSuccessPublicFailureDelivery);
  expect(await automationCounters()).toEqual({ sentCount: 1, respondedCount: 0 });
  expect(await publicReplyStatus()).toBe('failed');
});

it('attributes one later customer DM and never double-counts it', async () => {
  await recordCustomerResponse(responseInput);
  await recordCustomerResponse(responseInput);
  expect(await automationCounters()).toEqual({ sentCount: 1, respondedCount: 1 });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/commentAutomationResponse.test.ts`

Expected: FAIL because delivery sending and response attribution do not exist.

- [ ] **Step 3: Implement transactional outcome updates**

The sender reads the delivery/channel context, sends the required private reply first, persists a failed outcome with the Meta reason when it fails, then sends public reply only when configured. On private success, patch the delivery with `sentAt` and increment the owning automation's `sentCount` in one mutation. On customer-originated inbound DMs, query the oldest successful unresolved delivery for the same channel/contact address and atomically set `respondedAt` and increment `respondedCount`. Call the response hook only after the existing inbound DM ingest succeeds.

- [ ] **Step 4: Run focused tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/commentAutomationResponse.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit delivery outcomes**

```bash
git add convex/commentAutomationDelivery.ts convex/commentAutomationResponse.test.ts convex/instagramWebhook.ts convex/messengerWebhook.ts
git commit -m "feat: send comment automation replies"
```

### Task 5: Gate the sidebar and route

**Files:**
- Modify: `src/lib/posthogFeatureFlags.ts`
- Modify: `src/components/app-sidebar.tsx`
- Modify: `src/components/app-sidebar-nav.ts`
- Modify: `src/main.tsx`
- Create: `src/router/CommentToInboxFeatureRoute.tsx`
- Create: `src/router/CommentToInboxFeatureRoute.test.tsx`

**Interfaces:**
- Produces `useEnableCommentToInboxFeature()` and `CommentToInboxFeatureRoute`.
- Adds `/dashboard/:agentId/comment-to-inbox` above the Tools group.

- [ ] **Step 1: Write failing route and navigation tests**

```tsx
it('renders Comment-to-Inbox above Tools only for the flagged allowed email', () => {
  renderSidebar({ flag: true, email: 'leykwan132@gmail.com' });
  expect(screen.getByText('Comment-to-Inbox')).toBeInTheDocument();
  expect(sidebarText()).toMatch(/Comment-to-Inbox[\s\S]*Tools/);
});

it('redirects an unallowed user away from the route', () => {
  renderRoute({ flag: true, email: 'other@example.com' });
  expect(screen.queryByText('Comment-to-Inbox')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/router/CommentToInboxFeatureRoute.test.tsx`

Expected: FAIL because no flag, route, or nav item exists.

- [ ] **Step 3: Implement dual client gating**

Add `enableCommentToInbox` to the PostHog flag map and use the existing email allowlist helper pattern. Introduce a sidebar group immediately before Tools containing the single item, then add a route guard that redirects unavailable users to the dashboard overview. Preserve permission checking by using an existing automation-management permission for the item.

- [ ] **Step 4: Run focused tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/router/CommentToInboxFeatureRoute.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit release gating**

```bash
git add src/lib/posthogFeatureFlags.ts src/components/app-sidebar.tsx src/components/app-sidebar-nav.ts src/main.tsx src/router/CommentToInboxFeatureRoute.tsx src/router/CommentToInboxFeatureRoute.test.tsx
git commit -m "feat: gate Comment-to-Inbox navigation"
```

### Task 6: Build the minimal automation list, modal, and detail activity

**Files:**
- Create: `src/pages/CommentToInboxPage.tsx`
- Create: `src/components/comment-to-inbox/CommentAutomationModal.tsx`
- Create: `src/components/comment-to-inbox/CommentAutomationList.tsx`
- Create: `src/components/comment-to-inbox/CommentAutomationDetail.tsx`
- Create: `src/pages/CommentToInboxPage.test.tsx`

**Interfaces:**
- Consumes the Task 1 automation queries/mutations and Task 2 page subscription state.
- Produces a list page with a create/edit modal and in-page automation detail state.

- [ ] **Step 1: Write failing UI tests**

```tsx
it('creates a keyword automation from one compact modal', async () => {
  render(<CommentToInboxPage />);
  await user.click(screen.getByRole('button', { name: 'Create automation' }));
  await user.click(screen.getByLabelText('Keywords'));
  await user.type(screen.getByLabelText('Keywords'), 'price, pricing');
  await user.click(screen.getByRole('button', { name: 'Save automation' }));
  expect(createAutomation).toHaveBeenCalledWith(expect.objectContaining({ trigger: 'keywords' }));
});

it('shows sent, responded, and page subscription errors in automation detail', () => {
  render(<CommentToInboxPage />);
  expect(screen.getByText('Sent')).toBeInTheDocument();
  expect(screen.getByText('Responded')).toBeInTheDocument();
  expect(screen.getByText('Reconnect page')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/CommentToInboxPage.test.tsx`

Expected: FAIL because the route page and modal do not exist.

- [ ] **Step 3: Implement concise UI composition**

Use one dialog modal with Name, Pages, Trigger, Keywords conditional on trigger, Private message, a compact `Reply publicly` switch, and conditional Public reply field. Do not add wizard steps or instructional paragraphs. The list provides name, state, sent, and responded. Clicking a row opens detail in the same page with settings, selected-page subscription health, an active switch, and paginated delivery rows. Show the free-plan limit as a disabled create action with an Upgrade button.

- [ ] **Step 4: Run focused tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/CommentToInboxPage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the user interface**

```bash
git add src/pages/CommentToInboxPage.tsx src/components/comment-to-inbox src/pages/CommentToInboxPage.test.tsx
git commit -m "feat: add Comment-to-Inbox automation UI"
```

### Task 7: Verify the completed feature and record continuity

**Files:**
- Modify: `CONTINUITY.md`
- Modify: `kilobot-docs/docs/releases/changelog.mdx` only if production availability is confirmed during this task.

- [ ] **Step 1: Run focused tests together**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/commentAutomations.test.ts convex/commentAutomationMeta.test.ts convex/commentAutomationDelivery.test.ts convex/commentAutomationResponse.test.ts src/router/CommentToInboxFeatureRoute.test.tsx src/pages/CommentToInboxPage.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run targeted static checks**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/commentAutomations.ts convex/commentAutomationTypes.ts convex/commentAutomationMeta.ts convex/commentAutomationSubscriptions.ts convex/commentAutomationDelivery.ts convex/instagramWebhook.ts convex/messengerWebhook.ts src/lib/posthogFeatureFlags.ts src/components/app-sidebar.tsx src/components/app-sidebar-nav.ts src/router/CommentToInboxFeatureRoute.tsx src/pages/CommentToInboxPage.tsx src/components/comment-to-inbox`

Expected: PASS.

- [ ] **Step 3: Run generated API and diff validation**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen && git diff --check`

Expected: Convex API types regenerate and the diff has no whitespace errors. If `CONVEX_DEPLOYMENT` is unavailable, record that exact block without editing generated types manually.

- [ ] **Step 4: Update the continuity ledger**

Record the completed unshipped feature, feature flag and email gate, automation limit, Meta subscription behavior, tests run, and any external configuration block. Keep the snapshot, recent work, working set, and receipts within their stated caps.

- [ ] **Step 5: Commit verification and documentation**

```bash
git add CONTINUITY.md
git commit -m "docs: record Comment-to-Inbox implementation"
```

## Self-review

- Spec coverage: Tasks 1–4 cover configuration, page subscriptions, customer-first event processing, both reply actions, counters, and response attribution. Tasks 5–6 cover the exact feature gate, route placement, minimal modal, list, and detail. Task 7 covers verification and continuity.
- Placeholder scan: no deferred implementation language is present.
- Type consistency: automation configuration uses `status`, `trigger`, `keywords`, `privateMessage`, `publicReply`, `sentCount`, and `respondedCount` consistently; delivery orchestration uses `deliveryId`, `channelId`, `contactAddress`, and `timestampMs` consistently.
