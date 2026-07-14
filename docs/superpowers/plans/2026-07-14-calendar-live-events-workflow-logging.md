# Calendar Live Events and Workflow Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use a slightly darker title for every Calendar Today event whose end time has not passed and add structured Convex console logs for outbound reminder/follow-up Workpool scheduling and immediately-before-send boundaries.

**Architecture:** Put the end-time rule in a small pure calendar utility and pass a minute-refreshed timestamp from `CalendarPage` into Today-list rows. Add scheduling logs directly after successful Workpool enqueue calls and send logs immediately before the existing WhatsApp provider calls, without changing persistence or delivery flow.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Convex, `@convex-dev/workpool`, Vitest, `convex-test`.

## Global Constraints

- Node.js v22 is required for every test or script command.
- Code files must remain modular; new code files must stay below 300 lines.
- Production code contains no comments unless an unavoidable workaround requires one.
- Not past means `event.endAt >= now`.
- Logs use `console.log` only and never include customer names, phone numbers, message bodies, or template parameter values.
- Scheduling logs emit only after a Workpool enqueue succeeds and returns its Workpool ID.
- Send logs emit only after eligibility checks and immediately before the provider call.
- Reconciliation and lifecycle maintenance Workpool operations remain unlogged.

---

### Task 1: Calendar non-past title emphasis

**Files:**
- Create: `src/lib/calendarEventTiming.ts`
- Create: `src/lib/calendarEventTiming.test.ts`
- Create: `src/pages/CalendarLiveEvent.test.ts`
- Modify: `src/pages/CalendarPage.tsx`

**Interfaces:**
- Produces: `isCalendarEventNotPast(event: { endAt: number }, now: number): boolean`.
- Consumes: the existing `CalendarEvent` timestamps and `cn` class utility.

- [ ] **Step 1: Write failing interval and Today-list contract tests**

Create `src/lib/calendarEventTiming.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { isCalendarEventNotPast } from './calendarEventTiming';

describe('isCalendarEventNotPast', () => {
  const event = { startAt: 1_000, endAt: 2_000 };

  test.each([
    [999, true],
    [1_000, true],
    [1_500, true],
    [2_000, true],
    [2_001, false],
  ])('returns whether the event has not passed at %i', (now, expected) => {
    expect(isCalendarEventNotPast(event, now)).toBe(expected);
  });
});
```

Create `src/pages/CalendarLiveEvent.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./CalendarPage.tsx', import.meta.url), 'utf8');

test('uses darker titles for Today-list events until their end time has passed', () => {
  expect(source).toContain('isCalendarEventNotPast(event, currentTimestamp)');
  expect(source).toContain("isNotPast ? 'font-medium text-foreground' : 'font-normal text-foreground/80'");
  expect(source).toContain('selectedDayKey === todayKey');
  expect(source).toContain('window.setInterval');
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/calendarEventTiming.test.ts src/pages/CalendarLiveEvent.test.ts
```

Expected: FAIL because `calendarEventTiming.ts` and the live-row integration do not exist.

- [ ] **Step 3: Implement the pure interval helper**

Create `src/lib/calendarEventTiming.ts`:

```ts
export function isCalendarEventNotPast(event: { endAt: number }, now: number) {
  return event.endAt >= now;
}
```

- [ ] **Step 4: Integrate a minute clock and conditional title classes**

In `src/pages/CalendarPage.tsx`:

```ts
import { isCalendarEventNotPast } from '@/lib/calendarEventTiming';
```

Add state and cleanup near the existing Calendar page state:

```ts
const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());

useEffect(() => {
  const intervalId = window.setInterval(() => setCurrentTimestamp(Date.now()), 60_000);
  return () => window.clearInterval(intervalId);
}, []);
```

Extend `CalendarDayEventRow` with `isNotPast: boolean` and render its title with:

```tsx
<span
  className={cn(
    'block truncate text-[0.9375rem]',
    isNotPast ? 'font-medium text-foreground' : 'font-normal text-foreground/80',
  )}
>
  {event.title}
</span>
```

Pass the state only from the Today list:

```tsx
isNotPast={
  selectedDayKey === todayKey && isCalendarEventNotPast(event, currentTimestamp)
}
```

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run the Step 2 command.

Expected: both test files pass.

- [ ] **Step 6: Commit the Calendar change**

```bash
git add src/lib/calendarEventTiming.ts src/lib/calendarEventTiming.test.ts src/pages/CalendarLiveEvent.test.ts src/pages/CalendarPage.tsx
git commit -m "Emphasize live events in Calendar Today"
```

### Task 2: Outbound Workpool scheduling logs

**Files:**
- Modify: `convex/workflowReminderRuntime.test.ts`
- Modify: `convex/workflowFollowUpRuntime.test.ts`
- Modify: `convex/workflowReminderRuntime.ts`
- Modify: `convex/workflowFollowUpRuntime.ts`

**Interfaces:**
- Reminder log event: `workflow_reminder_workpool_scheduled`.
- Follow-up log event: `workflow_followup_workpool_scheduled`.
- Consumes: successful Workpool IDs, durable automation runs, timer IDs, and existing template snapshots.

- [ ] **Step 1: Add failing runtime log assertions**

Import `vi` beside the existing Vitest imports in both runtime tests. Before the scheduling call, create:

```ts
const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
```

In the reminder test, assert after the first scheduling call:

```ts
expect(consoleLog).toHaveBeenCalledWith(
  'workflow_reminder_workpool_scheduled',
  expect.objectContaining({
    appointmentId,
    timingOptionId: 'oneHourBeforeAppointment',
    templateName: 'appointment_reminder',
  }),
);
```

In the follow-up test, assert after the initial outbound handler call:

```ts
expect(consoleLog).toHaveBeenCalledWith(
  'workflow_followup_workpool_scheduled',
  expect.objectContaining({
    conversationId: fixture.conversationId,
    attempt: 1,
    templateName: 'follow_up',
  }),
);
```

Restore each spy at the end of its test with `consoleLog.mockRestore()`.

- [ ] **Step 2: Run the runtime tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowReminderRuntime.test.ts convex/workflowFollowUpRuntime.test.ts
```

Expected: FAIL because neither scheduling event is logged.

- [ ] **Step 3: Log reminder scheduling after enqueue**

Immediately after `workflowReminderWorkpool.enqueueAction` returns in `workflowReminderRuntime.ts`, add:

```ts
console.log('workflow_reminder_workpool_scheduled', {
  appointmentId,
  runId,
  workId,
  scheduledAt: candidate.scheduledAt,
  timingOptionId: candidate.timingOptionId,
  templateName: config.template.name,
});
```

- [ ] **Step 4: Log follow-up scheduling after enqueue**

In `enqueueWorkflowFollowUpWake`, load the existing run before enqueueing and throw if it is missing:

```ts
const run = await ctx.db.get(args.runId);
if (!run) throw new Error('Follow-up run not found');
```

Immediately after `workflowFollowUpWorkpool.enqueueAction` returns, add:

```ts
console.log('workflow_followup_workpool_scheduled', {
  conversationId: run.conversationId,
  timerId: args.timerId,
  runId: args.runId,
  workId,
  scheduledAt: args.dueAt,
  attempt: run.attempt,
  templateName: run.templateSnapshot.name,
});
```

- [ ] **Step 5: Run the runtime tests and verify GREEN**

Run the Step 2 command.

Expected: both runtime test files pass.

- [ ] **Step 6: Commit the scheduling logs**

```bash
git add convex/workflowReminderRuntime.ts convex/workflowReminderRuntime.test.ts convex/workflowFollowUpRuntime.ts convex/workflowFollowUpRuntime.test.ts
git commit -m "Log workflow Workpool scheduling"
```

### Task 3: Immediately-before-send logs

**Files:**
- Create: `convex/workflowAutomationSendLogging.test.ts`
- Modify: `convex/workflowReminderWorker.ts`
- Modify: `convex/workflowFollowUpWorker.ts`

**Interfaces:**
- Reminder log event: `workflow_reminder_sending`.
- Follow-up log event: `workflow_followup_sending`.
- Consumes: already-validated worker context immediately before `sendWorkflowWhatsappTemplate`.

- [ ] **Step 1: Write a failing source-order and privacy contract test**

Create `convex/workflowAutomationSendLogging.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const reminder = readFileSync(new URL('./workflowReminderWorker.ts', import.meta.url), 'utf8');
const followUp = readFileSync(new URL('./workflowFollowUpWorker.ts', import.meta.url), 'utf8');

test.each([
  [reminder, 'workflow_reminder_sending'],
  [followUp, 'workflow_followup_sending'],
])('logs immediately before the workflow provider call', (source, eventName) => {
  const logIndex = source.indexOf(`console.log('${eventName}'`);
  const sendIndex = source.indexOf('await sendWorkflowWhatsappTemplate', logIndex);
  expect(logIndex).toBeGreaterThan(-1);
  expect(sendIndex).toBeGreaterThan(logIndex);
  expect(source.slice(logIndex, sendIndex)).not.toMatch(/contactAddress|phoneNumber|messageBody|components/);
});
```

- [ ] **Step 2: Run the contract test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowAutomationSendLogging.test.ts
```

Expected: FAIL because the send-event logs are absent.

- [ ] **Step 3: Add the reminder before-send log**

Immediately before the sender call in `sendReminder`:

```ts
console.log('workflow_reminder_sending', {
  appointmentId: context.run.appointmentId,
  runId: context.run._id,
  conversationId: context.run.conversationId,
  templateName: context.run.templateSnapshot.name,
});
```

- [ ] **Step 4: Add the follow-up before-send log**

Immediately before the sender call in `wakeFollowUp`:

```ts
console.log('workflow_followup_sending', {
  runId: context.run._id,
  conversationId: context.run.conversationId,
  attempt: context.run.attempt,
  templateName: context.run.templateSnapshot.name,
});
```

- [ ] **Step 5: Run the contract test and worker-related tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowAutomationSendLogging.test.ts convex/workflowReminderRuntime.test.ts convex/workflowFollowUpRuntime.test.ts convex/workflowFollowUpWorker.test.ts
```

Expected: all selected test files pass.

- [ ] **Step 6: Commit the before-send logs**

```bash
git add convex/workflowAutomationSendLogging.test.ts convex/workflowReminderWorker.ts convex/workflowFollowUpWorker.ts
git commit -m "Log workflow messages before sending"
```

### Task 4: Integrated verification

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: all changes from Tasks 1–3.
- Produces: verified implementation and updated continuity receipt.

- [ ] **Step 1: Run focused tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/calendarEventTiming.test.ts src/pages/CalendarLiveEvent.test.ts convex/workflowAutomationSendLogging.test.ts convex/workflowReminderRuntime.test.ts convex/workflowFollowUpRuntime.test.ts convex/workflowFollowUpWorker.test.ts
```

Expected: every selected test passes with zero failures.

- [ ] **Step 2: Run targeted lint**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/lib/calendarEventTiming.ts src/lib/calendarEventTiming.test.ts src/pages/CalendarLiveEvent.test.ts src/pages/CalendarPage.tsx convex/workflowReminderRuntime.ts convex/workflowReminderRuntime.test.ts convex/workflowFollowUpRuntime.ts convex/workflowFollowUpRuntime.test.ts convex/workflowReminderWorker.ts convex/workflowFollowUpWorker.ts convex/workflowAutomationSendLogging.test.ts
```

Expected: zero lint errors in the changed implementation and tests, apart from independently reproduced pre-existing diagnostics in `CalendarPage.tsx` if present on `HEAD`.

- [ ] **Step 3: Run the production build**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 4: Check diff integrity and code size**

```bash
git diff --check
wc -l src/lib/calendarEventTiming.ts src/lib/calendarEventTiming.test.ts src/pages/CalendarLiveEvent.test.ts convex/workflowAutomationSendLogging.test.ts convex/workflowReminderRuntime.ts convex/workflowFollowUpRuntime.ts convex/workflowReminderWorker.ts convex/workflowFollowUpWorker.ts
```

Expected: no whitespace errors; every new file remains below 300 lines, and no touched backend module crosses 300 lines because of this change.

- [ ] **Step 5: Update the continuity ledger and commit verification**

Record the completed behavior and fresh test/lint/build receipts in `CONTINUITY.md`, preserving its bounded sections, then run:

```bash
git add CONTINUITY.md
git commit -m "Document workflow logging verification"
```
