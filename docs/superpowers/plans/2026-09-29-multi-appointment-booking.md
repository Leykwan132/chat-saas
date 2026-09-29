# Multi-Appointment Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the chat agent validate and create two to ten appointments from one customer request without reporting success for partial bookings.

**Architecture:** Add a durable batch parent beside existing single-booking sessions. Keep availability resolution, local persistence, and Google synchronization in focused modules; every created appointment remains a normal calendar event and booking session. Extend the agent tools without changing the existing scalar booking interface.

**Tech Stack:** TypeScript, Convex, AI SDK tools with Zod, Google Calendar integration, Vitest with convex-test.

**Spec:** `docs/superpowers/specs/2026-09-29-multi-appointment-booking-design.md`

## Global Constraints

- Use Node v22 in the same shell invocation for every script and test command.
- Read `convex/_generated/ai/guidelines.md` before editing Convex code.
- Keep every new or materially split code file below 300 lines.
- Add no comments unless a workaround cannot be made self-explanatory.
- Accept two to ten unique requested start times for batch booking; keep the existing single-time flow source-compatible.
- Never create a partial local batch when any requested slot fails revalidation.
- Do not add a release changelog entry until production availability is confirmed; record unshipped work in `CONTINUITY.md`.
- Work natively in this session; do not dispatch subagents unless the user explicitly requests delegation.

## Review Focus

- Two requested times that overlap each other must return `allAvailable: false` and create no active batch; Task 2 tests this.
- The same start times in a different order must not pass exact-list confirmation; Task 3 tests this.
- An existing active single-booking session must block batch creation, and an active batch must block a new single session; Task 1 tests both directions.
- Round-robin assignment across a batch must advance in chronological order rather than assigning every slot from stale service state; Task 3 tests the assigned user sequence.
- A Google compensation failure must persist actionable failed-batch state and never return booking success; Task 4 tests this.

---

### Task 1: Batch Schema and Active-State Boundary

**Files:**
- Create: `convex/appointmentBookingBatchStatus.ts`
- Create: `convex/appointmentBooking/batchStore.ts`
- Create: `convex/appointmentBookingBatchStore.test.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/appointmentBooking/sessionStore.ts`
- Modify: `convex/appointmentBooking/currentBooking.ts`
- Modify: `convex/customers.ts`
- Modify: `convex/teamDeletion/localDescendants.ts`

**Interfaces:**
- Produces: `AppointmentBookingBatchStatus` values `collecting`, `confirming`, `creating`, `booked`, and `failed` plus `appointmentBookingBatchStatusValidator`.
- Produces: `getActiveBatch(ctx, conversationId)`, `getActiveBookingState(ctx, conversationId)`, and `activeBatchSnapshot(batch)`.
- Produces: `appointmentBookingBatches` indexed by `conversationId` and by `agentId, updatedAt`.

- [ ] **Step 1: Write failing lifecycle tests**

Add tests proving that an active batch is returned as the active booking state, blocks `getOrCreateSession`, is included by `getActiveBookingSession`, and is deleted with customer/team descendants. Prove an active single session blocks batch creation.

- [ ] **Step 2: Run the lifecycle tests and verify red**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/appointmentBookingBatchStore.test.ts
```

Expected: FAIL because the batch table, status module, and store do not exist.

- [ ] **Step 3: Implement the schema and active-state helpers**

Define the batch document with `conversationId`, `agentId`, optional `serviceId`, status, shared `collectedFields`, bounded `requestedSlots`, optional `customerConfirmationMessageId`, optional `calendarEventIds`, optional `sessionIds`, optional failure metadata, and timestamps. Make creation helpers reject a simultaneous active single session or batch.

- [ ] **Step 4: Run focused lifecycle regressions**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/appointmentBookingBatchStore.test.ts convex/appointmentBookingActiveSession.test.ts convex/appointmentBookingCustomerHistory.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the batch lifecycle foundation**

```bash
git add convex/appointmentBookingBatchStatus.ts convex/appointmentBooking/batchStore.ts convex/appointmentBookingBatchStore.test.ts convex/schema.ts convex/appointmentBooking/sessionStore.ts convex/appointmentBooking/currentBooking.ts convex/customers.ts convex/teamDeletion/localDescendants.ts
git commit -m "Add batch booking lifecycle"
```

### Task 2: Array Availability and Shared Field Collection

**Files:**
- Create: `convex/appointmentBooking/batchAvailability.ts`
- Create: `convex/appointmentBookingBatchAvailability.test.ts`
- Modify: `convex/appointmentBooking/sessions.ts`
- Modify: `convex/appointmentBooking/dateValidation.ts`
- Modify: `convex/appointmentBooking/types.ts`

**Interfaces:**
- Produces: `checkBatchAvailability(ctx, { conversation, service, preferredStartAts, customerRequestAgentMessageId })` returning `{ success, allAvailable, requested, unavailable, batchId?, missingFields?, readyForBooking? }`.
- Extends `internal.appointmentBooking.sessions.checkAvailability` with optional `preferredStartAts: number[]`; scalar `preferredStartAt` and range arguments remain unchanged.
- Extends `startBookingSession` so collected fields update the active batch when one exists.

- [ ] **Step 1: Write failing array-availability tests**

Cover five available timestamps, one unavailable timestamp among five, duplicate and past values, empty input, eleven values, overlapping requested intervals, service mismatch, shared missing fields, and retention of the incoming confirmation message.

- [ ] **Step 2: Run availability tests and verify red**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/appointmentBookingBatchAvailability.test.ts
```

Expected: FAIL because `preferredStartAts` and `checkBatchAvailability` do not exist.

- [ ] **Step 3: Implement batch validation and availability**

Normalize the array without reordering it, reject invalid cardinality or duplicates, validate every date in the service timezone, and resolve exact intervals. Create or update a pending batch only when all intervals are available. Preserve the existing scalar/range branch unchanged.

- [ ] **Step 4: Run batch and scalar availability regressions**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/appointmentBookingBatchAvailability.test.ts convex/appointmentBookingAvailability.test.ts convex/appointmentBookingStatus.test.ts convex/appointmentBookingConfirmRetry.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit batch availability**

```bash
git add convex/appointmentBooking/batchAvailability.ts convex/appointmentBookingBatchAvailability.test.ts convex/appointmentBooking/sessions.ts convex/appointmentBooking/dateValidation.ts convex/appointmentBooking/types.ts
git commit -m "Add batch appointment availability"
```

### Task 3: Atomic Local Batch Creation and Confirmation

**Files:**
- Create: `convex/appointmentBooking/batchCreate.ts`
- Create: `convex/appointmentBooking/bookAppointments.ts`
- Create: `convex/appointmentBookingBatchCreate.test.ts`
- Modify: `convex/appointmentBooking/confirmations.ts`
- Modify: `convex/appointmentBooking/bookingEvents.ts`
- Modify: `convex/appointmentBooking/types.ts`

**Interfaces:**
- Produces: `prepareLocalBatch(ctx, { conversationId, serviceId, startAts })` returning either all revalidated slots and booking context or a typed failure before writes.
- Produces: `createLocalBatchRecords(ctx, prepared)` returning `{ batchId, bookings: Array<{ bookingId, sessionId, startAt, endAt, assignedTo }> }`.
- Produces: `internal.appointmentBooking.bookAppointments.bookAppointments({ conversationId, serviceId, startAts })`.
- Produces: `internal.appointmentBooking.confirmations.sendBatchBookingConfirmation({ conversationId })` returning one confirmation message containing every created booking.

- [ ] **Step 1: Write failing atomic-creation tests**

Prove five confirmed slots create five events, ten participants, five booked sessions, five reminder/notification invocations, five conversation events, one booked batch, and a booked conversation. Prove changed availability creates zero child records. Prove reordered or partial start-time input fails exact-list confirmation. Prove chronological round-robin assignment advances across the batch.

- [ ] **Step 2: Run creation tests and verify red**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/appointmentBookingBatchCreate.test.ts
```

Expected: FAIL because local batch creation and confirmation functions do not exist.

- [ ] **Step 3: Implement transactional creation**

Revalidate every persisted requested interval before inserting any row. Create standard events, participants, and sessions in chronological order, then finalize the batch and conversation. Reuse existing event-description, participant, reminder, notification, and log helpers. Build a single exact confirmation message from the booked children.

- [ ] **Step 4: Run booking lifecycle regressions**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/appointmentBookingBatchCreate.test.ts convex/appointmentBookingComplete.test.ts convex/appointmentBookingCancel.test.ts convex/appointmentBookingCustomerHistory.test.ts convex/inboxConversationSummary.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit local batch creation**

```bash
git add convex/appointmentBooking/batchCreate.ts convex/appointmentBooking/bookAppointments.ts convex/appointmentBookingBatchCreate.test.ts convex/appointmentBooking/confirmations.ts convex/appointmentBooking/bookingEvents.ts convex/appointmentBooking/types.ts
git commit -m "Create appointment batches atomically"
```

### Task 4: Google Calendar Batch Synchronization

**Files:**
- Create: `convex/googleCalendar/batchBookingTypes.ts`
- Create: `convex/googleCalendar/batchBookingPrepare.ts`
- Create: `convex/googleCalendar/batchBookingFinalize.ts`
- Create: `convex/googleCalendar/batchBookingSync.ts`
- Create: `convex/googleCalendarBatchBookingSync.test.ts`
- Modify: `convex/appointmentBooking/bookAppointments.ts`
- Modify: `convex/googleCalendar/bookingPayload.ts`

**Interfaces:**
- Produces: `prepareBatchBook`, `finalizeBatchBook`, `rollbackBatchBook`, and `markBatchCompensationFailed` internal mutations.
- Produces: `runBookAppointments(args, dependencies)` returning a batch booking result with all booking IDs or a failure.
- Reuses the existing Google refresh, create, delete, and error translation functions.

- [ ] **Step 1: Write failing Google synchronization tests**

Cover five successful remote creates, create failure after two successes with both remote events deleted and all local pending records rolled back, authorization failure before local preparation, and delete-compensation failure that leaves the batch failed with affected event IDs and returns `success: false`.

- [ ] **Step 2: Run Google tests and verify red**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarBatchBookingSync.test.ts
```

Expected: FAIL because the batch Google orchestration does not exist.

- [ ] **Step 3: Implement prepare, remote writes, compensation, and finalize**

Prepare every remote write descriptor before sending the first request. Refresh each unique connection at most once. On failure, delete successful remote events in reverse order, roll back locally when compensation succeeds, or persist failed-batch recovery metadata when it does not.

- [ ] **Step 4: Run Google single and batch regressions**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarBatchBookingSync.test.ts convex/googleCalendarBookingSync.test.ts convex/googleCalendarBookingChange.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Google batch synchronization**

```bash
git add convex/googleCalendar/batchBookingTypes.ts convex/googleCalendar/batchBookingPrepare.ts convex/googleCalendar/batchBookingFinalize.ts convex/googleCalendar/batchBookingSync.ts convex/googleCalendarBatchBookingSync.test.ts convex/appointmentBooking/bookAppointments.ts convex/googleCalendar/bookingPayload.ts
git commit -m "Sync appointment batches to Google Calendar"
```

### Task 5: Agent Tools, Prompt, and End-to-End Verification

**Files:**
- Create: `convex/chat/appointmentBookingTools.ts`
- Create: `convex/chat/appointmentBookingTools.test.ts`
- Modify: `convex/chat/threads.ts`
- Modify: `convex/chat/bookingToolSession.ts`
- Modify: `convex/chat/workflowPromptBooking.test.ts`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Produces: `registerAppointmentBookingTools(args)` containing the existing single-booking tools plus `preferredTimesIso` and `bookAppointments`.
- Extends the active-booking tool result with `bookingKind: "single" | "batch"` and optional `batchId`.

- [ ] **Step 1: Write failing tool and prompt tests**

Prove two to ten ISO strings are parsed in order and passed as `preferredStartAts`; malformed input returns a tool failure; `bookAppointments` passes the exact confirmed list; the prompt selects batch flow for two or more exact times, reports all unavailable values together, sends one batch confirmation, and retains the existing single-booking instructions.

- [ ] **Step 2: Run tool contract tests and verify red**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/chat/appointmentBookingTools.test.ts convex/chat/workflowPromptBooking.test.ts
```

Expected: FAIL because the array input, batch tool, and prompt contract do not exist.

- [ ] **Step 3: Extract and register booking tools**

Move booking tool registration out of the existing oversized `threads.ts`, add the bounded array schema and `bookAppointments`, update the prompt, and preserve every existing scalar tool name and description contract required by tests.

- [ ] **Step 4: Generate Convex bindings and run focused verification**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && STRIPE_PRICE_STARTER_MONTHLY=mock_starter_monthly STRIPE_PRICE_STARTER_ANNUAL=mock_starter_annual STRIPE_PRICE_GROWTH_MONTHLY=mock_growth_monthly STRIPE_PRICE_GROWTH_ANNUAL=mock_growth_annual STRIPE_PRICE_BUSINESS_MONTHLY=mock_business_monthly STRIPE_PRICE_BUSINESS_ANNUAL=mock_business_annual STRIPE_PRICE_EXTRA_CREDITS_2000=mock_extra_2000 STRIPE_PRICE_EXTRA_CREDITS_5000=mock_extra_5000 STRIPE_PRICE_EXTRA_CREDITS_15000=mock_extra_15000 bunx convex codegen
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/appointmentBookingBatchStore.test.ts convex/appointmentBookingBatchAvailability.test.ts convex/appointmentBookingBatchCreate.test.ts convex/googleCalendarBatchBookingSync.test.ts convex/chat/appointmentBookingTools.test.ts convex/chat/workflowPromptBooking.test.ts
```

Expected: code generation succeeds and all focused tests pass.

- [ ] **Step 5: Run full verification**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && STRIPE_PRICE_STARTER_MONTHLY=mock_starter_monthly STRIPE_PRICE_STARTER_ANNUAL=mock_starter_annual STRIPE_PRICE_GROWTH_MONTHLY=mock_growth_monthly STRIPE_PRICE_GROWTH_ANNUAL=mock_growth_annual STRIPE_PRICE_BUSINESS_MONTHLY=mock_business_monthly STRIPE_PRICE_BUSINESS_ANNUAL=mock_business_annual STRIPE_PRICE_EXTRA_CREDITS_2000=mock_extra_2000 STRIPE_PRICE_EXTRA_CREDITS_5000=mock_extra_5000 STRIPE_PRICE_EXTRA_CREDITS_15000=mock_extra_15000 bunx vitest run --exclude '.worktrees/**'
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit
git diff --check
```

Expected: full Vitest and TypeScript pass, and the diff contains no whitespace errors. Update `CONTINUITY.md` with the implementation and receipts. Do not update the customer changelog because production availability remains unconfirmed.

- [ ] **Step 6: Commit the agent integration**

```bash
git add convex/chat/appointmentBookingTools.ts convex/chat/appointmentBookingTools.test.ts convex/chat/threads.ts convex/chat/bookingToolSession.ts convex/chat/workflowPromptBooking.test.ts convex/_generated CONTINUITY.md
git commit -m "Enable multi-appointment chat booking"
```
