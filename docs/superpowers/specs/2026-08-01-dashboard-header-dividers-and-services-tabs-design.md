# Dashboard Header Dividers, Services Tabs, and Booking Availability Design

## Goal

Remove the horizontal divider beneath dashboard page titles and descriptions, reorganize Services into two line-style tabs, and make teammate availability visible and actionable inside the Book appointment workflow modal.

## Dashboard Content Header Rule

- Remove `border-b border-border` from dashboard content headers that introduce a page or detail view.
- Remove the associated `pb-6` spacing when it exists only to separate content from that divider.
- Apply the same treatment to matching loading skeleton headers.
- Preserve each header’s title, description, badges, back action, primary action, responsive alignment, and surrounding page-level gap.

The rule applies to content headers in:

- Channels, Broadcast, Follow-ups, Quick Replies, Services, Settings, Lead Assignment, Message Templates, Agent Configuration, and Knowledge Base.
- Broadcast detail, Follow-up detail, Service detail, Template detail, Channel WhatsApp templates, and Create Template.
- Services, Service detail, Lead Assignment, and Template detail loading skeletons.

## Explicit Exclusions

- Keep fixed application, onboarding, creation-wizard, legal, blog, and workspace-shell navigation borders because they separate persistent navigation chrome from scrollable content.
- Keep borders and separators inside tables, cards, dialogs, forms, tab panels, and other content sections.
- Pages already lacking a content-header divider remain unchanged.

## Services Tabs

- Keep the Services title, description, and `Add a service` action in the existing responsive header.
- Remove the header divider and its `pb-6` spacing.
- Place a shadcn `Tabs` component directly beneath the header.
- Use `TabsList variant="line"` with two triggers in this order:
  - `Your Services`, value `services`, selected by default.
  - `Booked Appointments`, value `appointments`.
- Put the service cards and their existing empty state in `TabsContent value="services"`.
- Put the appointments table and its existing empty state in `TabsContent value="appointments"`.
- Remove the old `Your Services` and `Booked Appointments` section headings and their separators because the tab triggers replace them.
- Keep tab state local and uncontrolled through `defaultValue="services"`; do not add URL parameters or persistence.

## Existing Behavior Preserved

- Service creation, card navigation, active/inactive labels, switches, permission gating, and toggle mutations remain unchanged.
- Appointment data, status badges, formatting, and table behavior remain unchanged.
- The existing shared `src/components/ui/tabs.tsx` is reused without modification or reinstallation.

## Book Appointment Availability

- Keep the availability roster inside the workflow inspector modal opened for a `Book appointment` node. Do not add it to the Services page tabs.
- Place a compact `Availability` section directly beneath the existing Services selector in the Actions column.
- Render all teammates in a bounded, vertically scrollable list so the modal itself does not become excessively tall.
- Each teammate row shows:
  - The teammate’s display name.
  - A compact full-week summary that groups days with identical working periods, such as `Mon–Fri · 9:00 AM–5:00 PM`.
  - A clear `No hours set` state when the teammate has no working periods.
  - An `Accepting leads` label and switch reflecting the same schedule-enabled state used on the Availability page.
- Keep the schedule timezone visible in the compact summary so displayed working times are not ambiguous.
- Clicking the row outside the switch navigates to `/dashboard/:agentId/availability/:workosUserId` for that teammate’s full availability details.
- Clicking the switch must not trigger row navigation.

## Availability Interaction and Apply Rule

- An `Accepting leads` switch updates the teammate’s existing availability state immediately; it is not deferred until the workflow’s `Apply` action.
- Reuse the Availability page’s existing schedule initialization and update behavior so a teammate without a saved schedule can be enabled from the modal.
- Disable an individual switch while its immediate mutation is pending and report success or failure through the existing toast pattern.
- A teammate counts as eligible for the workflow configuration when `Accepting leads` is enabled. Current clock time, today’s shift, calendar conflicts, and time off do not affect whether the workflow may be applied, because it can book future slots.
- Enable the workflow modal’s `Apply` button only when at least one teammate has `Accepting leads` enabled, in addition to the modal’s existing validation and changed-state requirements.
- When no teammate is enabled, show `Turn on availability for at least one teammate to use appointment booking.` near the roster and keep `Apply` disabled.
- Availability switch changes remain saved even if the user later closes the workflow modal without applying workflow changes.

## Loading, Empty, and Error States

- Show compact row skeletons while teammate and schedule data load.
- If the organization has no teammates, show a compact empty state explaining that a teammate is required before appointment booking can be configured.
- If availability data cannot be loaded, do not treat the workflow as eligible to apply. Preserve the previously saved workflow configuration and show an inline unavailable state rather than assuming availability.
- Keep existing workflow fields and selected services intact while an availability switch update is pending or fails.

## Component Boundaries

- Keep `WorkflowInspectorForm` responsible for workflow draft state and the final Apply decision.
- Keep teammate querying, weekly schedule presentation, immediate switches, pending states, and detail links in a dedicated booking-availability section component.
- Put weekly shift grouping and formatting in a small pure utility so it can be tested independently and reused without growing the inspector or roster component beyond the project’s 300-line limit.

## Verification

- Add a rendered Services page regression proving the line tab list, both triggers, default selected state, and both tab panels are composed correctly without the previous section headings/separators.
- Add a source contract covering every in-scope dashboard content header and skeleton so `border-b border-border` and its paired `pb-6` do not return.
- Verify excluded fixed navigation headers retain their borders.
- Add focused Book appointment modal regressions for the scrollable roster, teammate names, grouped weekly hours, timezone, accepting-leads switches, detail links, and switch click isolation.
- Verify immediate availability enable/disable behavior, including schedule initialization, pending state, success, and failure.
- Verify `Apply` stays disabled with zero enabled teammates and becomes eligible when at least one teammate accepts leads, regardless of whether that teammate is currently on shift or away.
- Verify loading, no-hours, no-teammates, and availability-load failure states.
- Run focused page tests, the Node v22 production build, line-count checks, and the repository-wide suite for baseline comparison.
