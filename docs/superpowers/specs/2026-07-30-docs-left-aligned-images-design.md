# Left-Aligned Documentation Images Design

## Goal

Make every documentation content image and its caption align with the left edge of the article while preserving responsive sizing, image expansion, and the existing visual hierarchy.

## Scope

This applies to images authored in documentation Markdown or MDX and rendered through the shared `MDXComponents/Img` component.

It does not apply to decorative interface assets such as the navbar logo, the KiloBot mark inside the Welcome banner, icons, or images inside the expanded lightbox.

## Approved Design

The shared image renderer remains the single source of truth for content-image presentation.

- Every content image starts at the article's left edge.
- Every visible caption starts at the same left edge as its image.
- Full-width images retain their current width.
- Quick Start's Source training and Test your agent screenshots remain 40% wide on desktop, but their compact wrappers anchor to the left instead of centering.
- Compact screenshots remain 100% wide below 768px.
- Images preserve their complete aspect ratios without cropping.
- Captions continue to use each image's descriptive alternative text.
- Click-to-expand behavior, dialog controls, and borderless styling remain unchanged.

## Caption Contract

Every documentation Markdown image must have non-empty descriptive text. The shared renderer displays that text as the caption and uses it for the image's accessible alternative text and expansion-control label.

An automated content test scans every public Markdown and MDX document and fails when an image has an empty caption source. This prevents future captionless content images.

## Approaches Considered

### Shared global treatment

Update the shared content-image styles and the compact wrapper once, then add repository-wide caption coverage. This is the approved approach because it keeps all current and future content images consistent.

### Page-specific alignment

Add wrappers and caption rules to each document. This was rejected because it duplicates presentation logic and makes future images easy to miss.

### Semantic figure refactor

Replace the current inline-safe renderer with `figure` and `figcaption`. This was rejected for this revision because Markdown images can be emitted inside paragraphs, where block-level figure markup can create invalid nesting without a broader MDX transformation.

## Verification

- A renderer style contract proves the caption is left-aligned.
- A Docs style contract proves compact wrappers use left anchoring at 40% desktop width and 100% mobile width.
- A recursive document test proves every Markdown image has non-empty descriptive text.
- Existing component tests continue to prove caption rendering and image expansion.
- The complete Docs test suite, TypeScript check, production build, built-output inspection, and whitespace check must pass.

## Release Status

This is an unreleased documentation presentation change. It must not be added to the public changelog until production availability is confirmed.
