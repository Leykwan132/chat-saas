# Workspace switching transition

## Goal

Show an intentional workspace-switching state instead of a false workspace-unavailable recovery dialog while moving between workspaces.

## Behavior

- Starting a workspace switch from a dashboard page immediately marks the dashboard as switching.
- While switching, the dashboard displays a full-screen `Switching workspace...` loader and never displays the unavailable-workspace dialog for the old agent route.
- A successful switch keeps the existing navigation to `/workspace`.
- A failed switch clears the switching state and leaves the current dashboard route available with the existing switch error toast.
- The unavailable-workspace dialog remains unchanged for an agent or workspace that is genuinely unavailable outside an active switch.

## Implementation

`TeamSwitcher` will notify dashboard callers when a switch begins and when it fails. `DashboardContent` will retain that transient state and render a dedicated switching screen before evaluating its stale-agent unavailable branch. The existing `onTeamSwitch` success callback continues to navigate to the workspace page after the WorkOS and Convex switch sequence completes.

## Verification

Extend the existing workspace-unavailable regression test to verify that dashboard switching state takes priority over the recovery dialog and that the switcher exposes begin and failure callbacks. Run the focused test, TypeScript, and whitespace-diff checks.
