# Workflow booking availability row alignment

## Goal

Make every appointment-workflow availability row use an explicit two-column layout that matches the Services card’s visual structure.

## Layout

- The left details block contains the teammate name, weekly hours, and timezone, aligned to the top of the row.
- The right controls block contains `Accepting leads` and its switch, centered vertically against the complete details block.
- The whole row remains a single link target, while the switch retains its independent interactive behavior and accessibility label.

## Scope

Only the availability-row markup and its focused rendered regression change. Data loading, permissions, route behavior, and toggle persistence remain unchanged.

## Verification

Add or update a focused rendered test that asserts the distinct details and centered controls blocks, then run that test and the production build under Node 22.
