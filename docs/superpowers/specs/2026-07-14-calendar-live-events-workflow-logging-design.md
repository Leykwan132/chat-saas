# Calendar Live Events and Workflow Logging Design

## Goal

Make an event that is currently happening easier to recognize in the Calendar Today list, and add concise Convex console output that traces when reminder and follow-up message jobs are scheduled and when those messages are about to be sent.

## Scope

- Emphasize only the title of an event that is happening now in the Today list.
- Log every outbound reminder Workpool job after it has been scheduled, including jobs created immediately after an appointment is created.
- Log every outbound follow-up Workpool job after it has been scheduled.
- Log immediately before each workflow reminder or workflow follow-up WhatsApp template is sent to the provider.
- Keep logs in the Convex console only. Do not add persistent records, UI history rows, or new schema fields.

## Live Event Presentation

An event is happening when its interval contains the current timestamp:

```ts
event.startAt <= now && now < event.endAt
```

The start boundary is inclusive and the end boundary is exclusive. An ongoing event title uses the existing foreground color at full strength with semibold weight. Upcoming titles retain the current regular, slightly muted treatment. Past-row opacity remains unchanged.

The Today list maintains a lightweight current timestamp that refreshes once per minute so a row becomes emphasized or returns to its normal state without requiring navigation or another user action. The time comparison is isolated in a small pure calendar helper and receives the current timestamp explicitly for deterministic tests.

Only the Today list receives this treatment. Month-grid items, dialogs, search behavior, event ordering, and the time/duration line do not change.

## Workpool Scheduling Logs

The log is emitted after `enqueueAction` returns successfully so it includes the actual Workpool ID and never claims that a failed enqueue was scheduled.

Reminder scheduling logs live in the existing appointment reminder scheduling path. This is the path called after an eligible appointment is created, and it may schedule multiple reminder jobs for one appointment. Emit one log for each scheduled job with:

- event name `workflow_reminder_workpool_scheduled`
- appointment ID
- automation run ID
- Workpool ID
- scheduled timestamp
- reminder timing option ID
- template name

Follow-up scheduling logs live in the shared follow-up wake enqueue function so initial and subsequent follow-up attempts use the same log boundary. Emit one log for each scheduled job with:

- event name `workflow_followup_workpool_scheduled`
- conversation ID
- timer ID
- automation run ID
- Workpool ID
- scheduled timestamp
- follow-up attempt
- template name

## Before-Send Logs

The log is emitted after the worker has confirmed that the run remains eligible and immediately before calling the WhatsApp template sender. Skipped, cancelled, rescheduled, or otherwise ineligible jobs do not emit a send log.

Reminder sends emit `workflow_reminder_sending` with the appointment ID, run ID, conversation ID, and template name.

Follow-up sends emit `workflow_followup_sending` with the run ID, conversation ID, follow-up attempt, and template name.

All entries use `console.log` with a stable event-name string and one structured object. Logs contain identifiers and template metadata only. They do not contain phone numbers, customer names, message bodies, or template parameter values.

## Data Flow

Appointment creation continues to invoke the existing reminder runtime. For every eligible reminder candidate, the runtime creates or updates its durable run, enqueues the reminder Workpool action, logs the returned Workpool ID and schedule details, then persists the Workpool ID on the run.

Eligible outbound conversations continue to invoke the existing follow-up runtime. Its shared enqueue function schedules the initial or next wake, logs the returned Workpool ID and schedule details, then persists the Workpool ID on the timer and run.

When either Workpool action executes, the worker reloads and validates its context. Only a context that will proceed to the provider call produces the corresponding before-send log.

## Error Handling

- A failed Workpool enqueue throws through the existing path and produces no scheduled log.
- A provider send that throws still has a before-send log, making the attempted outbound operation visible alongside the existing Workpool failure handling.
- Existing completion, retry, cancellation, skip, and persistent history behavior remains unchanged.
- Console logging does not catch, suppress, replace, or alter any errors.

## Testing

- Pure calendar tests cover before-start, exact-start, during-event, exact-end, and after-end boundaries.
- A Calendar Today-list contract test verifies that ongoing titles receive the darker semibold classes while other title and row treatments remain intact.
- Reminder runtime coverage verifies that appointment-triggered Workpool scheduling includes the reminder scheduling log after enqueue.
- Follow-up runtime coverage verifies that the shared enqueue path includes the follow-up scheduling log after enqueue.
- Worker contract coverage verifies that both before-send logs appear immediately before their respective provider calls and contain no message content or customer contact fields.
- Existing reminder/follow-up runtime and Calendar tests remain green.

## Non-Goals

- Logging reconciliation or lifecycle maintenance Workpool jobs that do not directly schedule a customer message.
- Logging successful provider completion after the send returns.
- Logging skipped, cancelled, or rescheduled work as a send attempt.
- Adding persistent audit records, new history UI, analytics, schema fields, or external log transport.
- Changing reminder/follow-up scheduling, eligibility, retry, or delivery behavior.
- Changing event cards outside the Calendar Today list.
