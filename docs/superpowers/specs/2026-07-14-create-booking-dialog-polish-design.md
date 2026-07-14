# Create Booking Dialog Polish Design

## Goal

Make the Create booking dialog feel lighter and prevent its time Combobox popup from changing the dialog dimensions, while clarifying secondary actions.

## Backdrop

- Apply the backdrop override only to Create booking through the existing `DialogContent.overlayClassName` property.
- Use a 10% black overlay with no backdrop blur.
- Leave the shared Dialog overlay and all other dialogs unchanged.

## Time Combobox Portal

- Keep the time popup inside the Radix dialog boundary so modal scroll locking continues to allow scrolling through all 15-minute options.
- Do not use `DialogContent` itself as the Base UI portal container. Base UI creates a plain portal element inside the supplied container, and a direct child of the grid-based dialog content creates an extra grid row.
- Add a dedicated absolute-positioned portal host inside Create booking. The host must not participate in grid layout or intercept dialog interactions.
- Allow pointer interaction on the Combobox positioner and popup while the host remains pointer-transparent.
- Continue sharing the same host between Start and End time Comboboxes.

## Actions

- Keep `Create new service` as a small link-style Button with its existing Plus icon and route.
- Add a reusable semantic blue-link Button variant rather than changing the global primary color or adding local light/dark blue utility classes.
- Render Cancel as the existing neutral ghost Button variant so it has no persistent border or background while retaining a clear hover and focus state.
- Keep Create booking as the primary filled action.

## Behavior and Scope

- Do not change booking values, duration defaults, availability checks, submission behavior, or routing.
- Do not change the default Dialog backdrop.
- Do not make the Create booking dialog non-modal and do not render the time list inline.

## Verification

- A regression test confirms the portal target is a dedicated non-layout host rather than `DialogContent`.
- Focused tests confirm the scoped light backdrop, blue service link variant, and ghost Cancel action.
- Existing time input, availability, and booking dialog tests remain green.
- Targeted ESLint, a Vite production build, `git diff --check`, and touched-code line-count checks pass under Node v22.
