# Availability card metadata layout

## Goal

Improve the scan order of availability cards by placing role and lead metadata above the teammate name and marking available hours with a clock.

## Behavior

Each card displays its Admin or Member badge, optional Away badge, and lead-count badge in a compact top row. The teammate name and status badge appear directly below it, followed by the email. Each weekly availability line is preceded by a muted `Clock` icon. Cards with no saved shifts retain the `No available hours` copy and use the same clock treatment. The card link, status handling, and Accepting leads control remain unchanged.

## Implementation

`UserScheduleCard` will import `Clock` from Lucide and reorder its existing badge and identity markup without changing its props or availability formatter. The existing card page test will gain structural markup assertions for the icon and metadata order.

## Verification

Run the focused roster-card test red before the component change, green afterward, then run TypeScript and whitespace-diff checks.
