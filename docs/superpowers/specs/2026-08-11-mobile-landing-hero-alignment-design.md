# Mobile Landing Hero Alignment Design

## Goal

Make the landing hero easier to scan on narrow screens by aligning its content to the left and reducing the supporting description's visual weight.

## Responsive behavior

Below the existing `sm` breakpoint, the announcement pill, headline, description, and call-to-action row align to the left as one visual group. The headline remains 32px. The description changes from 18px relaxed text to 16px with a tighter line height. The call-to-action buttons keep their existing equal-width mobile row.

At `sm` and above, the current centered alignment, description size, spacing, and button behavior remain unchanged.

## Implementation boundary

The change stays inside `LandingHero`. It uses the project's existing responsive utility classes and does not alter copy, routing, images, metadata, or desktop layout.

## Verification

A focused source contract will assert the mobile-left and desktop-centered responsive classes plus the mobile and desktop description sizes. The test must fail against the current centered implementation before the production classes change. The focused landing test, production build, and whitespace check will run under Node 22.
