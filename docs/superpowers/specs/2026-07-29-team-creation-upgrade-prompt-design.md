# Shared Upgrade Teaser for Team and Agent Creation

## Goal

Show the shared UpgradeModal teaser before Adjust Plan when a user cannot create another team or AI agent on their current plan.

## Interaction

- Resolve `api.teams.canCreateOrgTeam` before entering team creation.
- When creation is allowed, preserve the existing Create Team form or route.
- When `requiresPlanUpgrade` is true, open UpgradeModal immediately.
- Do not open the Create Team dialog, navigate to `/create-team`, or open Adjust Plan directly.
- The UpgradeModal action closes the teaser and then opens Adjust Plan.
- Closing UpgradeModal without continuing leaves the user on their current screen.
- Preserve the existing message for non-billing restrictions.
- Keep the server-side creation gate as final authorization.

## Scope

- Continue using `handleCreateTeamGate` for the team switcher, account submenu, and Teams settings.
- Apply the same click-time gate to `CreateTeamDialog`, including its default trigger.
- Preserve the existing submit-time gate to handle entitlement changes after the dialog opens.
- Keep direct `/create-team` protection, but show UpgradeModal before returning to the originating page.
- Restore one root UpgradeModal provider inside the existing Adjust Plan provider.
- Keep upgrade-modal context in its own module so UI hot reload cannot split the provider and consumers.
- Auto-select the upgrade scenario from the current plan.
- Use the same UpgradeModal for the extra-agent limit.
- Reuse the existing UpgradeCard presentation and do not create a team-specific modal.

## Verification

- Add pure regression coverage for allowed, upgrade-required, blocked, and unresolved gate results.
- Add provider flow coverage proving the teaser opens first and its action opens Adjust Plan.
- Add source contracts proving every Create Team entry point and the extra-agent limit use UpgradeModal.
- Run focused team-creation tests and the production build.
