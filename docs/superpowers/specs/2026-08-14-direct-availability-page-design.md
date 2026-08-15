# Direct Availability Page Design

## Goal

Give personal-workspace users and organizational members a complete Availability page without requiring a second click to edit their weekly hours.

## Scope

- Direct Availability routing remains unchanged: a personal workspace or organizational non-owner opens the current user’s availability URL.
- Direct views show an `Availability` page title and do not render a `Back to dashboard` link.
- Direct views render the weekly availability editor in the Availability section, with its existing Save behavior.
- The member identity, availability status, time-off workflow, and self lead-acceptance control remain on the page.
- Organizational owners retain the roster, teammate detail page, compact availability summary, edit link, and roster back navigation.

## Composition

`ScheduleUserDetailPage` determines whether the route is direct by using the existing roster visibility rule. In a direct view it renders the direct Availability heading and the existing weekly editor with the same shift drafting, timezone selection, saving, and schedule initialization behavior used by `ScheduleUserAvailabilityPage`.

The separate `ScheduleUserAvailabilityPage` remains for owner-driven teammate editing. Its current permissions and return path are unchanged. The availability summary remains a compact card only when viewing a teammate from the organizational-owner roster.

## Error and Loading States

- Direct-view loading matches the final page structure: title, identity/status, inline availability editor, and time off.
- A missing direct-view member shows the existing missing-member message without a dashboard back link.
- Existing save errors remain surfaced through the current toast flow.

## Testing

- Add a focused source-level regression test proving direct Availability displays the page title, omits the dashboard back navigation, and mounts the weekly editor instead of the clickable summary.
- Preserve the existing owner-roster test coverage and run the Availability page suite, TypeScript check, and whitespace diff check under Node v22.
