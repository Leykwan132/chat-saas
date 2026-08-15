# Unblurred Modal Backdrops Design

## Goal

All application dialogs and sheets use the same light, unblurred backdrop as Create Booking.

## Scope

- Change the shared `DialogOverlay` and `SheetOverlay` defaults to `bg-black/10` with no backdrop blur.
- Remove per-dialog backdrop overrides so application modals inherit the shared treatment.
- Preserve existing fade animations, layering, focus handling, and interaction behavior.

## Exclusions

- Do not change visual effects inside modal content, page headers, popovers, loading states, marketing previews, or non-modal overlays.

## Verification

- Add or adjust focused regression coverage for the shared dialog and sheet backdrop classes.
- Verify the focused modal suites and production build under Node 22.
