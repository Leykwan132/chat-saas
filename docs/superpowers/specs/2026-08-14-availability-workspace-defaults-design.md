# Availability workspace defaults

## Goal

Make the Availability entry point match the active workspace and role, show the exact membership role, and ensure new schedules accept leads by default.

## Behavior

- In a personal workspace, the Availability navigation entry opens the current user's availability detail page directly.
- In an organizational workspace, owners retain the team availability roster. Admins and members open their own availability detail page directly.
- Detail pages that are reached directly without roster access return to the agent dashboard rather than routing back to the same detail page.
- Availability role badges display `Owner`, `Admin`, or `Member` from the person's team membership. Personal-workspace users display `Owner`.
- Creating a new agent provisions a default 9 AM–5 PM schedule for every current workspace member with accepting leads enabled.
- When a person joins an organizational workspace, their default schedule for every existing agent is also accepting leads enabled.
- Existing schedules are not changed.

## Scope

The change applies to Availability navigation, roster and detail role labels, and schedule provisioning. It does not change direct-link authorization or individual schedule editing permissions.

## Implementation

`SchedulePage` will combine the active-team type with the current membership role from `usePermissions` to determine whether to render the roster or redirect to the current user's detail route. `ScheduleUserDetailPage` will use the same context for its back destination and render the returned membership role instead of the derived administrator boolean.

`UserScheduleCard` will receive the membership role it already has in the roster data and render its corresponding label. `getForAgentUser` will return the same role for detail pages.

The schedule provisioning helpers will pass `enabled: true` when initializing schedules for a new workspace member or a newly created agent. Personal agent creation will initialize the creator's schedule through the same schedule helper.

## Verification

Add focused frontend coverage for the routing decision and role label. Add Convex tests proving agent creation and new-team-member provisioning create enabled schedules. Run these tests under Node 22, then TypeScript and whitespace-diff checks.
