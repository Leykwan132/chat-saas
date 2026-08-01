# Dashboard Header Dividers and Services Tabs Design

## Goal

Remove the horizontal divider beneath dashboard page titles and descriptions, and reorganize Services into two line-style tabs so users switch between services and booked appointments instead of viewing both sections at once.

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

## Verification

- Add a rendered Services page regression proving the line tab list, both triggers, default selected state, and both tab panels are composed correctly without the previous section headings/separators.
- Add a source contract covering every in-scope dashboard content header and skeleton so `border-b border-border` and its paired `pb-6` do not return.
- Verify excluded fixed navigation headers retain their borders.
- Run focused page tests, the Node v22 production build, line-count checks, and the repository-wide suite for baseline comparison.
