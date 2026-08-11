# Landing WhatsApp Live Demo Design

## Goal

Remove the Traditional website widget from the Kilobot homepage and turn the landing hero's secondary action into a direct WhatsApp live-demo entry point.

## User experience

- The floating Traditional widget no longer loads from the root HTML document.
- The landing hero's secondary action reads `Try Live Demo`.
- A 16px WhatsApp-green icon appears before the label with an 8px gap.
- The icon is decorative so assistive technology announces only `Try Live Demo`.
- Activating it opens WhatsApp in a new tab for `601167389886`.
- The WhatsApp conversation starts with `Hey, I want to learn more about Kilobot.` prefilled.
- The lower landing-page conversion action, footer link, and contact form retain their existing `Book a demo` behavior.

## Implementation

Remove the standalone Kilobot widget script element from `index.html`. Keep the Meta SDK and Vite application entry scripts unchanged.

In `LandingHero`, replace the internal React Router demo link with an external anchor whose `href` is a `wa.me` URL containing the URL-encoded prefilled message. Preserve the current outline-button layout and responsive sizing. Add `target="_blank"` and `rel="noopener noreferrer"`.

Render the existing `react-icons` `SiWhatsapp` brand icon before the label. Use `size-4`, WhatsApp green `#25D366`, and `aria-hidden`; add `gap-2` to the anchor without changing its height, width, padding, or typography.

The URL stays local to the hero because there is only one live-demo WhatsApp action. A shared URL abstraction or internal redirect route would add an unnecessary layer.

## Error handling

No runtime request or application state is introduced. WhatsApp owns destination handling after navigation. The static URL is verified by automated tests.

## Testing

- Add a regression that reads `index.html` and proves the removed public key and root widget embed are absent.
- Update the rendered landing-hero regression to require the `Try Live Demo` label, exact encoded WhatsApp URL, new-tab target, and safe relationship attributes.
- Require one decorative WhatsApp icon before the label and the existing action layout plus `gap-2`.
- Keep assertions proving the existing mobile action dimensions remain unchanged.
- Run the focused landing tests, production build, and whitespace validation under Node 22.

## Release tracking

This is customer-facing but remains unreleased until production availability is confirmed. Record the completed local state in `CONTINUITY.md`; do not add a changelog entry yet.
