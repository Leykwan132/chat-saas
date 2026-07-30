# Docs Image Lightbox and Captions

## Goal

Make every documentation content image easier to inspect without requiring page authors to add custom markup.

## Scope

The behavior applies to images rendered through Docusaurus MDX. It covers current screenshots and future Markdown or MDX content images.

It does not apply to navbar branding, interface icons, decorative theme assets, videos, or images rendered outside MDX content.

## Presentation

Each image renders inside a borderless image group.

- The image preserves its natural aspect ratio and existing responsive width.
- The image uses a pointer cursor and a subtle hover treatment that communicates interactivity without adding a border.
- A small muted caption appears eight pixels below the image.
- The caption uses the image's existing alt text, so page authors maintain one descriptive string.
- The visible duplicate caption is hidden from assistive technology because the image alt text already communicates the same description.
- The group uses phrasing-content markup because Docusaurus nests Markdown images inside paragraphs; this avoids invalid paragraph and hydration structure.

## Expansion behavior

Selecting an image opens a native modal dialog containing the full-resolution image.

- The dialog uses a viewport-filling translucent backdrop.
- The expanded image is centered and constrained to the available viewport while retaining its aspect ratio.
- A visible close button remains available in the upper-right corner.
- Users can close the dialog with the close button, the Escape key, or by selecting the backdrop.
- Selecting the expanded image does not close the dialog.
- Opening the dialog moves focus into the modal, and closing it returns focus to the triggering image control through native dialog behavior.

## Architecture

Swizzle Docusaurus's global `MDXComponents/Img` renderer.

The custom renderer:

1. Preserves Docusaurus image defaults such as lazy loading and asynchronous decoding.
2. Wraps the inline image in an accessible grouped control that remains valid inside MDX paragraphs.
3. Opens one native dialog owned by that image instance.
4. Reuses the original image source and alt text for the expanded view.

The component and its CSS module remain isolated under `kilobot-docs/src/theme/MDXComponents/Img/`. No third-party lightbox dependency is added.

## Accessibility

- The trigger is keyboard reachable and uses an explicit label derived from the image alt text.
- The original and expanded images retain meaningful alt text.
- The repeated visible caption is `aria-hidden`.
- The close action has an explicit accessible label.
- Native dialog semantics provide focus containment and Escape dismissal.
- Motion is limited to a short opacity transition and respects reduced-motion preferences.

## Failure behavior

If an image fails to load, the browser preserves its normal broken-image and alt-text behavior. The lightbox does not introduce a fallback asset or suppress load failures.

If native modal opening is unavailable, the image remains visible and readable; no alternate navigation or dependency is introduced.

## Verification

Automated coverage will verify:

- Docusaurus uses the custom global MDX image renderer.
- The trigger, caption, dialog, close action, and original image attributes render.
- Backdrop selection closes the dialog only when the backdrop itself is selected.
- The Quick Start continues to reference all four supplied screenshots.
- TypeScript, the complete Docs tests, and the production Docusaurus build pass.

Responsive browser verification will cover one Quick Start screenshot on desktop and mobile, including caption placement, expansion bounds, backdrop dismissal, close-button dismissal, and Escape dismissal.
