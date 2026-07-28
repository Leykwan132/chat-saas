# Team Subscription Deletion Cleanup Design

Date: 2026-07-28

## Goal

When Stripe confirms that an organizational workspace subscription has ended through `customer.subscription.deleted`, KiloBot must stop treating the subscription state as an exception and permanently remove the team workspace and all data owned by it.

Personal workspaces remain on the Free plan and are not affected by this lifecycle.

## Product Contract

An organizational workspace requires a paid subscription. Downgrading that subscription to Free permanently deletes the organizational workspace. The deletion has no recovery window and cannot be undone.

The customer receives a destructive confirmation before KiloBot opens Stripe's billing portal. KiloBot does not delete anything merely because the portal opened. Cleanup begins only after Stripe sends `customer.subscription.deleted`.

## Downgrade Confirmation

The Free-plan action for a paid organizational workspace opens a confirmation modal before opening Stripe.

### Copy

Title:

> Confirm downgrade

Description:

> Once your downgrade is completed, your team workspace and its data will be permanently deleted. This cannot be undone.

The modal presents three icon-led consequences:

1. **Your conversations will be deleted**
   All conversations, messages, contacts, agent threads, and conversation history will be permanently removed.
2. **Your workspace data will be cleared**
   Agents, workflows, knowledge, files, analytics, settings, and team memberships will be deleted.
3. **Your channels will be disconnected**
   WhatsApp, Instagram, Messenger, web widgets, and associated credentials will be removed and will stop processing messages.

Actions:

- `Confirm downgrade` is the primary destructive action and opens the Stripe billing portal.
- `Go back` is a text action that closes the modal.

This confirmation applies only when a paid organizational workspace selects Free. It does not change paid-to-paid plan changes or Personal Free behavior.

## Post-Cancellation Unavailable State

Stripe and Convex updates are asynchronous. A browser may still hold a deleted team's route or agent identifier after cleanup begins or completes.

Instead of showing a backend error or redirecting to onboarding, the application shows a minimal blocking state:

Title:

> Workspace no longer available

Action:

> Back to Personal

The action selects the user's Personal workspace and navigates to `/workspace`. There is no secondary copy or action.

## Subscription Resolution

Subscription cancellation is a valid domain state.

- Active and trialing subscriptions resolve their configured paid plan.
- A canceled or otherwise inactive subscription resolves Free and returns its Stripe status.
- A missing subscription on a team already entering deletion resolves Free instead of throwing.
- An active subscription with an unknown price remains an operational error because it indicates a catalog or environment mismatch.
- A missing organizational team after cleanup is handled as an unavailable workspace, not as a billing exception.

The existing direct exception for a canceled or inactive team subscription is removed.

## Immediate Isolation

The Stripe webhook performs one short transaction before enqueueing asynchronous cleanup:

1. Resolve the organizational team from the event's `orgId`.
2. Make duplicate delivery a successful no-op when the team no longer exists or cleanup was already requested for the same Stripe subscription.
3. Mark the team as deleting so every workspace access and ingestion boundary rejects new activity.
4. Record the Stripe status as canceled and clear paid-plan resolution.
5. Move every member whose active workspace is the deleting team to their Personal workspace.
6. Create or reuse one deletion job keyed by team and Stripe subscription.
7. Enqueue the cleanup coordinator in a dedicated Workpool.

The deleting state is transient. It exists only to close the race between webhook receipt and final team removal.

While a team is deleting:

- No new messages, contacts, conversations, uploads, analytics, or usage events are stored.
- AI replies, workflows, reminders, follow-ups, broadcasts, imports, appointment operations, avatar sessions, and background analysis do not start.
- Public web widgets and avatar entrypoints return unavailable.
- Meta webhooks are acknowledged without persisting or processing their payloads.
- UI queries return the unavailable state instead of workspace data.

## Cleanup Architecture

Cleanup uses a dedicated Workpool with bounded parallelism and an idempotent coordinator. A durable deletion-job row records phase, cursor, attempt information, and the target team identifiers while cleanup is active. That row is deleted after successful completion.

Every phase must be safe to repeat. Missing records and already-disconnected external resources are successful outcomes.

The coordinator works in bounded pages. It never loads or deletes an unbounded workspace in one Convex transaction.

### Phase 1: Stop Scheduled and Background Work

- Cancel or neutralize known workspace Workpool jobs and scheduled operations.
- Mark any rows that can independently emit messages or external requests as ineligible before deletion.
- All worker entrypoints re-check the team's deleting state so already-running or delayed work becomes a no-op.

### Phase 2: Disconnect External Channels

- Disable each channel locally before making provider calls.
- Unsubscribe or disconnect WhatsApp, Instagram, and Messenger integrations using the supported provider operations when available.
- Disable web-widget and avatar public entrypoints.
- Remove channel credentials only after provider cleanup no longer needs them.
- Treat provider-side already-disconnected or not-found responses as successful.

### Phase 3: Delete External Content

- Capture every conversation `threadId` before deleting conversations.
- Delete Convex Agent component threads through the component's supported asynchronous thread-deletion API so component messages and streams are removed.
- Delete R2 objects and Convex storage objects referenced by workspace media, knowledge, workflow, widget, avatar, and message records.
- Delete Cloudflare knowledge/vector items through the existing deletion path.
- Remove any provider-side media or configuration resources owned by the workspace when the integration exposes a supported deletion operation.

Local source rows remain available until their external cleanup identifiers have been consumed.

### Phase 4: Delete Local Workspace Data

Delete dependent records before their parents. The cascade includes all current team-owned data, including:

- Inbox data: messages, conversations, customers, reactions embedded in messages, inbound media batches and items, conversation logs, topics, assignments, facts, projections, refresh requests, metric entries, advanced analytics, and agent-overview facts.
- Agent data: agents, Convex Agent component threads, workflows, nodes, edges, automation runs, operations, timers, cost totals, template usage, knowledge entries, and knowledge media.
- Channel data: channels, web-widget settings, avatar configurations, avatar sessions and events, sync requests, history batches, ingest threads and messages, account updates, connection attempts, templates, template media, and OAuth sessions tied to the workspace.
- Customer operations: lead routing settings, schedules, shifts, time off, appointments, booking sessions, calendar events and participants, quick replies, broadcasts and recipients, follow-up rules and sends, imports, jobs, and import rows.
- Usage and billing-adjacent workspace data: raw agent usage, credit usage events scoped to the team, workspace credit logs, and workspace aggregates that can be removed through their supported component APIs.
- Workspace administration: setup state, invitation records, memberships, and role-related local records. Memberships remain until the final phase.

The implementation plan must perform a schema audit and maintain one explicit deletion manifest that maps every team-owned table or component resource to:

- its workspace ownership path;
- its required deletion order;
- its bounded index or parent traversal;
- its external cleanup dependency, if any.

Any table with team-owned data that is absent from the manifest is a release blocker.

### Phase 5: Delete the Team

After every dependent and external phase succeeds:

1. Verify no user still has the team selected.
2. Delete the external WorkOS organization so later organization or membership events cannot recreate the removed team.
3. Delete remaining invitations and memberships.
4. Delete the team row.
5. Delete the deletion-job row.

The WorkOS organization-deleted webhook must join the existing deletion job instead of deleting the local team out of order. A WorkOS organization deletion without an existing Stripe-triggered job uses the same complete workspace cleanup path so it cannot orphan team-owned data.

## Failure Handling

- Stripe webhook retries never create parallel cleanup jobs.
- WorkOS organization-deleted webhook delivery never creates a second cleanup job or deletes the team before dependent cleanup completes.
- Workpool retries resume from the recorded phase and cursor.
- A failed provider disconnection retains the credentials required for retry while the team remains inaccessible.
- Local parent rows are not removed before required external identifiers are consumed.
- A final verification phase checks that no team-owned records, component threads, storage objects, active jobs, or usable channel credentials remain.
- Permanent cleanup failure is surfaced in operational logs with the team ID, organization ID, phase, and safe record identifiers. Access tokens and message contents are never logged.
- Customer access remains blocked throughout retry and recovery.

## Security Boundary

The unavailable UI is not the access-control boundary. Backend queries, mutations, actions, HTTP ingestion, public widget entrypoints, and background workers must reject or no-op a deleting workspace.

Only verified Stripe or WorkOS webhooks and internal cleanup functions can start or advance deletion. No public function accepts an arbitrary team ID to purge.

## Testing

Focused automated coverage must prove:

- The downgrade confirmation appears only for paid team-to-Free changes.
- `Confirm downgrade` opens Stripe only after confirmation.
- `Go back` closes the modal without opening Stripe.
- The three consequence rows include explicit conversation deletion.
- Canceled team subscription resolution returns Free with canceled status instead of throwing.
- Webhook delivery marks the team deleting and returns before bulk cleanup.
- All affected members are switched to Personal.
- New UI, API, webhook, widget, and worker activity is blocked once deletion starts.
- Agent component threads and their messages are deleted.
- External channel disconnection and credential removal occur in the safe order.
- The deletion manifest removes every seeded team-owned record and external-object reference.
- Personal workspace data and other teams remain untouched.
- Workpool retries resume after injected failure.
- Duplicate Stripe events do not duplicate cleanup or fail after the team is gone.
- WorkOS deletion cannot recreate or prematurely remove the team during cleanup.
- The team and memberships are deleted last.
- Stale team and agent routes show `Workspace no longer available`.
- `Back to Personal` selects Personal and navigates to `/workspace`.

## Release and Changelog

This behavior is destructive and customer-facing. The production release requires:

- verified Stripe test-event coverage;
- a seeded end-to-end deletion rehearsal containing every manifest category;
- confirmation that external disconnection credentials are retained until their phase succeeds;
- operational visibility for incomplete deletion jobs;
- customer-facing downgrade copy deployed before destructive cleanup is enabled.

The public changelog is updated only when production availability is confirmed.

## Out of Scope

- Export tooling or Contact support actions in the downgrade modal.
- A recovery or retention window.
- Soft deletion of workspace content.
- Restoring a deleted team after resubscription.
- Changing Personal Free storage or feature behavior.
