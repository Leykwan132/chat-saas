# Unified Booking Time Input Design

## Goal

Use the availability editor's editable time combobox for every booking creation and editing surface.

## Scope

`EditableTimeCombobox` remains the sole time-input component for Create Booking, which already uses it through `ManualBookingScheduleField`.

Replace `TimeSelectInput` in these legacy edit surfaces:

- Calendar event details after the user opens an event and selects Edit.
- Edit Booking dialog, used by Inbox booking actions and the calendar `editEvent` deep link.

## Behavior

Every surface exposes the same preset time list, accepts a valid typed custom time, and normalizes typed input on blur or Enter. The existing event date, all-day, time-zone, start-before-end, availability, and save validation behavior remains unchanged.

## Implementation

Both edit forms render `EditableTimeCombobox` directly for start and end time. They pass the form's existing string values and update callbacks, their disabled state where applicable, accessible labels, and their dialog content element as the portal container so the menu layers correctly above the modal.

No schema, mutation, or time serialization change is required.

## Verification

Add a focused source-level regression that requires both edit forms to import and render `EditableTimeCombobox` and rejects `TimeSelectInput`. Run that test with the existing combobox and booking-dialog tests, then run the TypeScript build and whitespace check under Node 22.
