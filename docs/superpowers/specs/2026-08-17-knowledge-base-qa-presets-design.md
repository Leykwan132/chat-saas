# Knowledge Base Q&A presets

## Goal

Help users start useful Q&A entries without writing common customer-support questions from scratch.

## Layout

Render a wrapping row of small outline buttons immediately above the `Add Q&A` heading. Replace the existing `Add more` button with this picker. The choices are Refund policy, Shipping & delivery, Returns & exchanges, Pricing, Payment methods, Opening hours, and Contact support.

## Behavior

Selecting a preset fills the first Q&A row with an empty question. If every visible row already has a question, append a new row with the selected question and an empty answer. The user edits the question or answer normally and saves through the existing processing flow.

## Testing

Add a focused interaction regression that verifies the picker labels, first blank-row prefill, and appended prefilled row behavior. Keep the existing save behavior unchanged.
