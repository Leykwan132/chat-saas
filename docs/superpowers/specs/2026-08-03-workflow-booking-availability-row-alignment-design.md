# Workflow booking inspector hierarchy

## Goal

Make the appointment-workflow Services and Availability requirements easier to scan, while keeping availability rows visually consistent with service rows.

## Layout

- The left details block contains the teammate name, weekly hours, and timezone, aligned to the top of the row.
- The right controls block contains `Accepting leads` and its switch, centered vertically against the complete details block.
- The whole row remains a single link target, while the switch retains its independent interactive behavior and accessibility label.

## Requirement hierarchy

- The Services heading keeps its icon, required marker, and explanatory text on the left.
- A lightweight `+ New Service` link sits on the right and is bottom-aligned with the explanatory text, linking to the existing new-service route.
- Availability begins 24px after the completed Services block, including its card and any validation message, so the two requirements read as separate sections.

## Scope

Only booking-inspector layout and focused rendered regressions change. Data loading, permissions, route behavior, service eligibility, and toggle persistence remain unchanged.

## Verification

Add or update focused rendered coverage for the distinct availability columns, New Service navigation, and requirement separation; then run the focused tests and production build under Node 22.
