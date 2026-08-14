# Admin Availability Description Design

## Goal

Make the direct Availability page understandable for organizational admins without changing its navigation or profile layout.

## Design

Show the same supporting sentence immediately below the `Availability` title in the direct organizational-admin view that the personal view already uses:

`Set when you’re available to receive leads and bookings.`

The existing identity header, inline weekly-hours editor, and no-back-link behavior remain unchanged.

## Verification

Update the page test to assert the description is rendered for the direct organizational view, while preserving the existing personal description assertion.
