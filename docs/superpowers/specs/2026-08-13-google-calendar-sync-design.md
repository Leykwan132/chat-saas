# Google Calendar Sync Design

## Summary

Kilobot will let each authenticated user connect their own primary Google Calendar through WorkOS Pipes. WorkOS owns the OAuth authorization flow, encrypted credential storage, token refresh, and provider HTTP via Pipes Relay. Kilobot never fetches or stores Google access or refresh tokens.

Convex remains the normalized calendar, booking, permissions, availability, reminders, and audit layer. Google Calendar is an external source and destination synchronized into that layer. Google push notifications trigger incremental synchronization when a user changes Google Calendar directly, while read-through synchronization remains the recovery mechanism before availability checks, agent operations, and Calendar page reads.

The first release supports one user-scoped connection and the user's primary Google Calendar. Secondary calendars are out of scope.

## Goals

- Let each user connect, reauthorize, and disconnect their own Google Calendar.
- Show primary Google Calendar events alongside Kilobot events on the Calendar page.
- Include Google events in availability and conflict checks.
- Create, update, and delete Google events from the Calendar page when the current user owns the connection.
- Let customer-facing agents list availability and create, update, or cancel Kilobot bookings in the assigned teammate's connected calendar.
- Synchronize changes made directly in Google Calendar back into Convex.
- Preserve event privacy across team members.
- Make retries, duplicate notifications, and concurrent edits safe.

## Non-goals

- Connecting multiple Google accounts for one Kilobot user.
- Synchronizing secondary, subscribed, shared, room, or resource calendars.
- Importing historical events without a bounded synchronization window.
- Automatically messaging customers after a teammate changes or deletes a booking directly in Google Calendar.
- Allowing customer-facing agents to mutate unrelated Google-originated events.
- Replacing WorkOS Pipes with a custom OAuth implementation.
- Real-time guarantees from Google push delivery alone.

## Decisions

### Connection ownership

Connections belong to individual WorkOS users, not agents or workspaces. An agent booking is written to the primary Google Calendar of the teammate assigned by the existing service assignment and availability system. Personal workspaces naturally resolve to the owner's connection.

A user can only authorize or disconnect their own Google account. Workspace owners and administrators may see whether teammates are connected, need reauthorization, or are disconnected, but cannot access account details or authorize on another person's behalf.

### Synchronization model

Kilobot uses a push-assisted synchronized cache:

1. An initial bounded full sync imports Google events and stores Google's `nextSyncToken`.
2. Google push notifications mark the connection dirty and enqueue an incremental sync.
3. Incremental sync requests use the stored `syncToken`, traverse every result page, apply changes and cancellations, and atomically advance to the final `nextSyncToken`.
4. Calendar page reads, availability checks, and agent operations request a refresh when the cache is stale.
5. A periodic recovery sweep synchronizes stale connections and renews expiring watch channels.

Push notifications are an acceleration signal, not the source of truth. Google documents that notification requests contain no event data and that a small percentage of notifications may be dropped.

### Enablement and failure semantics

Users who have never enabled Google Calendar retain the existing Kilobot-only calendar behavior. This is an explicit product mode, not a fallback.

Once a connection is enabled, Google synchronization is part of that user's calendar contract. If the connection becomes stale, loses required scopes, or requires reauthorization:

- Google-backed availability for that user fails closed.
- Google-backed create, update, and delete operations fail visibly.
- The agent cannot claim the external operation succeeded.
- The Calendar page shows a recovery action.
- Kilobot does not silently downgrade the operation to local-only storage.

## User experience

### Connection management

The Calendar page adds a custom Google Calendar connection control for the current user below Assigned to me. Connect uses a WorkOS Pipes authorize URL minted with `user_id` only (no `organization_id`) and Kilobot UI, not the hosted Pipes widget.

The page shows:

- Connection state: `Not connected`, `Connected`, `Syncing`, or `Reconnect required`.
- The connected Google account identity when WorkOS makes it available to the current user.
- Last successful synchronization time.
- Connect, reconnect, refresh, and disconnect actions appropriate to the current state.

After connection authorization succeeds, Kilobot discovers the primary calendar, performs the initial sync, and creates the Google Events watch channel. The UI does not report the integration as ready until the initial sync and watch registration succeed.

Disconnecting asks for confirmation because WorkOS removes the stored authorization. Kilobot stops the active Google watch channel when possible, removes imported Google-originated event copies and connection sync state, and preserves Kilobot-created booking history. Kilobot-created events already written to Google remain in Google Calendar; disconnect is not bulk deletion.

### Calendar display

The Calendar page renders Kilobot and imported Google events in the existing calendar views with a compact source indicator.

- The connection owner sees full imported event details.
- Other team members see the time block and the title `Busy` only.
- Private descriptions, locations, conference links, attendees, organizer details, and Google links are not returned to teammates.
- Kilobot-created bookings retain the existing calendar permission behavior.
- Transparent Google events do not block availability; opaque events do.
- Cancelled or deleted Google events do not block availability.

The current owner may edit or delete their own Google-originated events from Kilobot when Google grants write access. Teammates cannot mutate those events even if they hold workspace calendar-management permission.

## Agent behavior

Google calendar tools are enabled only in a booking-capable conversation and operate through the existing booking session and confirmation flow.

### Read

`listCalendarEvents` refreshes the relevant assigned teammate's Google cache and returns only information needed for scheduling. Unrelated external events are represented as busy time ranges and never expose private content to the model.

### Create

`createCalendarEvent` is reached through the existing confirmed booking flow. The customer must explicitly confirm the service, date, time, and collected attendee details before the event is created. The selected slot is refreshed and checked immediately before the write.

### Update

`updateCalendarEvent` may update only a Kilobot-created event linked to the active conversation. The customer must explicitly approve the final changes. The agent cannot update unrelated Google-originated events.

### Delete or cancel

`deleteCalendarEvent` may cancel only a Kilobot-created event linked to the active conversation. The latest customer request must clearly ask for cancellation. The agent reports success only after Google and Convex confirm the cancellation.

### Tool results

Tool responses use structured outcomes such as:

- `success`
- `not_connected`
- `needs_reauthorization`
- `sync_unavailable`
- `conflict`
- `not_found`
- `forbidden`
- `invalid_request`

Failure responses contain customer-safe recovery guidance and never include WorkOS responses, tokens, channel secrets, Google payloads, or internal identifiers that the customer does not need.

## Backend architecture

### Modules

New Google Calendar code is split by responsibility so no code file exceeds 300 lines:

- A WorkOS Pipes connection-health adapter reads connected-account state without vending Google tokens.
- Google Calendar HTTP calls go through WorkOS Pipes Relay (`X-Relay-URL` + `X-Relay-User`, no `X-Relay-Organization`).
- A Google Calendar HTTP client owns request construction, response validation, pagination, ETags, and error classification.
- Event mapping modules translate between Google events and the normalized Convex calendar model.
- Connection functions own authorization state, initial sync, disconnect, and connection health.
- Sync functions own full and incremental synchronization.
- Watch functions own channel creation, renewal, stopping, and notification validation.
- Write functions own idempotent create, conflict-safe update, and delete operations.
- Agent-tool adapters expose only conversation-scoped safe operations.
- Small Calendar UI components own connection status, the Pipes dialog, source presentation, and refresh states.

Existing entrypoints remain stable. `convex/http.ts`, `convex/crons.ts`, `convex/chat/threads.ts`, and `src/pages/CalendarPage.tsx` only register or compose the new focused modules.

### Connection state

A `googleCalendarConnections` table stores one row per Convex user:

- Convex user ID and WorkOS user ID.
- Provider slug `google_calendar`.
- Primary Google calendar ID and time zone.
- State: `connected`, `syncing`, `needs_reauthorization`, or `disconnected`.
- Stored incremental `syncToken`.
- Initial synchronization window boundaries.
- Last attempted and successful synchronization timestamps.
- Last safe error category.
- Active watch channel reference.
- Created and updated timestamps.

A `googleCalendarWatchChannels` table stores pending, active, retiring, retired, and expired channels independently so replacement channels can overlap safely. Each row stores its connection, channel ID, opaque resource ID and URI, hashed channel-token verifier, expiration, last message number for diagnostics, lifecycle state, and timestamps.

A `googleCalendarSyncRuns` table stores the current full or incremental run, its fixed request parameters, page cursor, candidate next sync token, counters, and state. A `googleCalendarWriteOperations` table stores idempotency keys and the external reconciliation state for creates, updates, and deletes.

The random channel token is generated server-side. Only a one-way verifier is persisted; the callback hashes the presented token and compares it using constant-time equality. No OAuth credential is stored in Convex.

### Event model

The existing `calendarEvents` external Google fields are retained. The model gains the minimum ownership and synchronization fields required to support privacy and safe writes:

- External owner user ID.
- External origin: `google` or `kilobot`.
- Google event status, transparency, organizer/owner editability, and recurrence-instance identity where required.
- Synchronization state: `synced`, `pending`, `failed`, or `conflict`.
- Last synchronized Google ETag and update timestamp.
- Stable operation key for a Kilobot-originated create.

Imported events create an assigned participant row for the external owner in every team calendar projection where that user is a member and calendar availability is relevant. Team-scoped projections preserve existing authorization indexes. The unique external identity is the team, external owner, calendar ID, Google event ID, and recurrence instance identity.

### Synchronization window

The initial primary-calendar sync imports expanded occurrences from 90 days in the past through 18 months in the future. The query uses stable parameters and stores the returned `nextSyncToken`. A monthly controlled full rebase advances this rolling window without mixing incompatible filters into incremental requests.

Recurring events are expanded with `singleEvents=true`. Each occurrence is mapped by its Google instance identity and original start time so moves, exceptions, and cancellations update the correct local row.

All-day events preserve Google's exclusive end-date semantics. Timed events preserve RFC 3339 instants and the IANA time zone supplied by Google.

### Full and incremental synchronization

Each connection has at most one active sync worker. Webhook bursts coalesce through a dirty marker and scheduled worker rather than starting parallel Google requests. Calendar page loads request a refresh when the last success is more than five minutes old. Availability checks and agent operations require a cache no more than 60 seconds old and wait for a coalesced refresh before continuing.

The worker:

1. Marks the connection as syncing without erasing the previous successful cache.
2. Obtains a fresh token from WorkOS Pipes.
3. Requests the first Google page using the stored `syncToken`, or the stable full-sync parameters when no token exists.
4. Traverses every `nextPageToken`, applying idempotent bounded batches through the sync-run record.
5. Upserts active events and applies cancelled or deleted entries.
6. Updates dependent participant rows, booking sessions, reminders, and audit events for Kilobot-originated bookings changed in Google.
7. Advances the connection to the final `nextSyncToken` only after every page and local batch succeeds, then records success and clears the dirty marker.

If another notification arrives while a sync runs, the dirty marker remains set and the worker performs another incremental pass before becoming idle.

Google `410 Gone` invalidates the sync token. The worker removes only the affected connection's imported Google-originated projections, preserves Kilobot booking records, clears the token, and performs a new full sync.

### Google-originated booking changes

When a teammate changes a Kilobot-created booking directly in Google:

- Time, title, description, location, link, status, and supported attendee response state are mapped back into the local event.
- Participant start-time indexes and the booking session's selected slot are updated.
- Existing appointment reminders are cancelled and rescheduled for the new time.
- The action is recorded as an external calendar change.
- Existing internal appointment notifications report the change to configured teammates.
- No customer message is sent automatically.

When the Google event is deleted, the local booking is marked cancelled, reminder jobs are cancelled, the booking session becomes cancelled, and the conversation leaves booked state when appropriate. The historical local event remains for audit and customer context.

## Push notification lifecycle

### Watch registration

After initial synchronization, the backend calls the Google Events `watch` endpoint for the primary calendar with:

- A unique UUID channel ID.
- Type `web_hook`.
- The public HTTPS Convex callback URL.
- A random channel token containing no sensitive data.
- An explicit expiration no longer than Google's supported lifetime.

The response's channel ID, resource ID, resource URI, and actual expiration are recorded. A watch is considered active only after these values are persisted.

### Webhook receiver

`POST /webhook/google-calendar` reads the `X-Goog-*` headers and does not expect a body. It validates:

- Channel ID exists and is active.
- Resource ID matches the stored opaque resource ID once registration is complete.
- Channel token verifies against the stored verifier.
- Resource state is one of `sync`, `exists`, or `not_exists`.
- Message number is syntactically valid.

The receiver returns `204` promptly after durably marking the connection dirty and scheduling work. It does not call Google synchronously. Unknown, expired, or invalid channels are rejected without scheduling.

Google may deliver the initial `sync` notification before the watch response is persisted. Registration creates the pending channel row before calling Google so this race can be recognized safely.

Message numbers are recorded for diagnostics but are not treated as a gap-free event sequence. Duplicate and out-of-order messages are safe because the incremental sync token determines the actual changes.

### Renewal and stopping

Google Events watch channels default to a seven-day lifetime and cannot be renewed in place. A daily recovery job creates a replacement channel when the active channel expires within 48 hours, using a new channel ID. The new and old channels may overlap. After the replacement is stored, Kilobot calls `channels.stop` for the old channel when possible and marks it retired locally regardless of an already-expired response.

Disconnect stops the active channel using a fresh token from the same WorkOS user and OAuth client when possible. An inability to stop an already-expired channel does not block local disconnection.

## Write consistency and conflicts

### Create

Kilobot reserves a local operation record and derives a deterministic Google-compatible event ID from it. Retrying the same operation addresses the same Google event instead of creating a duplicate. After Google confirms the event, Convex stores the external identity and marks the record synced.

If Google succeeds but the final Convex write is interrupted, the webhook or next read-through sync imports the deterministic event and reconciles it with the reserved operation.

### Update

Updates fetch the current event and use its latest ETag in a conditional Google write. An ETag mismatch causes a refresh and returns `conflict`; Kilobot does not overwrite the newer Google version automatically.

### Delete

Deletes are idempotent. A Google event already absent is treated as externally deleted after a confirming refresh. Kilobot preserves the local historical booking as cancelled rather than physically deleting it.

## Permissions and privacy

- WorkOS connected-account reads use the authenticated WorkOS user ID and the configured provider slug `google_calendar`.
- Google API calls run only in Convex actions or backend HTTP handlers, proxied through WorkOS Pipes Relay.
- Google tokens never enter Convex, the browser, agent prompt, logs, database, webhook token, or client-visible error.
- Relay requests omit `X-Relay-Organization` so connections stay user-scoped.
- The requested Google scope is `https://www.googleapis.com/auth/calendar.events`, which supports reading and editing events without calendar-sharing administration.
- Existing `CALENDAR_READ` and `CALENDAR_MANAGE` permissions continue to guard team Calendar access.
- Google-originated details require both team access and ownership by the current Convex user.
- Customer-facing agent reads receive busy intervals only for unrelated events.
- Customer-facing agent mutations require an event linked to the active conversation and created by Kilobot.

## Error handling and recovery

- WorkOS `not_installed` maps to explicit not-connected state.
- WorkOS `needs_reauthorization` or missing required scope maps to reconnect-required state.
- Google `401` or relevant `403` responses mark the connection unhealthy and stop Google-backed operations until recovery.
- Google `404` during update triggers a refresh and returns not found.
- Google `409` or ETag precondition failures return conflict after refresh.
- Google `410` for an incremental token starts a scoped full resync; `410` for an already-deleted event confirms deletion.
- Google quota and transient `429` or `5xx` responses use bounded retry with backoff outside database transactions.
- Repeated failures record only a safe category and timestamp for UI support.
- Availability uses the last cache only when its last successful sync is no more than 60 seconds old. A connected calendar that cannot refresh beyond that limit is unavailable for assignment.

## Observability

Operational records and structured logs expose:

- Connection state and last successful sync.
- Full versus incremental sync counts and duration.
- Imported, updated, cancelled, and conflict counts.
- Watch creation, expiration, renewal, retirement, and invalid notification counts.
- Safe WorkOS and Google error categories.
- Dirty-to-synchronized latency.

Tokens, event descriptions, attendee emails, Google response bodies, and channel secrets are excluded from logs.

## Testing strategy

Implementation follows test-driven development. Tests exercise observable behavior through focused adapters rather than asserting source text or mock existence.

### Unit tests

- WorkOS discriminated token responses and missing-scope classification.
- Timed, all-day, transparent, cancelled, recurring, exception, and deleted Google event mapping.
- Privacy projection for owner, teammate, and agent contexts.
- Deterministic Google event ID and idempotency-key derivation.
- Google error classification and safe customer-facing tool results.
- Watch-header validation and channel-token verification.

### Convex integration tests

- Connection ownership and permissions.
- Initial full synchronization with pagination.
- Incremental synchronization with pagination and atomic token advancement.
- Duplicate and out-of-order webhook coalescing.
- Notification-during-sync dirty replay.
- `410 Gone` scoped reset and full resync.
- External update and deletion propagation into participants, booking sessions, reminders, conversation state, and audit history.
- Channel creation race, renewal overlap, retirement, and disconnect.
- Stale-cache fail-closed availability.
- Idempotent create recovery after partial completion.
- ETag conflict preservation.

### UI tests

- Connection, syncing, connected, reconnect-required, and disconnected states.
- Pipes dialog integration and post-authorization refresh.
- Source indicators and owner-versus-teammate privacy.
- Google-originated owner edit/delete controls and teammate read-only behavior.
- Visible synchronization and conflict errors.

### Agent tests

- Tools appear only in eligible booking conversations.
- Busy-only event reads never reveal private Google content.
- Create and update require explicit customer confirmation.
- Cancellation requires an explicit cancellation request.
- Mutations reject unrelated, non-Kilobot, and different-conversation events.
- The agent cannot claim success after any failed external operation.

### Manual verification

Using the configured WorkOS sandbox or production test account:

1. Connect a Google account and confirm initial events appear.
2. Create, move, and delete events in Google Calendar and confirm webhook-driven updates in Kilobot.
3. Create, edit, and cancel events from Kilobot and confirm Google changes.
4. Exercise a booking through an agent and confirm assigned-member ownership.
5. Confirm a teammate sees only Busy for imported external events.
6. Force reauthorization and confirm fail-closed recovery behavior.
7. Renew a watch channel and verify overlapping notifications do not duplicate events.

## Rollout and configuration

WorkOS Google Calendar provider configuration is already complete according to the user. Before production enablement, verify:

- Provider slug is `google_calendar`.
- Required scope `https://www.googleapis.com/auth/calendar.events` is granted.
- Production uses the intended custom Google OAuth credentials rather than sandbox-only shared credentials.
- The Convex Google webhook URL is publicly reachable over HTTPS.
- The callback URL is allowed by any relevant deployment controls.
- Existing users who authorized narrower scopes are prompted to reauthorize.

The feature ships behind a server-controlled capability flag until connection, synchronization, agent, and webhook verification pass in the target deployment. Existing internal calendars remain unchanged for users who never enable the integration.

## Source references

- [WorkOS Pipes](https://workos.com/docs/pipes)
- [WorkOS Google Calendar tutorial](https://workos.com/blog/sync-google-calendar-without-oauth)
- [Google Calendar OAuth scopes](https://developers.google.com/workspace/calendar/api/auth)
- [Google Calendar push notifications](https://developers.google.com/workspace/calendar/api/guides/push)
- [Google Calendar incremental synchronization](https://developers.google.com/workspace/calendar/api/guides/sync)
- [Google Calendar Events watch](https://developers.google.com/workspace/calendar/api/v3/reference/events/watch)
