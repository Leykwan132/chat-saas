# Create Service Dialog Design

## Goal

Replace the full-screen, four-step service wizard with a compact modal that lets a user create a personal service in one final action or set up a team service in two steps.

## Entry and completion

The Services page opens the dialog from both Add a service entry points. The existing `/services/new` route redirects to the Services page so the modal is the sole creation experience.

The footer has a text-only Close button that immediately discards the in-progress form and closes the dialog. After a successful create, the dialog closes and the app opens that service's detail page.

## Step 1: Service info and assignment mode

The first dialog step collects the service's Name, Description, Location, and Duration. Description appears directly below Name. Duration is a numeric input with a right-aligned `Minutes` suffix inside the field.

Below the service information are two selectable cards:

- For myself is selected by default. It assigns only the signed-in user and makes the footer action Create.
- For team lets the user include teammates and makes the footer action Continue.

Each card has a leading icon inside a small foreground card with two offset, bordered cards visibly stacked behind it. The card treatment is decorative; selecting either card remains a single accessible radio-style interaction.

The Team-card entitlement is determined from the active workspace's current plan, using the same workspace plan source as the shared upgrade modal. For a workspace on the Free plan, For team is visibly locked but retains its normal card label. Hovering or keyboard-focusing the card adds a slightly darker background overlay and reveals a centered Upgrade control. Activating the card or its Upgrade control opens the existing shared upgrade modal for that workspace plan and does not change the selected For myself card or advance the dialog. Workspaces on an eligible paid plan can select For team normally.

Choosing For myself and pressing Create creates the service immediately. Choosing For team and pressing Continue moves to the team-selection step.

Google Meet and In person retain the approved Location dropdown behavior. Google Meet continues to require the eligible current user to connect Google Calendar and uses the hosted Google Meet product image.

## Step 2: Team assignment

Step 2 appears only for For team. It lets the user select one or more teammates. It has a Back action, a text-only Close action, and a Create action. Creation is blocked until at least one teammate is selected.

## Defaults and service detail page

Creation always saves the existing default booking form with Booking Date, Booking Time, Customer Name, and Phone Number. The dialog does not expose booking-form configuration. New services remain enabled by default.

On the service detail page, Description appears directly below Name. Duration remains in the main details area. Gap and Preferred time are grouped under a collapsed Advanced accordion.

## Data and error behavior

The form uses the existing service mutation payload and persistence model. For myself stores the signed-in user's WorkOS ID as the sole assignment. For team stores the selected teammate IDs and retains the existing assignment validation. Name is required before proceeding or creating. Mutations report errors in the active dialog step and preserve the draft for correction.

## Scope

This replaces the creation wizard UI and changes no calendar-sync, service-location persistence, booking routing, or existing service-edit behavior beyond the requested field ordering and Advanced timing grouping. It does not add assignment strategies, booking-form configuration during creation, or additional location providers.

## Verification

Focused tests cover opening and closing the dialog, Free-plan Team upgrade behavior, personal and team branching, current-user-only default assignment, default booking fields, navigation to the created service, location guard behavior, minutes suffix, and Advanced timing accordion. TypeScript and diff checks run under Node v22.
