# Workflow Canvas Title

## Goal

Place the Workflow page title above the canvas tool row and remove the duplicate Workflow label from the Direct Message navigation card.

## Design

The top-left canvas controls will become one vertically arranged floating stack:

1. A plain `Workflow` page title using KiloBot's display font at normal weight.
2. The existing zoom, fit, cleanup, template, and layout tool row.
3. The existing Direct Message, Reminders, and Followups navigation card without its internal `Workflow` heading.

The title itself will have no surrounding border or background. The tool row and navigation card retain their current bordered translucent surfaces. Existing actions, disabled states, view switching, canvas sizing, and keyboard or pointer behavior remain unchanged.

The Workflow loading skeleton will mirror the new vertical hierarchy.

## Verification

A rendered toolbar regression will verify the title typography, ordering, single visible `Workflow` title, and unchanged navigation labels. Existing toolbar, canvas, view-switching, draft-action, and skeleton tests will remain green.
