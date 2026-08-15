# Manual Event Google Calendar Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a matching Google Calendar event for each manually created calendar event when its creator has an active Google connection, while failing closed on Google errors.

**Architecture:** An internal prepare-and-rollback module owns local records and the connection gate. A separate action-safe orchestration module refreshes once, calls the existing idempotent Google create writer, and removes pending records on every failed write. The public calendar API delegates to this orchestration module; the browser calls that action.

**Tech Stack:** Convex actions and internal mutations, TypeScript, Google Calendar writer, React, `react-icons`, Vitest.

## Global Constraints

- Use Node v22 for every verification command.
- The event creator's primary Google Calendar is the only write target.
- No connection or a connection marked `disconnected` creates a local-only event.
- A connected or syncing connection is refreshed once before creation; reauthorization, refresh, provider, or finalization errors leave no pending local event.
- Reuse `runCreateGoogleCalendarEvent`, `googleCalendarWriteInputFromEvent`, and `googleCalendarEventOperationKey`; do not add a provider-specific writer.
- Pending events use existing `kilobot` Google metadata so update/delete synchronization remains unchanged after finalization.
- Keep code files below 300 lines, add no code comments, and add no changelog entry until production availability is confirmed.

---

### Task 1: Add fail-closed manual-event create orchestration

**Files:**

- Modify: `convex/calendarEventsHelpers.ts:20-49`
- Create: `convex/googleCalendar/calendarEventCreatePrepare.ts`
- Create: `convex/googleCalendar/calendarEventCreateSync.ts`
- Test: `convex/googleCalendarManualEventSync.test.ts`

**Interfaces:**

- Produces: `calendarEventCreateArgs` and `CalendarEventCreateInput` as the public and internal create contract.
- Produces: internal mutations `prepareCreate(args)` and `rollbackCreate({ eventId })`.
- Produces: `runCalendarEventCreate(ctx, args): Promise<Id<"calendarEvents">>` and injected `runPreparedCalendarEventCreate(args, dependencies)`.
- Consumes: calendar access helpers, participant/availability helpers, the Google connection gate, and the existing Google writer.

- [ ] **Step 1: Write failing create-flow tests**

Create a personal-workspace fixture with an owner, customer, team membership, and optional Google connection. Add tests using injected dependencies:

```ts
test("a never-connected creator keeps a manual event local", async () => {
  const eventId = await runPreparedCalendarEventCreate(input, localDependencies);
  expect(eventId).toBe(localEventId);
  expect(localDependencies.write).not.toHaveBeenCalled();
});

test("a connected creator refreshes once then writes Google", async () => {
  const eventId = await runPreparedCalendarEventCreate(input, connectedDependencies);
  expect(eventId).toBe(googleEventId);
  expect(connectedDependencies.refresh).toHaveBeenCalledOnce();
  expect(connectedDependencies.write).toHaveBeenCalledWith(expect.objectContaining({
    calendarEventId: googleEventId,
    operationKey: "calendar:" + googleEventId + ":create",
  }));
});

test("a failed Google write removes its pending event", async () => {
  await expect(runPreparedCalendarEventCreate(input, failingDependencies))
    .rejects.toThrow("Google Calendar request failed");
  expect(failingDependencies.rollback).toHaveBeenCalledWith({ eventId: pendingEventId });
});
```

Also call authenticated `prepareCreate` directly. Assert local preparation has no external fields; connected preparation returns `kind: "google"`, has the creator in `externalOwnerUserId`, and persists `externalSyncState: "pending"` before the writer runs.

- [ ] **Step 2: Verify the tests are red**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarManualEventSync.test.ts`

Expected: FAIL because no create preparation or orchestration module exists.

- [ ] **Step 3: Define one creation argument contract**

In `calendarEventsHelpers.ts`, export this validator map and matching `CalendarEventCreateInput` TypeScript type with generated `Id` values:

```ts
export const calendarEventCreateArgs = {
  title: v.string(),
  description: v.optional(v.string()),
  location: v.optional(v.string()),
  link: v.optional(v.string()),
  startAt: v.number(),
  endAt: v.number(),
  timeZone: v.string(),
  allDay: v.optional(v.boolean()),
  startDate: v.optional(v.string()),
  endDate: v.optional(v.string()),
  status: v.optional(eventStatusValidator),
  customerId: v.id("customers"),
  assignedUserId: v.id("users"),
  attendeeUserIds: v.optional(v.array(v.id("users"))),
};
```

Keep `eventStatusValidator` private to the helper module; both public and internal creation consume the exported map.

- [ ] **Step 4: Implement creation preparation and rollback**

Implement `prepareCreate` as an `internalMutation` with `{ ...calendarEventCreateArgs, refreshed: v.optional(v.boolean()) }` and this discriminated result:

```ts
type CreatePreparation =
  | { kind: "local"; eventId: Id<"calendarEvents"> }
  | { kind: "needs_refresh"; connectionId: Id<"googleCalendarConnections"> }
  | {
      kind: "google";
      connectionId: Id<"googleCalendarConnections">;
      calendarEventId: Id<"calendarEvents">;
      operationKey: string;
      event: GoogleCalendarWriteInput;
      now: number;
    };
```

It must call `assertCalendarAccess(ctx, Permission.CALENDAR_MANAGE)`, `validateTime`, require a trimmed title, normalize the time zone, and load the connection for `auth.userDbId`.

For no connection or `disconnected`, insert the event and participants, synchronize availability intervals, then return `{ kind: "local", eventId }`. For active connections, use `googleCalendarBookingGate`: throw its error message, return `needs_refresh` without inserting while `refreshed !== true`, and otherwise insert a pending event. Patch the pending event with:

```ts
{
  externalProvider: "google",
  externalCalendarId: "primary",
  externalOwnerUserId: auth.userDbId,
  externalOrigin: "kilobot",
  externalStatus: "confirmed",
  externalTransparency: "opaque",
  externalCanEdit: true,
  externalSyncState: "pending",
  externalOperationKey: googleCalendarEventOperationKey(eventId, "create"),
}
```

Return `googleCalendarWriteInputFromEvent(event)`. Do not create availability intervals while pending; the writer finalizer creates them on success.

Implement `rollbackCreate` as `internalMutation({ args: { eventId: v.id("calendarEvents") }, returns: v.null() })`. Only when the event remains pending, load up to 100 participants, remove each participant's availability intervals, delete the participants, then delete the event.

- [ ] **Step 5: Implement action-safe orchestration**

In `calendarEventCreateSync.ts`, make `runPreparedCalendarEventCreate` prepare with `refreshed: false`, invoke the existing sync worker once for `needs_refresh`, prepare again with `refreshed: true`, and immediately return a local event ID. For a Google preparation, call:

```ts
const result = await runCreateGoogleCalendarEvent({
  connectionId: prepared.connectionId,
  calendarEventId: prepared.calendarEventId,
  operationKey: prepared.operationKey,
  event: prepared.event,
  now: prepared.now,
}, dependencies.write);
```

For a non-success result, call `dependencies.rollback({ eventId: prepared.calendarEventId })` and throw `new Error(result.message)`. Return `prepared.calendarEventId` only after success. Export `runCalendarEventCreate(ctx, args)`, passing internal prepare/rollback calls, the existing sync worker, and `googleCalendarWriteActionDependencies(ctx)` to the injected runner.

- [ ] **Step 6: Run focused backend verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarManualEventSync.test.ts convex/calendarEvents.test.ts`

Expected: PASS for local-only creation, one refresh before Google creation, finalized metadata, and rollback after provider failure.

- [ ] **Step 7: Commit**

```bash
git add convex/calendarEventsHelpers.ts convex/googleCalendar/calendarEventCreatePrepare.ts convex/googleCalendar/calendarEventCreateSync.ts convex/googleCalendarManualEventSync.test.ts
git commit -m "Sync manual calendar events to Google"
```

### Task 2: Route the calendar API and browser through the action

**Files:**

- Modify: `convex/calendarEvents.ts:1-167`
- Modify: `convex/calendarEvents.test.ts:65-123`
- Modify: `src/pages/CalendarPage.tsx:1-16,750,1045`
- Modify: `src/components/booking/CreateBookingDialog.test.ts:20-30`

**Interfaces:**

- Consumes: `runCalendarEventCreate(ctx, args)`.
- Produces: public `calendarEvents.create` action returning `v.id("calendarEvents")`.
- Consumes: `calendarApi.create` through React `useAction`.

- [ ] **Step 1: Write failing API and client checks**

Change the generic-event test to call `authed.action(api.calendarEvents.create, input)` and retain assertions for no booking-session or conversation-log side effects. Add this source assertion:

```ts
const calendarPageSource = readFileSync(new URL("../../pages/CalendarPage.tsx", import.meta.url), "utf8");
expect(calendarPageSource).toContain("useAction(calendarApi.create)");
expect(calendarPageSource).not.toContain("useMutation(calendarApi.create)");
```

- [ ] **Step 2: Verify the tests are red**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/calendarEvents.test.ts src/components/booking/CreateBookingDialog.test.ts`

Expected: FAIL because `create` is still a mutation and the page still uses `useMutation`.

- [ ] **Step 3: Replace the entrypoint**

In `convex/calendarEvents.ts`, remove the inline creation mutation and unused imports. Import `calendarEventCreateArgs` and `runCalendarEventCreate`, then expose:

```ts
export const create = action({
  args: calendarEventCreateArgs,
  returns: v.id("calendarEvents"),
  handler: async (ctx, args) => await runCalendarEventCreate(ctx, args),
});
```

Keep all queries, update, and remove unchanged. In `CalendarPage.tsx`, import `useAction` beside `useMutation` and change only this hook:

```ts
const createEvent = useAction(calendarApi.create);
```

Keep the save payload, selected-event behavior, toast copy, loading state, and error handling unchanged.

- [ ] **Step 4: Run focused API and page verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/calendarEvents.test.ts convex/googleCalendarManualEventSync.test.ts src/components/booking/CreateBookingDialog.test.ts`

Expected: PASS and confirm both public local-only creation and client action usage.

- [ ] **Step 5: Commit**

```bash
git add convex/calendarEvents.ts convex/calendarEvents.test.ts src/pages/CalendarPage.tsx src/components/booking/CreateBookingDialog.test.ts
git commit -m "Use Google-aware calendar event creation"
```

### Task 3: Restore the visible white-check connection indicator

**Files:**

- Modify: `src/components/calendar/GoogleCalendarConnectionCard.tsx:1,49-53`
- Modify: `src/components/calendar/GoogleCalendarConnection.test.tsx:55-67`

**Interfaces:**

- Produces: the connected button's existing `aria-label="Active"`, rendered by `HiCheckBadge` from `react-icons/hi2`.
- Preserves: Google icon, account-email text, connection action, and tooltip behavior.

- [ ] **Step 1: Write a failing glyph regression check**

Replace the Lucide assertion with:

```ts
expect(source).toContain('import { HiCheckBadge } from "react-icons/hi2";');
expect(source).toContain("<HiCheckBadge");
expect(source).toContain('aria-label="Active"');
```

- [ ] **Step 2: Verify the test is red**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/GoogleCalendarConnection.test.tsx`

Expected: FAIL because the card still imports and renders Lucide `BadgeCheck`.

- [ ] **Step 3: Render the Heroicons status badge**

Replace the Lucide import with `import { HiCheckBadge } from "react-icons/hi2";`. Replace `BadgeCheck` with:

```tsx
<HiCheckBadge
  className="size-5 shrink-0 text-green-600"
  aria-label="Active"
/>
```

Do not add a wrapper or change spacing. The filled Heroicons badge keeps the green marker and makes its check visible in white.

- [ ] **Step 4: Run focused UI verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/GoogleCalendarConnection.test.tsx`

Expected: PASS with connection and Google-source-indicator coverage intact.

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/GoogleCalendarConnectionCard.tsx src/components/calendar/GoogleCalendarConnection.test.tsx
git commit -m "Restore Google calendar connection check"
```

### Task 4: Generate and verify the completed feature

**Files:**

- Modify: `CONTINUITY.md`
- Modify: `docs/superpowers/plans/2026-08-15-manual-event-google-calendar-sync.md`

**Interfaces:**

- Consumes: completed Tasks 1–3.
- Produces: generated Convex API types and a factual verification record.

- [ ] **Step 1: Record completion without release publication**

Mark completed plan checkboxes. In `CONTINUITY.md`, replace the in-progress manual-event item with a factual completed state covering local-only behavior, fail-closed connected behavior, and the white-check indicator. Keep production availability `UNCONFIRMED`; do not edit the release changelog.

- [ ] **Step 2: Generate Convex API types**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen`

Expected: PASS and generate the action type for `calendarEvents.create`.

- [ ] **Step 3: Run type, focused, and diff verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/calendarEvents.test.ts convex/googleCalendarManualEventSync.test.ts src/components/calendar/GoogleCalendarConnection.test.tsx src/components/booking/CreateBookingDialog.test.ts
git diff --check
```

Expected: all commands PASS. If the full suite still has the known unrelated Google Calendar projection or booking-sync failures, record the exact failures instead of calling it green.

- [ ] **Step 4: Commit verification records**

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-08-15-manual-event-google-calendar-sync.md convex/_generated
git commit -m "Verify manual Google calendar event sync"
```

