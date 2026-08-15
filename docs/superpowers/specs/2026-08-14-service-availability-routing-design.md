# Service Availability and Lead Routing Design

## Goal

Remove the manual Accepting leads status. Weekly working hours, active time off, and service-specific teammate assignments become the only availability rules for lead routing and appointment bookings.

## Scope

This change includes lead eligibility, service teammate selection, booking-slot selection, Availability UI cleanup, and a data migration. The separate owner-controlled permission for admins to view the full team Availability roster is not part of this design.

## Availability Rules

- A teammate is eligible for a lead when their weekly hours include the current time and they are not on active time off.
- The legacy schedule fields `enabled`, `mode`, and `manualStatus` no longer affect eligibility.
- A teammate is eligible for a booking slot when they are assigned to the selected service, their weekly hours cover the entire appointment plus buffer, they are not on overlapping time off, and they have no overlapping assigned calendar event.
- Lead routing continues to consider every teammate's schedule; service assignment constrains bookings only.

## Service Assignment

Each appointment service receives an `assignedWorkosUserIds` list. The service editor presents the team as a selectable teammate list in addition to its assignment strategy:

- Balanced, round-robin, and conversation-owner strategies choose only within the selected teammates who are available for the slot.
- Specific teammate must also be selected for the service; otherwise the service has no valid booking assignee until corrected in the editor.
- New services begin with every current team member selected.
- When someone joins a team, they are added to every existing service's selected teammate list. Owners can remove them from an individual service afterward.

## User Experience

- Remove Accepting leads switches, Active/Inactive status badges, roster filtering and sorting based on that status, and related workflow readiness copy.
- Availability continues to display and edit weekly hours and time off.
- Booking service configuration describes the selection as the teammates who can perform that service.
- Existing team roster cards continue to show weekly-hours summaries and time off; they do not show lead-status controls.

## Migration

Use an online widen-migrate-narrow rollout with `@convex-dev/migrations`:

1. Add `assignedWorkosUserIds` as an optional service field, read missing lists as all team members during the rollout, and write a concrete list for every new or edited service.
2. Deploy a migration that sets every service's list to the current members of its agent's team and sets every existing schedule to `enabled: true` with `mode: "scheduled"` and `manualStatus: "available"`.
3. Run and monitor the migration, including a dry run, then verify no service is missing its teammate list.
4. Make the service list required in a follow-up deployment and remove legacy availability status handling from runtime code.

The immediate behavior change ignores the old status fields, so every existing teammate follows weekly-hours and time-off rules even while the migration runs.

## Error Handling

- A service with no selected teammate has no bookable slots; its editor must clearly require at least one teammate before save.
- A specific-teammate service rejects saves when that teammate is not selected.
- An unavailable selected teammate is skipped for the requested booking slot; the system selects another eligible teammate according to the service strategy.

## Verification

- Unit-test lead eligibility at on-shift, off-shift, and active-time-off boundaries, including schedules that were previously disabled or manual.
- Unit-test booking availability with selected and unselected teammates, time off, and calendar conflicts.
- Test service form validation for empty selections and mismatched specific teammate selection.
- Test migration definitions for bounded, idempotent backfill behavior.
- Test Availability pages and cards no longer render the Accepting leads UI.
