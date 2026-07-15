# Inbox Booking Status Accent Design

## Goal

Make every Inbox booking status treatment communicate the same status color at a glance.

## Design

The shared appointment booking status presentation owns the status colors. Booking tags use a neutral muted background with normal foreground text and a small leading dot that uses the status color. Inbox booking-history rows and the compact booking card above the prompt pass that same color to `BookingAccentBar`. Cancelled uses red, Scheduled uses yellow, Completed uses green, and No-show uses orange. Expanded booking detail panels retain their existing neutral presentation.

## Testing

Focused presentation tests verify all four mappings and confirm that the history row, tag indicator, and compact card use the same status color while the tag surface remains neutral. Existing booking status and Inbox booking tests remain regression coverage.
