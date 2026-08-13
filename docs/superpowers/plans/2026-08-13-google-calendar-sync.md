# Google Calendar Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-scoped primary Google Calendar synchronization through WorkOS Pipes, Google push notifications, privacy-safe Calendar views, and conversation-scoped agent booking writes.

**Architecture:** Convex stays the normalized calendar and booking layer. Focused Google Calendar modules obtain WorkOS-vended credentials, map and synchronize Google events into user-owned records, project those records into authorized team views, and process push notifications as dirty signals for incremental sync. Existing booking entrypoints call a single synchronization service so dashboard and agent operations share idempotency, conflict, availability, and failure behavior.

**Tech Stack:** TypeScript 6, Convex actions/mutations/queries/HTTP actions/crons, React 19, React Router 7, WorkOS AuthKit and Pipes Widgets, Google Calendar REST API v3, Vitest, convex-test, shadcn UI, Bun under Node.js 22.

## Global Constraints

- Read `convex/_generated/ai/guidelines.md` before every task that changes `convex/` code.
- Explicitly run `source ~/.nvm/nvm.sh && nvm use 22` in every test, build, lint, codegen, or script command.
- No application code file may exceed 300 lines. Keep `convex/http.ts`, `convex/crons.ts`, `convex/chat/threads.ts`, and `src/pages/CalendarPage.tsx` as composition-only edits.
- Do not add comments unless a non-obvious external protocol constraint cannot be made self-explanatory through naming and module boundaries.
- Use WorkOS Pipes for OAuth storage and refresh; never persist or log Google access or refresh tokens.
- Use provider slug `google_calendar` and require `https://www.googleapis.com/auth/calendar.events`.
- Version one supports one user-scoped connection and only the user's primary Google Calendar.
- A connection follows the user across every workspace and eligible agent; team projections remain permission-scoped.
- Users who never connect Google retain Kilobot-only calendars. Previously connected but unhealthy calendars fail closed for availability and external writes.
- Customer-facing agents see unrelated external events only as busy intervals and may mutate only Kilobot-created events for the active conversation after explicit confirmation.
- Do not add production changelog entries until production availability is confirmed.
- Do not deploy Convex, change environment values, register production webhook infrastructure, push, or open a pull request unless separately authorized.

## File Structure

### Shared contracts and storage

- `convex/googleCalendar/contracts.ts`: connection, sync, tool-result, event, and error types plus validators.
- `convex/googleCalendar/constants.ts`: provider slug, scope, time windows, freshness limits, channel renewal limit, and Google API base URL.
- `convex/googleCalendar/testFixtures.ts`: complete Google event/page/watch fixtures shared by feature tests.
- `convex/schema.ts`: user-scoped connections, watch channels, sync runs, write operations, and external-event ownership fields and indexes.

### Provider and synchronization boundary

- `convex/googleCalendar/workosToken.ts`: WorkOS Pipes credential vending and state classification.
- `convex/googleCalendar/googleClient.ts`: typed Google HTTP boundary, pagination inputs, ETags, and safe error classification.
- `convex/googleCalendar/eventMapping.ts`: timed/all-day/transparent/recurring/deleted event normalization.
- `convex/googleCalendar/eventStore.ts`: idempotent event, participant, and booking-state application mutations.
- `convex/googleCalendar/syncState.ts`: connection locks, dirty generation, page cursors, token advancement, and stale-state queries.
- `convex/googleCalendar/syncWorker.ts`: full and incremental sync orchestration.
- `convex/googleCalendar/syncRecovery.ts`: `410` reset, monthly rolling rebase, and stale-connection sweep.

### Push lifecycle and writes

- `convex/googleCalendar/channelToken.ts`: random token generation, SHA-256 verifier, and constant-time comparison.
- `convex/googleCalendar/watchStore.ts`: pending/active/retiring channel lifecycle mutations and lookups.
- `convex/googleCalendar/watchActions.ts`: create, renew, and stop Google Events watch channels.
- `convex/googleCalendar/webhook.ts`: validate `X-Goog-*` headers, mark dirty, enqueue, and acknowledge.
- `convex/googleCalendar/writeStore.ts`: reserve and reconcile idempotent write operations.
- `convex/googleCalendar/writeActions.ts`: deterministic create, ETag-safe update, and idempotent delete.
- `convex/googleCalendar/bookingSync.ts`: conversation-scoped booking create/update/cancel orchestration.

### Queries, agent tools, and UI

- `convex/googleCalendar/connectionQueries.ts`: current-user status and teammate connection health.
- `convex/googleCalendar/connectionActions.ts`: refresh, enable-after-widget, and disconnect.
- `convex/googleCalendar/calendarProjection.ts`: owner detail versus teammate Busy projection.
- `convex/googleCalendar/agentTools.ts`: busy-only reads and active-conversation mutation guards.
- `src/components/calendar/GoogleCalendarConnectionCard.tsx`: status and actions.
- `src/components/calendar/GoogleCalendarPipesDialog.tsx`: extracted `<Pipes authToken={getAccessToken} />` dialog.
- `src/components/calendar/GoogleCalendarSourceBadge.tsx`: compact source indicator.
- `src/components/calendar/useGoogleCalendarConnection.ts`: connection query, widget-close reconciliation, range-refresh orchestration.
- `kilobot-docs/docs/bookings/calendar.mdx`: customer-facing connection, privacy, synchronization, and recovery guidance.

---

### Task 1: Persist User-Scoped Connection and Synchronization Contracts

**Files:**
- Create: `convex/googleCalendar/constants.ts`
- Create: `convex/googleCalendar/contracts.ts`
- Create: `convex/googleCalendar/testFixtures.ts`
- Create: `convex/googleCalendarSchema.test.ts`
- Modify: `convex/schema.ts`

**Interfaces:**
- Consumes: existing `users`, `calendarEvents`, `calendarEventParticipants`, and booking-session tables.
- Produces: `GOOGLE_CALENDAR_PROVIDER`, `GOOGLE_CALENDAR_EVENTS_SCOPE`, `CALENDAR_PAGE_FRESHNESS_MS`, `AVAILABILITY_FRESHNESS_MS`, `WATCH_RENEWAL_WINDOW_MS`, `GoogleCalendarConnectionState = "connected" | "syncing" | "needs_reauthorization" | "disconnected"`, `GoogleCalendarOperationResult`, and schema tables/indexes used by every later task.

- [ ] **Step 1: Write the failing schema and contract tests**

Create `convex/googleCalendarSchema.test.ts` with real convex-test inserts that prove:

```ts
test("one Google Calendar connection follows a user across workspaces", async () => {
  const { connectionId, userId, teamIds } = await createUserAcrossTwoTeams();
  const connection = await readConnection(connectionId);
  expect(connection.userId).toBe(userId);
  expect(connection).not.toHaveProperty("teamId");
  expect(teamIds).toHaveLength(2);
});

test("watch replacement channels overlap on one connection", async () => {
  const channels = await insertActiveAndPendingReplacement();
  expect(channels.map((row) => row.state)).toEqual(["active", "pending"]);
});

test("external event identity includes owner and recurring instance", async () => {
  const rows = await insertSameGoogleEventForTwoOwnersAndTwoInstances();
  expect(rows).toHaveLength(4);
});
```

The test fixture builders must insert complete real documents, not partial source-text assertions.

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarSchema.test.ts
```

Expected: FAIL because the Google Calendar schema tables and event ownership fields do not exist.

- [ ] **Step 3: Add constants, validators, and schema tables**

Define exact constants:

```ts
export const GOOGLE_CALENDAR_PROVIDER = "google_calendar" as const;
export const GOOGLE_CALENDAR_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events";
export const CALENDAR_PAGE_FRESHNESS_MS = 5 * 60 * 1000;
export const AVAILABILITY_FRESHNESS_MS = 60 * 1000;
export const WATCH_RENEWAL_WINDOW_MS = 48 * 60 * 60 * 1000;
export const FULL_SYNC_PAST_DAYS = 90;
export const FULL_SYNC_FUTURE_MONTHS = 18;
```

Add:

- `googleCalendarConnections`, unique by `userId` and indexed by `workosUserId`, state, last success, and active watch.
- `googleCalendarWatchChannels`, indexed by connection/state/expiration and channel ID.
- `googleCalendarSyncRuns`, indexed by connection/state and storing dirty generation, request kind, page token, candidate sync token, counters, and stable full-sync bounds.
- `googleCalendarWriteOperations`, unique by operation key and indexed by event/action/state.
- `externalOwnerUserId`, `externalOrigin`, `externalStatus`, `externalTransparency`, `externalCanEdit`, `externalRecurringEventId`, `externalOriginalStartAt`, `externalSyncState`, and `externalOperationKey` on `calendarEvents`.
- An external identity index ordered by team, owner, calendar, Google event, and original start.

Keep legacy fields optional so existing event rows remain valid.

- [ ] **Step 4: Run the schema tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarSchema.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the storage contract**

```bash
git add convex/schema.ts convex/googleCalendar convex/googleCalendarSchema.test.ts
git commit -m "Add Google Calendar sync contracts"
```

---

### Task 2: Obtain WorkOS Credentials and Call Google Safely

**Files:**
- Create: `convex/googleCalendar/workosToken.ts`
- Create: `convex/googleCalendar/googleClient.ts`
- Create: `convex/googleCalendarProvider.test.ts`
- Modify: `convex/workosClient.ts`

**Interfaces:**
- Consumes: `GOOGLE_CALENDAR_PROVIDER`, `GOOGLE_CALENDAR_EVENTS_SCOPE`, `getWorkOSApiKey`, and WorkOS user IDs.
- Produces: `getGoogleCalendarCredential(workosUserId): Promise<GoogleCalendarCredentialResult>` and `googleCalendarRequest<T>(credential, request): Promise<T>` with classified `GoogleCalendarProviderError`.

- [ ] **Step 1: Write failing provider-boundary tests**

Use injected `fetch` implementations to exercise real parsing:

```ts
test("returns an active Google token only when the events scope is present", async () => {
  const result = await getGoogleCalendarCredential("user_123", fetchReturningActiveCredential());
  expect(result).toEqual({ kind: "active", token: "token", expiresAt: "2026-08-14T00:00:00.000Z" });
});

test.each([
  [{ active: false, error: "not_installed" }, "not_connected"],
  [{ active: false, error: "needs_reauthorization" }, "needs_reauthorization"],
  [activeCredentialWithoutRequiredScope(), "needs_reauthorization"],
])("classifies WorkOS credential state", async (payload, expectedKind) => {
  expect((await credentialFromPayload(payload)).kind).toBe(expectedKind);
});

test.each([[401, "needs_reauthorization"], [412, "conflict"], [429, "retryable"], [500, "retryable"]])(
  "classifies Google response %i",
  async (status, expectedKind) => {
    await expect(requestReturning(status)).rejects.toMatchObject({ kind: expectedKind });
  },
);
```

- [ ] **Step 2: Run the provider tests and verify RED**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarProvider.test.ts
```

Expected: FAIL because the provider modules do not exist.

- [ ] **Step 3: Implement the WorkOS and Google boundaries**

Use the WorkOS SDK already pinned in `package.json`:

```ts
const result = await workos.pipes.getAccessToken({
  provider: GOOGLE_CALENDAR_PROVIDER,
  userId: workosUserId,
});
```

Branch on `active` before reading the discriminated fields. Accept the exact installed-SDK access-token shape verified from TypeScript diagnostics; normalize it into `{ token, expiresAt, scopes }`. Do not cache the token.

Implement a single typed Google request helper supporting `GET`, `POST`, `PUT`, and `DELETE`, conditional `If-Match`, empty successful bodies, JSON validation, and safe error categories. Provider response bodies must not be included in thrown customer-visible errors or logs.

- [ ] **Step 4: Run provider tests and scoped TypeScript**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarProvider.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit -p convex/tsconfig.json
```

Expected: PASS.

- [ ] **Step 5: Commit the provider boundary**

```bash
git add convex/workosClient.ts convex/googleCalendar convex/googleCalendarProvider.test.ts
git commit -m "Add Google Calendar provider client"
```

---

### Task 3: Map Google Events and Apply Incremental Synchronization

**Files:**
- Create: `convex/googleCalendar/eventMapping.ts`
- Create: `convex/googleCalendar/eventStore.ts`
- Create: `convex/googleCalendar/syncState.ts`
- Create: `convex/googleCalendar/syncWorker.ts`
- Create: `convex/googleCalendar/syncRecovery.ts`
- Create: `convex/googleCalendarSync.test.ts`

**Interfaces:**
- Consumes: Task 1 tables/contracts and Task 2 credential/client APIs.
- Produces: `mapGoogleEvent`, `markGoogleCalendarDirty`, `runGoogleCalendarSync`, `recoverInvalidSyncToken`, and idempotent local application of paginated changes.

- [ ] **Step 1: Write failing mapping tests**

Cover literal fixtures for:

```ts
test("maps all-day end dates as exclusive", () => {
  expect(mapGoogleEvent(allDayFixture())).toMatchObject({
    allDay: true,
    startDate: "2026-08-13",
    endDate: "2026-08-15",
  });
});

test("transparent events do not block availability", () => {
  expect(mapGoogleEvent(transparentFixture()).blocksAvailability).toBe(false);
});

test("recurring exceptions retain stable instance identity", () => {
  expect(mapGoogleEvent(recurringExceptionFixture())).toMatchObject({
    recurringEventId: "series_1",
    originalStartAt: Date.parse("2026-08-15T09:00:00+08:00"),
  });
});
```

- [ ] **Step 2: Write failing sync integration tests**

Exercise actual sync mutations and action helpers with injected provider pages:

- Initial full sync traverses all `nextPageToken` pages and stores only the final `nextSyncToken`.
- Incremental sync applies creates, updates, and deleted entries.
- A page failure leaves the connection's prior `syncToken` unchanged.
- A notification arriving during a run increments dirty generation and causes a second pass.
- `410 Gone` removes only imported rows for that connection and performs a full sync while preserving Kilobot-originated booking rows.
- A monthly rebase advances the 90-day/18-month window.

- [ ] **Step 3: Run mapping and sync tests and verify RED**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarSync.test.ts
```

Expected: FAIL because event mapping and synchronization are not implemented.

- [ ] **Step 4: Implement idempotent mapping and synchronization**

Use `singleEvents=true`, `showDeleted=true`, stable full-sync bounds, and the same query parameters for every page in a run. Store sync progress in `googleCalendarSyncRuns`; apply each page through bounded internal mutations. Advance `googleCalendarConnections.syncToken` only in the successful finalization mutation.

Upserts must address the full external identity. Cancelled Google entries delete Google-originated projections but mark Kilobot-originated booking records cancelled through the later booking-state helper.

- [ ] **Step 5: Run the sync tests and verify GREEN**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarSync.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit synchronization**

```bash
git add convex/googleCalendar convex/googleCalendarSync.test.ts
git commit -m "Synchronize Google Calendar events"
```

---

### Task 4: Project User Calendar Events into Workspace-Scoped Privacy Views

**Files:**
- Create: `convex/googleCalendar/calendarProjection.ts`
- Create: `convex/googleCalendarProjection.test.ts`
- Modify: `convex/calendarEvents.ts`
- Modify: `convex/appointmentBooking/availability.ts`

**Interfaces:**
- Consumes: synchronized user-owned Google events from Task 3 and existing calendar permissions/team memberships.
- Produces: owner-detail and teammate-Busy query projections plus Google-aware conflict checks across every workspace where the user is eligible.

- [ ] **Step 1: Write failing privacy and cross-workspace tests**

```ts
test("the connection owner receives full Google event details", async () => {
  expect(await listAsOwner()).toMatchObject([{ title: "Private interview", externalOrigin: "google" }]);
});

test("a teammate receives Busy without private fields", async () => {
  expect(await listAsTeammate()).toEqual([
    expect.objectContaining({ title: "Busy", description: undefined, link: undefined }),
  ]);
});

test("one user connection blocks the same slot in two eligible workspaces", async () => {
  expect(await availabilityInWorkspaceA()).toBe(false);
  expect(await availabilityInWorkspaceB()).toBe(false);
});
```

Also prove transparent/cancelled events do not block and owners/admins cannot edit a teammate's Google-originated event.

- [ ] **Step 2: Run privacy tests and verify RED**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarProjection.test.ts convex/calendarEvents.test.ts
```

Expected: FAIL because current reads expose only team rows and availability does not consult user-scoped external events.

- [ ] **Step 3: Implement privacy projection and availability integration**

Extract calendar range loading from `convex/calendarEvents.ts` into the new projection module. Join by eligible team membership and external owner. Build separate result objects for owner and teammate instead of loading full details and redacting in the browser.

Update availability to require a connection refresh no older than `AVAILABILITY_FRESHNESS_MS` when a user has ever enabled Google. Users with no connection continue through the existing local-only check. Connected stale/failed users are unavailable rather than silently ignored.

- [ ] **Step 4: Run privacy and existing calendar tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarProjection.test.ts convex/calendarEvents.test.ts convex/calendarManualBooking.test.ts convex/appointmentBookingComplete.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit privacy projections**

```bash
git add convex/calendarEvents.ts convex/appointmentBooking/availability.ts convex/googleCalendar convex/googleCalendarProjection.test.ts
git commit -m "Project private Google Calendar availability"
```

---

### Task 5: Receive Google Push Notifications and Renew Watch Channels

**Files:**
- Create: `convex/googleCalendar/channelToken.ts`
- Create: `convex/googleCalendar/watchStore.ts`
- Create: `convex/googleCalendar/watchActions.ts`
- Create: `convex/googleCalendar/webhook.ts`
- Create: `convex/googleCalendarWebhook.test.ts`
- Modify: `convex/http.ts`
- Modify: `convex/crons.ts`

**Interfaces:**
- Consumes: connection and sync dirty APIs from Tasks 1 and 3 plus Google provider client from Task 2.
- Produces: `POST /webhook/google-calendar`, `createGoogleCalendarWatch`, `renewExpiringGoogleCalendarWatches`, and `stopGoogleCalendarWatch`.

- [ ] **Step 1: Write failing webhook validation tests**

Construct real `Request` objects with `X-Goog-*` headers and test the HTTP action:

```ts
test("acknowledges a valid notification after durably marking the connection dirty", async () => {
  const response = await receive(validGoogleNotificationRequest());
  expect(response.status).toBe(204);
  expect(await readDirtyGeneration()).toBe(1);
});

test.each(["unknown-channel", "bad-token", "wrong-resource", "expired-channel"])(
  "rejects %s without scheduling",
  async (kind) => {
    const response = await receive(invalidNotificationRequest(kind));
    expect(response.status).toBe(404);
    expect(await scheduledSyncCount()).toBe(0);
  },
);
```

Cover the initial `sync` notification arriving while a channel row is still pending, duplicate message numbers, and bodyless requests.

- [ ] **Step 2: Write failing watch lifecycle tests**

Prove:

- A watch row exists before the external watch call.
- The response activates the pending channel with resource ID and actual expiration.
- Renewal within 48 hours creates a new ID, allows overlap, then retires/stops the old channel.
- Disconnect tolerates an already-expired channel.

- [ ] **Step 3: Run webhook tests and verify RED**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarWebhook.test.ts
```

Expected: FAIL because the webhook and watch lifecycle do not exist.

- [ ] **Step 4: Implement channel security and lifecycle**

Generate 32 random bytes with Web Crypto, send the encoded token to Google, store only SHA-256, and compare decoded digests using constant-time byte comparison. The receiver accepts `sync`, `exists`, and `not_exists`, records message numbers for diagnostics, calls the short dirty mutation, and returns `204` without contacting Google.

Register only:

```ts
http.route({
  path: "/webhook/google-calendar",
  method: "POST",
  handler: googleCalendarWebhook,
});
```

Add a daily cron that delegates immediately to the focused watch-renewal and stale-sync sweep action.

- [ ] **Step 5: Run webhook tests and verify GREEN**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarWebhook.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit push synchronization**

```bash
git add convex/http.ts convex/crons.ts convex/googleCalendar convex/googleCalendarWebhook.test.ts
git commit -m "Handle Google Calendar push notifications"
```

---

### Task 6: Add Idempotent and Conflict-Safe Google Event Writes

**Files:**
- Create: `convex/googleCalendar/writeStore.ts`
- Create: `convex/googleCalendar/writeActions.ts`
- Create: `convex/googleCalendarWrites.test.ts`

**Interfaces:**
- Consumes: Google client, mapping, connection, and write-operation table.
- Produces: `createGoogleCalendarEvent`, `updateGoogleCalendarEvent`, and `deleteGoogleCalendarEvent`, each returning `GoogleCalendarOperationResult`.

- [ ] **Step 1: Write failing idempotency and conflict tests**

```ts
test("a retried create addresses the same deterministic Google event ID", async () => {
  const first = await createWithOperationKey("booking:123:create");
  const retry = await createWithOperationKey("booking:123:create");
  expect(first.externalEventId).toBe(retry.externalEventId);
  expect(providerInsertIds()).toEqual([first.externalEventId, first.externalEventId]);
});

test("an ETag mismatch refreshes and returns conflict without overwriting", async () => {
  const result = await updateAgainstStaleEtag();
  expect(result).toMatchObject({ kind: "conflict" });
  expect(providerUpdateCount()).toBe(1);
  expect(await localEventTitle()).toBe("Newer Google title");
});

test("deleting an already absent event reconciles as cancelled", async () => {
  expect(await deleteAlreadyAbsent()).toMatchObject({ kind: "success" });
  expect(await localStatus()).toBe("cancelled");
});
```

Also test provider success followed by local-finalization interruption and later sync reconciliation.

- [ ] **Step 2: Run write tests and verify RED**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarWrites.test.ts
```

Expected: FAIL because external writes are not implemented.

- [ ] **Step 3: Implement deterministic creates, ETag updates, and idempotent deletes**

Derive Google event IDs from a SHA-256 operation key encoded with Google-compatible lowercase base32hex characters and truncated within Google's documented ID limit. Reserve the operation row before the provider call. Reconcile local state by operation key during subsequent sync.

For updates, fetch the current Google event and send `If-Match` with the latest known ETag. For deletes, treat confirmed absence as success and preserve the local booking as cancelled.

- [ ] **Step 4: Run write tests and verify GREEN**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarWrites.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit external writes**

```bash
git add convex/googleCalendar convex/googleCalendarWrites.test.ts
git commit -m "Write Google Calendar events safely"
```

---

### Task 7: Route Booking Creation, Updates, and Cancellation Through Google

**Files:**
- Create: `convex/googleCalendar/bookingSync.ts`
- Create: `convex/googleCalendarBookingSync.test.ts`
- Modify: `convex/appointmentBooking/bookAppointment.ts`
- Modify: `convex/appointmentBooking/updateAppointment.ts`
- Modify: `convex/appointmentBooking/cancellations.ts`
- Modify: `convex/appointmentBooking/calendarManualBooking.ts`
- Modify: `convex/calendarEvents.ts`

**Interfaces:**
- Consumes: Task 6 write APIs and Task 4 freshness/ownership resolution.
- Produces: one booking synchronization boundary used by AI booking, manual booking, Calendar edit/delete, and external Google-change reconciliation.

- [x] **Step 1: Write failing booking orchestration tests**

Cover these observable outcomes:

- A never-connected assignee creates the existing local-only booking.
- A connected assignee is refreshed, then Google creation succeeds before the booking reports success.
- A connected but unhealthy assignee returns `needs_reauthorization` and creates neither a local booking nor confirmation.
- Updating a connected booking reports conflict without changing the local booking session.
- Cancelling a connected booking reports success only after Google deletion/cancellation succeeds.
- A Google webhook move updates participant time indexes, booking-session selected slot, reminders, and audit action.
- A Google deletion cancels the session, reminders, and booked conversation state without sending a customer message.

- [x] **Step 2: Run booking tests and verify RED**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarBookingSync.test.ts convex/appointmentBookingCancel.test.ts
```

Expected: FAIL because existing booking mutations are local-only.

- [x] **Step 3: Implement the shared booking boundary**

Move external orchestration into actions because provider calls cannot run in mutations. Keep transactional local create/update/cancel helpers internal and make them accept the confirmed Google identity/result. Use a prepare-external-finalize sequence with write-operation recovery so a provider success cannot create a duplicate or false confirmation.

Preserve existing public/internal function names where callers already depend on them; add action entrypoints only where the runtime must cross into network access. Existing confirmation tools receive success only after finalization.

- [x] **Step 4: Run booking and calendar regressions**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarBookingSync.test.ts convex/appointmentBookingCancel.test.ts convex/appointmentBookingComplete.test.ts convex/calendarEvents.test.ts convex/calendarManualBooking.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit booking synchronization**

```bash
git add convex/appointmentBooking convex/calendarEvents.ts convex/googleCalendar convex/googleCalendarBookingSync.test.ts
git commit -m "Sync appointment bookings with Google"
```

---

### Task 8: Expose Conversation-Scoped Agent Calendar Tools

**Files:**
- Create: `convex/googleCalendar/agentTools.ts`
- Create: `convex/googleCalendarAgentTools.test.ts`
- Modify: `convex/chat/threads.ts`
- Modify: `convex/chat/workflowPrompt.ts`
- Modify: `convex/chat/workflowBackendHandling.test.ts`

**Interfaces:**
- Consumes: booking sync action results, active conversation ID, selected assignee, and privacy projection.
- Produces: tool definitions for busy-only calendar reads and guarded create/update/cancel behavior without exposing external details.

- [x] **Step 1: Write failing agent-tool contract tests**

Test the actual tool builder or extracted definitions:

```ts
test("agent calendar reads expose only busy intervals", async () => {
  const result = await executeListCalendarEvents();
  expect(result).toEqual([{ startAt, endAt, busy: true }]);
  expect(JSON.stringify(result)).not.toContain("Private interview");
});

test("agent update rejects a Kilobot event from another conversation", async () => {
  expect(await executeUpdate(otherConversationEventId)).toMatchObject({ kind: "forbidden" });
});

test("agent cancellation requires an explicit current cancellation request", async () => {
  expect(await executeCancel({ confirmed: false })).toMatchObject({ kind: "invalid_request" });
});
```

Also verify tools are absent outside booking-capable conversations and structured failures do not allow the prompt to claim success.

- [x] **Step 2: Run agent-tool tests and verify RED**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarAgentTools.test.ts convex/chat/workflowBackendHandling.test.ts
```

Expected: FAIL because the extracted safe Google tool adapters do not exist.

- [x] **Step 3: Implement guarded agent tools and prompt rules**

Keep `convex/chat/threads.ts` composition-only by importing a `registerGoogleCalendarTools` function. The adapter accepts `tools`, `conversationId`, `agentId`, and active booking services, then registers tools only when eligible.

Do not pass private Google titles, descriptions, attendees, links, account identity, or WorkOS state into the model. Mutations load the event server-side and require `externalOrigin === "kilobot"` plus matching `conversationId`.

- [x] **Step 4: Run agent and booking tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarAgentTools.test.ts convex/chat/workflowBackendHandling.test.ts convex/googleCalendarBookingSync.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit agent tools**

```bash
git add convex/chat convex/googleCalendar convex/googleCalendarAgentTools.test.ts
git commit -m "Give agents safe Google Calendar tools"
```

---

### Task 9: Add Calendar Connection, Status, Sources, and Owner Controls

**Files:**
- Create: `convex/googleCalendar/connectionQueries.ts`
- Create: `convex/googleCalendar/connectionActions.ts`
- Create: `src/components/calendar/GoogleCalendarConnectionCard.tsx`
- Create: `src/components/calendar/GoogleCalendarPipesDialog.tsx`
- Create: `src/components/calendar/GoogleCalendarSourceBadge.tsx`
- Create: `src/components/calendar/useGoogleCalendarConnection.ts`
- Create: `src/components/calendar/GoogleCalendarConnection.test.tsx`
- Modify: `src/components/calendar/CalendarSidebar.tsx`
- Modify: `src/components/calendar/CalendarEventDetailsDialog.tsx`
- Modify: `src/pages/CalendarPage.tsx`

**Interfaces:**
- Consumes: authenticated AuthKit `getAccessToken`, WorkOS `<Pipes>`, connection state queries/actions, privacy-projected events, and existing Calendar components.
- Produces: user-visible connect/reconnect/refresh/disconnect workflow, source badges, last-sync health, and owner-only Google event edit/delete controls.

- [ ] **Step 1: Write failing connection and privacy UI tests**

Render real components to assert:

```tsx
it("offers Connect Google Calendar when no connection exists", () => {
  expect(renderConnectionCard({ state: "not_connected" })).toContain("Connect Google Calendar");
});

it("shows last sync and Refresh when connected", () => {
  const markup = renderConnectionCard({ state: "connected", lastSuccessfulSyncAt: timestamp });
  expect(markup).toContain("Connected");
  expect(markup).toContain("Refresh");
});

it("shows reconnect recovery without claiming connected", () => {
  const markup = renderConnectionCard({ state: "needs_reauthorization" });
  expect(markup).toContain("Reconnect required");
  expect(markup).not.toContain(">Connected<");
});
```

Also test Google source badge rendering, owner edit/delete visibility, teammate read-only Busy details, pending-button disabling, and disconnect confirmation.

- [ ] **Step 2: Run UI tests and verify RED**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/GoogleCalendarConnection.test.tsx src/components/calendar/CalendarSidebar.test.tsx
```

Expected: FAIL because the connection UI does not exist.

- [ ] **Step 3: Implement backend connection reconciliation**

Expose:

```ts
export const getCurrentConnectionStatus = query({ args: {}, handler });
export const reconcileCurrentConnection = action({ args: {}, handler });
export const refreshCurrentConnection = action({ args: {}, handler });
export const disconnectCurrentConnection = action({ args: {}, handler });
```

`reconcileCurrentConnection` calls WorkOS after the widget closes or the dialog regains focus. If active and no local connection exists, it performs initial sync and watch setup. This explicit reconciliation is required because the official `<Pipes>` API exposes only `authToken`, not a connection-change callback.

Disconnect calls WorkOS connected-account deletion using the installed SDK/API shape verified from its types, stops the Google watch when possible, removes imported event projections, and preserves Kilobot booking history.

- [ ] **Step 4: Implement modular Calendar UI composition**

Use:

```tsx
<Pipes authToken={getAccessToken} />
```

inside `GoogleCalendarPipesDialog`, wrapped by the existing WorkOS widget provider conventions. The hook reconciles after dialog close and on `window` focus while open, prevents duplicate operations, and requests a range refresh when the visible month becomes older than `CALENDAR_PAGE_FRESHNESS_MS`.

Add the compact connection card to `CalendarSidebar`, source badge to event surfaces, and owner-only external edit/delete routing. Keep new behavior outside the already oversized `CalendarPage.tsx`.

- [ ] **Step 5: Run UI and existing Calendar tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/GoogleCalendarConnection.test.tsx src/components/calendar/CalendarSidebar.test.tsx src/pages/CalendarLiveEvent.test.ts src/pages/CalendarSidebarPadding.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the Calendar UI**

```bash
git add convex/googleCalendar src/components/calendar src/pages/CalendarPage.tsx
git commit -m "Add Google Calendar connection controls"
```

---

### Task 10: Document, Verify, and Prepare Deployment Handoff

**Files:**
- Modify: `kilobot-docs/docs/bookings/calendar.mdx`
- Modify: `CONTINUITY.md`
- Conditionally modify after confirmed production availability: `kilobot-docs/docs/releases/changelog.mdx`

**Interfaces:**
- Consumes: all implemented feature behavior and configured WorkOS provider.
- Produces: verified user documentation, bounded continuity receipt, and an explicit operational handoff without unauthorized deployment changes.

- [ ] **Step 1: Update Calendar documentation**

Document:

- A connection belongs to the user and works across their eligible agents and workspaces.
- Version one synchronizes only the primary Google Calendar.
- Teammates see external events only as Busy.
- Push updates can take a short time and refresh/reconnect are recovery actions.
- Disconnect does not delete already-created Google events.
- Agents can change only Kilobot bookings associated with the active conversation.

- [ ] **Step 2: Run the complete focused suite under Node 22**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run \
  convex/googleCalendarSchema.test.ts \
  convex/googleCalendarProvider.test.ts \
  convex/googleCalendarSync.test.ts \
  convex/googleCalendarProjection.test.ts \
  convex/googleCalendarWebhook.test.ts \
  convex/googleCalendarWrites.test.ts \
  convex/googleCalendarBookingSync.test.ts \
  convex/googleCalendarAgentTools.test.ts \
  convex/calendarEvents.test.ts \
  convex/appointmentBookingCancel.test.ts \
  src/components/calendar/GoogleCalendarConnection.test.tsx \
  src/components/calendar/CalendarSidebar.test.tsx
```

Expected: every focused test passes.

- [ ] **Step 3: Run proportional static verification**

This is a large planned task, so run strict checks:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit -p convex/tsconfig.json
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/googleCalendar src/components/calendar src/pages/CalendarPage.tsx convex/calendarEvents.ts convex/appointmentBooking convex/chat/threads.ts
git diff --check
find convex/googleCalendar src/components/calendar -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 | xargs -0 wc -l
```

Expected: TypeScript, build, scoped lint, and whitespace checks pass; inspect the `wc -l` output and confirm every application code file is at most 300 lines. If the repository-wide build retains established environment or bundle warnings, record them without masking new errors.

- [ ] **Step 4: Run the full application test suite and classify unrelated failures**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run
```

Expected: Google Calendar and existing product suites pass. Record any established Docs-runner failures separately with exact file/test counts; do not claim the full suite is green if it is not.

- [ ] **Step 5: Verify generated Convex types without deploying**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && STRIPE_PRICE_STARTER_MONTHLY=mock_starter_monthly STRIPE_PRICE_STARTER_ANNUAL=mock_starter_annual STRIPE_PRICE_GROWTH_MONTHLY=mock_growth_monthly STRIPE_PRICE_GROWTH_ANNUAL=mock_growth_annual STRIPE_PRICE_BUSINESS_MONTHLY=mock_business_monthly STRIPE_PRICE_BUSINESS_ANNUAL=mock_business_annual STRIPE_PRICE_EXTRA_CREDITS_2000=mock_extra_2000 STRIPE_PRICE_EXTRA_CREDITS_5000=mock_extra_5000 STRIPE_PRICE_EXTRA_CREDITS_15000=mock_extra_15000 bunx convex codegen
```

Expected: codegen and type validation pass against the configured development deployment. Do not run `convex deploy` or change deployment environment values in this task.

- [ ] **Step 6: Prepare the operational verification checklist**

Record but do not execute without authorization:

- Verify WorkOS provider slug and required events scope.
- Verify production uses custom Google OAuth credentials.
- Set the enabled server capability flag in the target deployment.
- Confirm `https://<convex-site>/webhook/google-calendar` is publicly reachable.
- Connect a real test user, observe initial sync and active watch channel, then create/move/delete a Google event.
- Observe an agent booking, edit, and cancellation in the assigned user's Google Calendar.
- Force a reconnect-required state and verify fail-closed behavior.
- Observe a renewal overlap before the seven-day watch expires.

- [ ] **Step 7: Update continuity and customer changelog rules**

Update `CONTINUITY.md` with exact verification results, working paths, connection/webhook operational state, and whether deployment remains unconfirmed. Add a customer-facing changelog entry only when production availability has an explicit date; otherwise record the unreleased feature solely in continuity.

- [ ] **Step 8: Commit documentation and verification receipts**

```bash
git add kilobot-docs/docs/bookings/calendar.mdx CONTINUITY.md
git commit -m "Document Google Calendar synchronization"
```

Do not include `kilobot-docs/docs/releases/changelog.mdx` unless production availability is confirmed.

## Implementation Completion Criteria

- One WorkOS user connection is reused across every eligible workspace and agent.
- Only the primary Google Calendar is synchronized.
- Calendar page reads display owner details and teammate Busy projections.
- Availability uses fresh Google events and fails closed for unhealthy enabled connections.
- Dashboard and agent creates, updates, and cancellations synchronize with Google without duplicates or blind overwrites.
- Customer-facing agents cannot access or mutate unrelated private Google events.
- Google push notifications trigger incremental sync, duplicate safely, recover from dropped delivery, and renew before expiration.
- WorkOS and Google credentials never persist in Convex or reach logs/client/model context.
- Existing never-connected users retain the current local-only calendar behavior.
- Focused tests, strict TypeScript, build, scoped lint, codegen, whitespace, and modular file-size checks pass.
- Deployment, production webhook validation, capability enablement, push, PR, and production changelog remain separate authorized actions.
