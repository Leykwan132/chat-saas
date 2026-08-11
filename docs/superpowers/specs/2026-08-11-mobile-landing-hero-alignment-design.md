# Mobile Landing Hero Alignment Design

## Goal

Make the landing hero easier to scan on narrow screens with a centered, compact type hierarchy and vertically stacked actions.

## Responsive behavior

Below the existing `sm` breakpoint, the announcement pill, headline, and description remain centered. The headline is 28px. The description is 14px with a 20px line height. The call-to-action buttons stack vertically at full width.

At `sm` and above, the centered alignment and larger type scale remain unchanged, and the call-to-action buttons return to their side-by-side layout.

## Implementation boundary

The change stays inside `LandingHero`. It uses the project's existing responsive utility classes and does not alter copy, routing, images, metadata, or desktop layout.

## Verification

A focused source contract will assert the mobile-left and desktop-centered responsive classes plus the mobile and desktop description sizes. The test must fail against the current centered implementation before the production classes change. The focused landing test, production build, and whitespace check will run under Node 22.
