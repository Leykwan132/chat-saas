# Workflow Follow-up Legacy Retirement Design

Date: 2026-07-15

## Goal

Make Workflow Follow-up the only follow-up configuration and execution system. Remove the standalone legacy system, including its pages, API, cron, Workpool, tables, customer scheduling fields, and tests.

After retirement, maximum attempts, initial delay, retry interval, audience, template strategy, and message snapshots must come exclusively from `workflows.followUpAutomation`.

## Confirmed Decisions

- Existing legacy rules will be deleted, not translated into Workflow Follow-up.
- Existing legacy send history will be deleted.
- Legacy customer scheduling state will be cleared.
- Workflow automation history and operational records will be preserved.
- Production code will not retain fallback reads or compatibility writes for the legacy system.
- Old standalone Follow-up URLs will redirect to the agent's Workflow page.

## Current State

Two independent systems currently exist.

### Workflow Follow-up

Configuration is stored in `workflows.followUpAutomation`. Execution uses:

- `workflowFollowUpTimers`
- `workflowAutomationRuns`
- `workflowAutomationOperations`
- `workflowFollowUpWorkpool`

The workflow configuration owns canonical numeric values such as `startAfterMinutes`, `intervalHours`, and `maxAttempts`, together with selections, audience filters, scope, revision, message strategy, and template snapshots.

### Legacy Follow-up

Configuration is stored in `followUpRules`. Execution and history use:

- `followUpSends`
- `customers.followUpPending`
- `customers.followUpAttempt`
- `customers.followUpPendingRuleId`
- `customers.followUpScheduledAt`
- `followUpWorkpool`
- the daily `runDailyFollowUpScan` cron
- `convex/whatsappFollowUp.ts`
- `convex/followUpPool.ts`
- `convex/followUpQueries.ts`

The standalone routes are:

- `/dashboard/:agentId/follow-ups`
- `/dashboard/:agentId/follow-ups/new`
- `/dashboard/:agentId/follow-ups/:ruleId`

Development currently contains one legacy rule, no legacy send records, and no customers carrying legacy scheduling state.

## Considered Approaches

### Immediate single-deployment deletion

Remove the runtime and schema together. This is rejected because Convex will reject a schema deployment while documents still exist in removed tables or while customer documents still contain removed fields.

### Compatibility shell

Stop scheduling new legacy work while retaining legacy tables, API, and pages indefinitely. This is rejected because it leaves two apparent sources of truth and does not satisfy complete retirement.

### Staged hard retirement

First stop all legacy entry points and deploy bounded cleanup migrations while the permissive schema remains. Verify cleanup, then remove the legacy schema and component. This is the selected approach.

## Target Architecture

### Authoritative configuration

Every Workflow Follow-up scheduling and sending decision reads the saved `workflows.followUpAutomation` configuration for the assigned agent's workflow.

- `maxAttempts` limits attempts.
- `startAfterMinutes` determines the first due time.
- `intervalHours` determines subsequent due times when `maxAttempts` exceeds one.
- `audienceFilters` determines eligibility.
- `messageStrategy` and saved template snapshots determine the message for each attempt.
- `revision` determines whether an existing active timer must be reconciled.

No runtime function may read `followUpRules`, `followUpSends`, or legacy customer follow-up fields.

### Operational state

Workflow operational tables remain unchanged. They continue to own timer state, attempt progress, operation status, send history, and cost accounting.

The `workflowFollowUpWorkpool` component remains. Only the legacy `followUpWorkpool` component is removed after legacy work is verified inactive.

### User interface

The three standalone legacy pages and their page-specific tests are deleted. Their route definitions become redirects to `/dashboard/:agentId/workflow` so bookmarks do not produce a dead end.

Existing links from Inbox banners, Workflow guides, cost calculators, and feature overview actions point to the Workflow page. User-facing Follow-up guidance describes Workflow Follow-up and does not imply a separate rules area.

## Migration and Deployment Sequence

### Deployment A: stop legacy behavior and expose cleanup

1. Remove the legacy daily cron registration.
2. Remove legacy UI entry points and redirect legacy routes to Workflow.
3. Remove production callers of legacy CRUD and scheduling functions.
4. Add batched migrations that:
   - delete `followUpSends` rows;
   - delete `followUpRules` rows;
   - clear all four legacy customer fields when any are present.
5. Add bounded verification functions that report whether any legacy rows or customer fields remain.
6. Keep legacy schema definitions and the legacy component mounted temporarily so Deployment A is compatible with pre-cleanup data.

The cleanup order removes send rows before rule rows because `followUpSends.ruleId` refers to `followUpRules`. Customer references are cleared before the rule table is removed from the schema.

### Between deployments: clean and verify

1. Run every cleanup migration in dry-run mode.
2. Review migration status and expected affected counts.
3. Run the migrations against the target deployment.
4. Confirm migration completion.
5. Run explicit verification and require:
   - zero `followUpSends` rows;
   - zero `followUpRules` rows;
   - zero customers with any legacy scheduling field;
   - no active legacy scheduling entry point.
6. Confirm the legacy Workpool has no active job that can invoke removed legacy functions.

Development cleanup is performed first. Production cleanup requires the same dry-run, execution, and verification sequence before its schema is narrowed.

### Deployment B: narrow and delete

1. Remove `followUpRules` and `followUpSends` from `convex/schema.ts`.
2. Remove the four legacy customer fields from `convex/schema.ts`.
3. Delete the legacy Convex modules and their tests.
4. Remove `followUpWorkpool` from `convex/convex.config.ts`.
5. Remove temporary cleanup and verification functions after the narrowed deployment succeeds and stability is confirmed.
6. Regenerate Convex types and verify there are no generated legacy function or table references.

Deployment B must not proceed for an environment unless its verification step passes.

## Failure Handling and Rollback

- A failed cleanup batch is resumed through the migrations component; it is not replaced by an unbounded mutation.
- A failed verification blocks Deployment B.
- If Deployment A has a regression, the legacy runtime remains disabled. Rollback restores application code without reactivating the legacy cron or public scheduling path.
- Once legacy rows are deleted, they are intentionally not recoverable through application rollback.
- Workflow records are outside the cleanup scope and must never be mutated by the legacy retirement migration.

## Testing Strategy

### Workflow authority

- Saving a maximum-attempt selection persists the matching canonical `maxAttempts`.
- Saving a start-after selection persists the matching canonical `startAfterMinutes`.
- The timer and worker stop at the saved Workflow maximum attempt count.
- Revision reconciliation uses the latest Workflow timing values.
- No Workflow runtime module imports or queries a legacy rule or customer field.

### Retirement behavior

- Legacy URLs redirect to the correct agent Workflow URL.
- Former legacy links target Workflow.
- The daily cron no longer registers the legacy scan.
- Cleanup migrations delete rules and sends and clear customer fields idempotently.
- Verification fails while any legacy state remains and passes only at zero.
- Repository scans find no production references to `followUpRules`, `followUpSends`, `followUpPending`, `followUpAttempt`, `followUpPendingRuleId`, `followUpScheduledAt`, or `followUpWorkpool` after Deployment B.

### Regression coverage

- Workflow Follow-up scheduling, retrying, reply cancellation, revision reconciliation, template sending, Inbox recording, history, and cost tests continue to pass.
- Reminder automation remains unaffected.
- The complete application test suite, Convex TypeScript check, production build, targeted lint, and Convex code generation pass under Node 22.

## Acceptance Criteria

- Workflow Follow-up is the only UI that configures follow-ups.
- Workflow Follow-up is the only runtime that schedules or sends follow-ups.
- Every attempt and timing decision is based on `workflows.followUpAutomation`.
- Old Follow-up URLs and links lead to Workflow.
- No legacy cron or legacy Workpool can schedule a send.
- `followUpRules` and `followUpSends` no longer exist in the final schema.
- Legacy customer scheduling fields no longer exist in the final schema.
- The `followUpWorkpool` component and legacy Convex modules are removed.
- Workflow timer, run, operation, message, history, and cost data remain intact.
- Deployment B is performed only after environment-specific cleanup verification reaches zero.

## Out of Scope

- Translating legacy rules into Workflow configuration.
- Preserving legacy send history.
- Redesigning the Workflow Follow-up editor.
- Changing Workflow Reminder behavior.
- Changing the semantics of existing Workflow Follow-up scope, audience, templates, or timer reconciliation.
