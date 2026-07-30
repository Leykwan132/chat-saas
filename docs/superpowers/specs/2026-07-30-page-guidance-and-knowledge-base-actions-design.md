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

Selecting it toggles the existing agent playground as its own container within the Knowledge Base page. A first selection opens it and the next closes it, with the button exposing its state through `aria-pressed`. At extra-large widths, the existing Knowledge Base content remains intact on the left while an approximately 380px test panel enters from the right. At smaller widths, the panel stacks beneath the Knowledge Base content.

Reuse the playground's inline presentation and right-entry animation so the panel has its own title, close action, and bordered chat surface without behaving like a drawer or overlay. The shared playground continues to own permission handling, loading, indexing status, and test-chat behavior.

Closing the panel removes its container without changing routes or source selection.

## Workflow promotion card

Add a persistent compact card beneath the Knowledge Base `Sources` navigation group.

Place `https://storage.kilobot.app/grad-2.jpg` as a full-width 16:9 banner above the copy. Use simple `object-cover` presentation with rounded card clipping and no overlay, decorative label, or extra effect.

The card copy is:

- Title: `Do More Automatically`
- Supporting line: `Need your AI agent to send images, videos, reminders, or follow-ups?`
- Action: `Try Workflow →`

Place the single-line title directly above the supporting line. Use the same small text size for both, semibold weight for the title, and normal weight for the supporting line. Keep the action visually distinct as the card's next step.

The action navigates to the current agent's Workflow page. The card remains visible for every Knowledge Base source type and does not open a modal.

## Responsive behavior

Page descriptions wrap naturally on narrow screens. Existing header actions retain their current responsive stacking.

The Knowledge Base content wrapper adds the test panel as a right-hand column only at extra-large widths. The existing Sources, main content, and storage layout remains unchanged inside the left side. At smaller widths, the test panel stacks beneath that complete content area rather than overlaying it or becoming a fourth column inside it.

The promotion card follows the Sources column width and moves with that column under the existing responsive layout.

## Testing

Add focused source or component tests covering:

- Exact page-description copy on all five pages.
- Knowledge Base test button presence and shared inline playground wiring.
- Workflow card image, copy, and current-agent destination.
- Configuration navigation order.

Run the focused tests and the production build under Node.js 22.

## Release handling

This is a customer-facing UI improvement but is not confirmed as released. Record the verified local result in `CONTINUITY.md`; do not add it to the production changelog until availability is confirmed.
