# Local WhatsApp Template Source Design

## Goal

Make the local Convex `whatsappTemplates` table the only read source for WhatsApp message templates across the product. Meta remains the destination for template creation and updates and the authority that approves or rejects a template, but frontend template lists, details, previews, and selectors must never fetch Meta's template collection directly.

## Scope

- Replace the Meta-backed template-list action in Message Templates, Template Detail, channel-specific templates, Broadcast, Follow-up, and Workflow.
- Serve template lists and details through authenticated, indexed, bounded Convex queries.
- Persist the Meta template ID returned by creation and delivered by status webhooks.
- Keep successful submissions unavailable as `in_review` until Meta's webhook approves them.
- Mark submission failures and terminal negative webhook events as `failed` with the available reason.
- Make only `approved` templates selectable by Broadcast, Follow-up, and Workflow.
- Remove Meta collection lookups that currently resolve a template ID before an update.
- Preserve Meta POST requests required to create, update, and send templates.

This design does not import templates created outside this application, poll Meta for status, add manual approval controls, change which WhatsApp channel the main Templates page selects, or implement message sent/opened metrics.

## Source of Truth

Convex owns the complete application-facing template record:

- organization and channel ownership;
- template name and language;
- category, parameter format, and components;
- Meta template ID when known;
- application status and failure reason;
- status update timestamp.

All UI consumers subscribe to this record through Convex. Meta is contacted only when an operation must mutate Meta state or send a message. There is no `GET /{wabaId}/message_templates` request in the template read or update-resolution path.

## Status Lifecycle

The application status lifecycle is:

```text
submitting -> in_review -> approved
                       -> failed
```

- `submitting`: the background Meta creation or update request has not completed.
- `in_review`: Meta accepted the request successfully, but an approval webhook has not arrived.
- `approved`: Meta reported `APPROVED` or `REINSTATED` through `message_template_status_update`.
- `failed`: the Meta request threw or returned an error, or Meta reported a terminal unavailable state.

Successful submission never implies approval. The successful action response stores Meta's template ID, clears any prior error, and transitions only `submitting` to `in_review`. This conditional transition prevents a fast approval webhook from being overwritten by a slower action completion mutation.

Webhook event mapping is explicit:

- `APPROVED`, `REINSTATED` -> `approved`
- `PENDING`, `IN_APPEAL` -> `in_review`
- `REJECTED`, `PENDING_DELETION`, `DELETED`, `DISABLED`, `FLAGGED` -> `failed`

The webhook reason is stored when present. Otherwise, a stable user-facing reason derived from the event is stored. Unknown events are logged and ignored rather than assigned an invented state.

Only `approved` templates are available to sending and automation selectors. The management pages display every status. `in_review` uses the existing amber indicator and the exact label `In review`.

## Data Model and Migration

The `whatsappTemplates` table gains:

- `metaTemplateId?: string`
- `statusUpdatedAt?: number` during migration, then required after every legacy row is backfilled

Its status validator widens from `submitting | submitted | failed` to temporarily accept both the legacy `submitted` value and the new `submitting | in_review | approved | failed` lifecycle. New writes never produce `submitted`.

An `@convex-dev/migrations` migration changes every legacy `submitted` record to `in_review` and initializes a missing `statusUpdatedAt` from `createdAt`. Existing `submitted` records are not assumed to be approved. After the migration has completed in every deployment, a narrow follow-up requires `statusUpdatedAt` and removes `submitted` from the schema.

The table adds indexes for:

- organization, channel, and status, for approved selectors;
- channel and Meta template ID, for webhook and update resolution.

The existing channel/name/language natural-key index remains available for webhook matching and exact detail reads.

## Query API

Template reads move into focused public queries in the WhatsApp template module:

- `listForChannel`: returns a bounded, newest-first management list for an authorized organization channel.
- `listApprovedForChannel`: returns a bounded, newest-first list containing only approved templates.
- `getForChannelByNameAndLanguage`: returns one authorized template for detail and preview routes.

Each query derives organization identity from authentication, verifies channel ownership, and uses an index. Lists do not use unbounded `collect()` calls. The implementation uses a shared result projection so every consumer receives the same template fields and status vocabulary.

The Message Templates and channel-specific management pages use `listForChannel`. Broadcast, Follow-up, and Workflow pickers use `listApprovedForChannel`. Template Detail and Broadcast Detail use the exact query instead of loading the full collection to find one record.

Convex subscriptions replace manual action loading. The Message Templates Refresh button is removed because database writes and webhook patches update the page reactively.

## Creation and Update Flow

Every creation entry point writes the local record first with `submitting`, then schedules the Meta submission action. The legacy channel-specific inline creator must delegate to the same local creation path instead of POSTing directly to Meta without persistence.

The submission action parses Meta's successful response, requires the returned template ID, and conditionally transitions the record to `in_review`. A response or transport error transitions it to `failed` and stores the error.

Template updates resolve the Meta template ID from the local record. They no longer list Meta templates to find it. An update requires `metaTemplateId`; absence is an explicit error. Before the Meta update request, the local record transitions to `submitting`. Success transitions it to `in_review`, and failure transitions it to `failed`.

## Webhook Flow

The existing signed `/webhook/whatsapp` dispatcher handles `message_template_status_update` alongside its current WhatsApp events.

For each status update:

1. Read the WABA ID from the webhook entry.
2. Read the event, Meta template ID, name, language, and reason from the change value.
3. Resolve all local WhatsApp channels for that WABA.
4. Match local records by Meta template ID. For legacy records without an ID, match the normalized template name and language and persist the webhook's ID.
5. Apply the explicit event mapping without downgrading a newer terminal state through a stale pending event.

Language matching normalizes case and hyphen/underscore separators because webhook language formatting can differ from the stored request format. Duplicate webhook delivery is idempotent. Multiple channels connected to the same WABA receive the same matching template status update.

The Meta application must be subscribed to the `message_template_status_update` webhook field. Missing subscription is an operational configuration error; polling is not introduced as a fallback.

## Error Handling

- Invalid or unauthorized query channels fail explicitly.
- A successful Meta submission without a template ID fails the submission instead of creating an unusable local record.
- Meta request errors preserve their message on the local failed record.
- Rejection and terminal webhook events preserve Meta's reason when supplied.
- Malformed template-status webhook changes are logged and skipped without blocking unrelated webhook changes in the same delivery.
- A missing local webhook match is logged with non-sensitive identifiers and acknowledged so Meta retries do not create an endless failure loop.
- Selectors never expose submitting, in-review, or failed templates.

## Logging

- Remove template-list debug output, including raw Meta responses and template rows.
- Remove routine template submission start and success `console.log` calls.
- Keep only concise warning/error diagnostics for malformed or unknown webhook events, missing local webhook matches, and provider request failures.
- Diagnostics must not include access tokens, signed media URLs, request/response payloads, template components, or customer-facing message content.

## Testing

Backend regressions cover:

- authorized local list and exact queries;
- organization isolation and bounded indexed reads;
- approved-only selector results;
- successful submission transitioning to `in_review` with the Meta template ID;
- submission errors transitioning to `failed`;
- approval, pending, rejection, disabling, deletion, flagging, and reinstatement webhooks;
- webhook matching by WABA and template ID, normalized legacy natural-key matching, duplicate delivery, and multiple channels for one WABA;
- the approval-before-action-completion race not being downgraded to `in_review`;
- migration of legacy `submitted` records to `in_review`;
- update resolution using the stored Meta template ID without a Meta list request.
- template source and submission modules contain no routine or raw-response `console.log` calls.

Frontend/source regressions verify that every former `whatsappBroadcast.listTemplates` consumer uses the intended local query, only approved templates appear in selectors, the management page shows `In review`, and the obsolete Refresh control is absent.

Final verification includes focused red-green tests, the complete Vitest suite, Convex code generation and type checking, targeted ESLint, the production build, migration dry-run and configured deployment run, diff checks, and touched-code line counts.

## Rollout

1. Widen the schema and deploy query, mutation, action, and webhook support.
2. Confirm the Meta app is subscribed to `message_template_status_update`.
3. Run the legacy `submitted` to `in_review` migration in development and production.
4. Replace every frontend action consumer with the local queries and remove obsolete Meta listing code.
5. Verify a real test template progresses from Submitting to In review and then Approved or Failed through the webhook.
6. Narrow the schema to remove the legacy `submitted` value only after all deployments report a completed migration.
