# Workflow Discard and Template Interaction Design

## Goal

Make unsaved workflow changes easier to understand and template selection faster and more intentional.

## Dirty workflow actions

The top-right dirty-state toolbar keeps its existing shape, spacing, and placement. The secondary action changes from `Reset` to `Discard changes`, displays a leading `Trash2` icon, and uses a reusable background-free destructive ghost variant. Its text and icon remain red, while idle, hover, active, and dark-mode states remain transparent. Enabled actions display the pointer cursor on hover, while the existing disabled treatment remains non-interactive. A red semantic focus ring preserves keyboard visibility. Save remains the dark primary action.

Discard changes keeps the current reset behavior: it restores the latest saved workflow, clears transient template and node selection state, and fits the restored graph to the available canvas with the existing animated fit-view behavior.

## Template cards

Each template Card is one interactive surface. Clicking anywhere on a card immediately replaces the current workflow draft and closes the HoverCard. The card is keyboard focusable, activates with Enter or Space, and presents visible hover and focus feedback.

The footer no longer contains a separate nested button. It displays the text action `Try now` followed by a trailing `ArrowRight` icon as the card's visual action cue. Applying a template remains draft-only: Save persists it, while Discard changes restores the saved workflow.

## Template conditions

Templates contain no `sendText` or `answerQuestions` actions. The AI handles normal conversational answers, avoiding a forced exact-match message. Templates add only supplementary media/file, booking, and escalation actions. Every remaining template action stores an explicit condition label and detail instead of inheriting generic defaults from its node kind.

### Q&A

- `Needs supporting material`: When the customer asks for a guide, document, brochure, or other supporting file.
- `Ready to book`: When the customer wants to schedule time for further help.
- `Needs human help`: When the customer asks for a person or the AI cannot resolve the request safely or confidently.

### Real Estate

- `Requests property photos`: When the customer wants to see photos or other visual media for a property.
- `Requests property documents`: When the customer asks for a brochure, floor plan, listing sheet, or other property document.
- `Ready to view`: When the customer wants to schedule a property viewing.
- `Needs a property agent`: When the customer asks for an agent or needs help beyond the configured property information.

### E-commerce Product

- `Requests product images`: When the customer wants to see product images or other visual media.
- `Requests a product guide`: When the customer asks for a manual, specification sheet, brochure, or other product file.
- `Wants a consultation`: When the customer wants to schedule time to discuss the product before purchasing.
- `Needs sales help`: When the customer asks for a sales teammate or needs help beyond the configured product information.

## Implementation boundaries

The template builder accepts optional explicit condition metadata per action and writes it to the generated edge. It positions the generated graph with the same automatic horizontal layout used by Cleanup instead of fixed 145px vertical coordinates. The standard layout provides 80px between sibling nodes, accounts for rendered node size and control rails, and continues to work if node dimensions change. Template application continues to request the existing animated fit-to-screen behavior.

The shared node defaults remain unchanged for manually added workflow nodes. No backend schema, save flow, usage tracking, or confirmation dialog changes are required.

## Testing

- The dirty-action test verifies `Discard changes`, the background-free destructive ghost variant, and the leading trash icon while preserving Save.
- The shared button-variant test verifies the destructive ghost treatment contains red semantic foreground/focus styles and a pointer cursor, with no background utilities.
- The template-card test verifies the whole card applies the template, supports keyboard activation, closes the HoverCard, and shows the trailing `Try now` arrow cue without a nested action button.
- The template-data test verifies every template excludes `sendText` and `answerQuestions`, retains its required file/media, booking, and escalation actions, and gives every remaining edge the exact intended label and a non-empty detail.
- The template-layout test verifies generated positions match the standard horizontal Cleanup layout and are not the previous fixed 145px stack.
- Existing Reset handler and canvas fit-view tests continue to verify restored-workflow behavior.
