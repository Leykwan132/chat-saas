# Footer Support Contacts Design

## Goal

Make Kilobot's support email and phone number immediately discoverable beneath the footer copyright.

## Design

The existing left-side footer brand block will gain a compact support group directly below the copyright line. The group will contain a small `Support` label followed by two vertically stacked text links:

- `support@kilobot.app`
- `+60129499394 (Kwan)`

The links will use the footer's existing muted text palette, transition to the stronger footer foreground color on hover, and retain visible browser keyboard focus. Stacking keeps both actions easy to scan and prevents awkward wrapping on narrow screens.

## Interactions

The email link will use `mailto:support@kilobot.app` so it opens the visitor's configured email application.

The phone link will use `tel:+60129499394` so it opens the regular phone dialer on supported devices. The visible label will preserve the user-provided number and contact name.

## Scope

The change is limited to the shared `SiteFooter` component and its focused test. It introduces no backend data, form handling, analytics, icons, or new dependencies.

## Verification

The focused footer test will assert the visible email and phone labels and their exact `mailto:` and `tel:` targets. The implementation will also be checked for formatting and the project's 300-line code-file limit.
