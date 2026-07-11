# Contact Footer Navigation Design

## Goal

Reduce the visual weight of the contact-page heading and ensure the footer's Book a demo and Support links place the user at the top of the contact page, including navigation that only changes the query string on the already-mounted `/contact` route.

## Design

- Change the `Let's start a conversation` heading from `font-semibold` to `font-medium` without changing its size, spacing, copy, or responsive behavior.
- Give the footer's Book a demo and Support links a shared click handler that calls `window.scrollTo({ top: 0, left: 0, behavior: 'auto' })`.
- Keep the behavior scoped to these two footer links. Other footer and site navigation retain their current scroll behavior.
- Preserve the existing `/contact?intent=demo` and `/contact?intent=support` destinations.

## Testing

- Add a source-level footer regression test that verifies both intent links use the shared top-scroll handler and that the handler requests an immediate scroll to the document origin.
- Add a contact-page regression test that verifies the heading uses `font-medium` and no longer uses `font-semibold`.

## Constraints

- No new dependencies.
- No Convex changes.
- Keep code files below 300 lines.
- Keep contact-page configuration and styling constants in `contactPageConfig.ts` so `ContactPage.tsx` remains below the repository limit.
