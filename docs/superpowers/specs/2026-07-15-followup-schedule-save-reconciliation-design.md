# Follow-up Schedule Save and Reconciliation Design

## Goal

Saving Follow-up schedule changes must persist one internally consistent configuration and apply the new revision to eligible pending Follow-up work.

## Behavior

- Selecting a maximum attempt option updates both `followUp.selections.maxAttempts` and `followUp.maxAttempts` in one state transition.
- Selecting an interval option updates both `followUp.selections.interval` and `followUp.intervalHours` in one state transition.
- Unknown schedule option IDs fail immediately instead of retaining stale canonical values.
- Start-after continues to update its selection and canonical minutes atomically.
- When an enabled Follow-up configuration changes revision, saving schedules Follow-up reconciliation regardless of activation scope.
- Reconciliation reuses the existing bounded conversation scan and `handleWorkflowFollowUpOutbound`, which cancels superseded work and creates a timer/run at the new revision and due time.
- Enabling a future-only Follow-up remains future-only: the initial off-to-on save does not reconcile existing conversations.
- Disabling Follow-up continues to cancel pending work.

## Structure

Shared pure helpers in `shared/workflowAutomations.ts` translate the stable schedule option IDs into canonical numeric configuration. The React state provider delegates schedule changes to those helpers. Convex save-effect calculation detects a revision change on an already-enabled Follow-up and schedules the existing reconciliation operation.

## Verification

- Pure unit tests cover interval and attempt option application and invalid IDs.
- Save-effect tests cover enabled configuration changes, initial future-only activation, unchanged saves, and disabling.
- Existing Follow-up timer/runtime tests and the full test suite guard reconciliation and scheduling behavior.

