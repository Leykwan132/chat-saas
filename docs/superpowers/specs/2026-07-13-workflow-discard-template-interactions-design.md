# Workflow Discard and Template Interaction Design

## Goal

Make unsaved workflow changes easier to understand and template selection faster and more intentional.

## Dirty workflow actions

The top-right dirty-state toolbar keeps its existing shape, spacing, and placement. The secondary action changes from `Reset` to `Discard changes`, displays a leading `Trash2` icon, and uses a reusable background-free destructive ghost variant. Its text and icon remain red, while idle, hover, active, and dark-mode states remain transparent. A red semantic focus ring preserves keyboard visibility. Save remains the dark primary action.

Discard changes keeps the current reset behavior: it restores the latest saved workflow, clears transient template and node selection state, and fits the restored graph to the available canvas with the existing animated fit-view behavior.

## Template cards

Each template Card is one interactive surface. Clicking anywhere on a card immediately replaces the current workflow draft and closes the HoverCard. The card is keyboard focusable, activates with Enter or Space, and presents visible hover and focus feedback.

The footer no longer contains a separate nested button. It displays the text action `Try now` followed by a trailing `ArrowRight` icon as the card's visual action cue. Applying a template remains draft-only: Save persists it, while Discard changes restores the saved workflow.

## Template conditions

Every template action stores an explicit condition label and detail instead of inheriting generic defaults from its node kind.

### Q&A

- `Common question`: When the customer asks a common question that the configured response is intended to answer.
- `Needs supporting material`: When the customer asks for a guide, document, brochure, or other supporting file.
- `Ready to book`: When the customer wants to schedule time for further help.
- `Needs human help`: When the customer asks for a person or the AI cannot resolve the request safely or confidently.

### Real Estate

- `Requests property details`: When the customer asks about a property's price, features, location, availability, or other key details.
- `Requests property photos`: When the customer wants to see photos or other visual media for a property.
- `Requests property documents`: When the customer asks for a brochure, floor plan, listing sheet, or other property document.
- `Ready to view`: When the customer wants to schedule a property viewing.
- `Needs a property agent`: When the customer asks for an agent or needs help beyond the configured property information.

### E-commerce Product

- `Requests product details`: When the customer asks about product features, specifications, pricing, availability, or compatibility.
- `Requests product images`: When the customer wants to see product images or other visual media.
- `Requests a product guide`: When the customer asks for a manual, specification sheet, brochure, or other product file.
- `Wants a consultation`: When the customer wants to schedule time to discuss the product before purchasing.
- `Needs sales help`: When the customer asks for a sales teammate or needs help beyond the configured product information.

## Implementation boundaries

The template builder accepts optional explicit condition metadata per action and writes it to the generated edge. The shared node defaults remain unchanged for manually added workflow nodes. No backend schema, save flow, usage tracking, or confirmation dialog changes are required.

## Testing

- The dirty-action test verifies `Discard changes`, the background-free destructive ghost variant, and the leading trash icon while preserving Save.
- The shared button-variant test verifies the destructive ghost treatment contains red semantic foreground/focus styles and no background utilities.
- The template-card test verifies the whole card applies the template, supports keyboard activation, closes the HoverCard, and shows the trailing `Try now` arrow cue without a nested action button.
- The template-data test verifies every action edge has the exact intended label and a non-empty detail.
- Existing Reset handler and canvas fit-view tests continue to verify restored-workflow behavior.
