# Routing Page Copy Design

## Goal

Make the lead-distribution area easier to understand by presenting it as Routing.

## User-facing copy

The sidebar item and page title change from `Lead Assignment` to `Routing`. The page header gains the description: `Control how incoming leads are routed to your team.`

## Icons

The Routing sidebar item uses the existing workflow-condition `Split` icon. Workflow condition labels use `SignpostBig` instead of `Split`. No Routing or workflow behaviour changes.

## Boundaries

Only customer-visible navigation and page-header copy changes. The existing `lead-assignment` URL, permission identifiers, backend function names, data model, and routing behaviour remain unchanged.

## Verification

Update the existing page-title coverage test and add coverage for the sidebar label, header description, Routing icon, and workflow condition icon.
