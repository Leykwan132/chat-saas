# Create Service Name Validation Design

## Goal

Let people learn why service creation cannot continue when they have not supplied a name.

## Interaction

The Create action remains available while Name is empty. Clicking it keeps the dialog open, shows the existing `Service name is required.` error treatment, and moves focus to the Name input. Typing a non-empty name clears that validation error. No mutation runs until a trimmed name exists.

## Boundaries

This changes only client-side validation in the Create Service dialog. Team assignment validation, service fields, navigation, and server validation remain unchanged.

## Verification

Add a focused dialog test for the enabled action, required-error feedback, and Name focus behaviour.
