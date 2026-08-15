# Personal Availability Header Design

## Goal

Give personal-workspace users a focused Availability page by removing identity and status details that do not help them set their own hours.

## Personal Workspace Layout

- The page begins with `Availability` and the description `Set when you’re available to receive leads and bookings.`
- The inline weekly-hours editor follows the title block.
- The personal profile header is omitted: role, availability status, name, email, and its top-level Request time off button do not render.
- The Time off section places `Request time off` beside its heading, above both empty and populated time-off content.

## Other Workspace Views

- Organizational member direct views retain the identity and status header.
- Organizational owner roster and teammate detail/edit views retain their current presentation.
- The Time off action moves beside the Time off heading in every view that renders the section.

## Testing

- Extend the rendered personal Availability route test to assert the description, absence of the profile header, and Time off action placement.
- Preserve the organizational owner edit-route coverage and run focused Availability tests, TypeScript, and whitespace diff checks under Node v22.
