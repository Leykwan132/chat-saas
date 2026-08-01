# Back to Services Hover Design

## Goal

Make the service detail page's “Back to Services” control feel like a text link on hover instead of a ghost button with a tinted background.

## Scope

- Change only the “Back to Services” control in `src/pages/ServicePage.tsx`.
- Keep its existing destination, spacing, arrow icon, muted resting color, focus behavior, and accessible link semantics.
- Keep the hover background transparent in light and dark themes.
- Darken the label and icon to the foreground color on hover.
- Do not change the filled “Back to Services” completion action in the create-service wizard.

## Verification

Render the service page with the smallest required providers and assert that the link retains a transparent hover background and foreground hover color.

