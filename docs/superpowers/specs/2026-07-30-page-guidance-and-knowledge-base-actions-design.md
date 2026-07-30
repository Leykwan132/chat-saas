# Page Guidance and Knowledge Base Actions Design

## Goal

Make key setup pages easier to understand at a glance and create a direct path from Knowledge Base to testing and workflow automation.

## Page descriptions

Add one muted, single-line description directly beneath each existing page title:

- Configuration: `Define how your agent behaves and responds to customers.`
- Knowledge Base: `Add the information your agent uses to answer customers.`
- Channels: `Connect the platforms where customers can reach your agent.`
- Availability: `Set when your team is available for bookings and lead assignment.`
- Services: `Create the services customers can book with your team.`

Descriptions use the existing small muted text treatment and remain visually subordinate to the title. Workflow remains unchanged because it is a full-height canvas without a conventional page-title header.

## Configuration navigation order

Change the Configuration sidebar order to:

1. Agent Setup
2. Knowledge Base
3. Workflow
4. Channels

Permissions and destination routes remain unchanged.

## Knowledge Base test action

Add an outlined `Test your agent` button to the top-right of the Knowledge Base header, matching the Agent Setup header action.

Selecting it opens the existing agent playground directly from Knowledge Base in a right-side drawer. The user stays on the Knowledge Base page, and the shared playground continues to own permission handling, loading, indexing status, and test-chat behavior.

Closing the drawer returns focus to Knowledge Base without changing routes or source selection.

## Workflow promotion card

Add a persistent compact card beneath the Knowledge Base `Sources` navigation group.

The card copy is:

- Headline: `Need your AI agent to send images, videos, reminders, or follow-ups?`
- Description: `Set it up with Workflow.`
- Action: `Try Workflow →`

The action navigates to the current agent's Workflow page. The card remains visible for every Knowledge Base source type and does not open a modal.

## Responsive behavior

Page descriptions wrap naturally on narrow screens. Existing header actions retain their current responsive stacking.

The test chat uses the shared drawer behavior at all viewport sizes, avoiding another Knowledge Base grid column. The promotion card follows the Sources column width and moves with that column under the existing responsive layout.

## Testing

Add focused source or component tests covering:

- Exact page-description copy on all five pages.
- Knowledge Base test button presence and shared playground drawer wiring.
- Workflow card copy and current-agent destination.
- Configuration navigation order.

Run the focused tests and the production build under Node.js 22.

## Release handling

This is a customer-facing UI improvement but is not confirmed as released. Record the verified local result in `CONTINUITY.md`; do not add it to the production changelog until availability is confirmed.
