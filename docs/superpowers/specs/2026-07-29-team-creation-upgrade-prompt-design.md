# Team Creation Upgrade Prompt

## Goal

Open the existing Adjust Plan modal immediately when a user clicks Create Team and their plan does not allow organizational team creation.

## Interaction

- Resolve `api.teams.canCreateOrgTeam` before entering team creation.
- When creation is allowed, preserve the existing Create Team form or route.
- When `requiresPlanUpgrade` is true, open Adjust Plan immediately.
- Do not open the Create Team dialog or navigate to `/create-team` before showing Adjust Plan.
- Preserve the existing message for non-billing restrictions.
- Keep the server-side creation gate as final authorization.

## Scope

- Continue using `handleCreateTeamGate` for the team switcher, account submenu, and Teams settings.
- Apply the same click-time gate to `CreateTeamDialog`, including its default trigger.
- Preserve the existing submit-time gate to handle entitlement changes after the dialog opens.
- Keep direct `/create-team` protection, which already opens Adjust Plan and returns to the originating page.
- Do not create a second team-specific upgrade modal.

## Verification

- Add pure regression coverage for allowed, upgrade-required, blocked, and unresolved gate results.
- Add a source contract proving `CreateTeamDialog` checks the gate before opening.
- Run focused team-creation tests and the production build.
