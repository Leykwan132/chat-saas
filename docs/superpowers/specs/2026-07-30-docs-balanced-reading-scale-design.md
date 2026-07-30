# Docs Balanced Reading Scale Design

## Goal

Make KiloBot guide content easier to read without making the navigation or interface chrome feel oversized, and reduce the visual dominance of the Quick Start testing screenshot.

## Typography

Apply the balanced scale to the main Markdown article:

- Body copy: 17px with the existing comfortable line height.
- H2 section subtitles: 22px.
- H3 subsection subtitles: 18px.

The opening paragraph follows the 17px body scale. H1 page titles, H4 labels, image captions, navigation, the page outline, pagination, cards, and other interface chrome retain their existing sizes.

## Testing Screenshot

Only the screenshot below `Test your agent` in Quick Start receives the compact treatment:

- Center it at 70% of the article width on desktop.
- Return it to 100% width on mobile.
- Keep its caption aligned to the same width.
- Preserve the existing click-to-expand behavior and full-size lightbox.

The other Quick Start screenshots and all other guide images retain their current article width.

## Implementation Boundary

Use the existing global MDX image renderer with an explicit content-level sizing hook for this one image. Keep the global renderer generic so future images do not inherit the testing screenshot's compact size accidentally.

## Verification

Add source and rendered-component contracts for the compact image hook and responsive width. Update the Docs typography contract to require the balanced scale. Then run the full Docs tests, component tests, TypeScript, production build, and whitespace checks on Node.js 22.

No deployment or public changelog entry is included.
