# Shared Upgrade Teaser for Gated Features

## Goal

Use one predictable upgrade journey throughout the signed-in product:

- Explicit Upgrade and Adjust Plan actions open Adjust Plan immediately.
- A user who encounters a gated feature or plan limit sees UpgradeModal first.
- UpgradeModal's action opens Adjust Plan.

## Routing Rules

### Direct to Adjust Plan

- Buttons explicitly labeled Upgrade.
- Buttons explicitly labeled Adjust Plan.
- UpgradeModal's upgrade action.
- Existing plan-selection actions whose purpose is already changing a subscription.

These actions do not show UpgradeModal because the user's intent is already to review or change their plan.

### UpgradeModal, then Adjust Plan

- Creating a team beyond the current plan allowance.
- Creating an AI agent beyond the current plan allowance.
- Inviting members beyond the current plan allowance.
- Connecting a channel beyond the current plan allowance.
- Selecting a locked AI model.
- Selecting or activating any other feature that is unavailable on the current plan.

UpgradeModal explains the gated capability. Its upgrade action closes UpgradeModal and opens Adjust Plan. Closing UpgradeModal without continuing leaves the user on the current screen.

### Simple Adjust Plan

Adjust Plan remains the only plan-selection modal in this journey. Its header contains only “Choose your plan”; it does not show a secondary Manage plan action. UpgradeModal does not open Stripe directly.

## Scope

- Restore one root UpgradeModal provider inside the existing Adjust Plan provider.
- Keep upgrade-modal context in its own module so UI hot reload cannot split the provider and consumers.
- Auto-select the upgrade scenario from the current plan.
- Reuse the existing UpgradeCard presentation and do not create feature-specific upgrade dialogs.
- Expose one `openUpgradeModal` entry point for interactive plan gates.
- Preserve direct `openAdjustPlan` usage for explicit Upgrade and Adjust Plan actions.
- Route team, agent, member, channel, locked-model, and other interactive paid-feature gates through `openUpgradeModal`.
- Keep inline full-page plan gates as inline upgrade explanations; their explicit Upgrade action opens Adjust Plan directly instead of showing the same explanation twice.
- Preserve existing non-billing restriction messages.
- Keep backend entitlement checks as final authorization.

## Team Creation

- Resolve `api.teams.canCreateOrgTeam` before entering team creation.
- When creation is allowed, preserve the existing Create Team form or route.
- When `requiresPlanUpgrade` is true, open UpgradeModal without opening the form, navigating to `/create-team`, or opening Adjust Plan directly.
- Continue using the shared gate for the team switcher, account submenu, Teams settings, and `CreateTeamDialog`.
- Preserve the submit-time gate for entitlement changes after the dialog opens.
- Keep direct `/create-team` protection while presenting UpgradeModal before returning to the originating page.

## Locked Models

- Keep locked models visible with their lock treatment.
- A locked model remains unavailable for selection.
- Clicking a locked model opens UpgradeModal instead of silently ignoring the click.
- Accessible models preserve their current selection behavior.

## Verification

- Add provider flow coverage proving gated features open UpgradeModal first and its action opens Adjust Plan.
- Add routing coverage proving explicit Upgrade and Adjust Plan actions bypass UpgradeModal.
- Add locked-model interaction coverage.
- Retain pure team-gate coverage for allowed, upgrade-required, blocked, and unresolved results.
- Add source or behavior coverage for each known agent, team, member, and channel limit entry point.
- Run focused upgrade-routing tests and the production build.
