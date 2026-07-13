# Workflow Template Usage Design

## Goal

Keep workflow template adoption data in Convex without displaying it in the product, while making the template picker smaller and simpler.

## Template Picker

The existing HoverCard continues to show Q&A, Real Estate, and E-commerce Product as three cards in one left-to-right row. The HoverCard width is reduced. Each card contains only its title, description, and a footer button labeled `Replace current`. The `Message enters` and action-count cue is removed.

## Usage Semantics

A template counts as used only when the user successfully saves a workflow draft that originated from that template. Clicking `Replace current`, resetting the draft, leaving the page, or encountering a failed workflow Save does not record usage.

The page keeps the selected template ID as draft metadata. Applying another template replaces that metadata. Reset clears it. A successful Save sends the optional template ID to the existing atomic workflow replacement mutation and clears the local metadata after the mutation succeeds.

## Backend Data

Convex stores one usage record per agent and template with:

- `agentId`
- `templateId`
- `firstUsedAt`
- `lastUsedAt`
- `saveCount`

Convex also stores one total record per template with:

- `templateId`
- `uniqueAgentCount`
- `saveCount`
- `updatedAt`

The workflow Save transaction upserts both records. The first Save by an agent increments both the unique-agent and total-save counts. Later Saves for the same agent/template increment only the per-agent and total save counts. Transactional retries protect the counters from conflicting concurrent writes.

## Privacy and Access

No public query exposes template usage. No adoption number, popularity message, badge, or threshold appears in the frontend. The stored totals are available for a later explicitly designed admin or popularity feature.

## Validation and Failure Behavior

The optional template ID accepts only `qa`, `real-estate`, or `e-commerce`. Usage updates occur in the same Convex transaction as workflow replacement, so a failed workflow Save records nothing and a usage-write failure rolls back the workflow Save.

## Testing

Focused frontend tests cover the smaller card layout, removed cue, exact `Replace current` copy, and template metadata lifecycle. Convex integration tests cover first usage, repeated usage, per-template separation, and stale-save rollback without usage changes.
