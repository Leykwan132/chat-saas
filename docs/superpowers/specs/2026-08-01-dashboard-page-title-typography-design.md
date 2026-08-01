# Dashboard Page Title Typography Design

## Goal

Make authenticated application page titles use KiloBot's Gilda Display title font at normal weight, and reduce the space between page descriptions and the first content item.

## Scope

- Apply to top-level page titles and detail-page titles rendered after login under the authenticated `/workspace` and `/dashboard/:agentId` application shells.
- Include list pages, configuration pages, analytics pages, and entity detail pages.
- Exclude public marketing and legal pages, authentication pages, onboarding and creation wizards, modal and sheet titles, card and section headings, sidebar labels, empty states, and error-state headings.
- Keep each title's current responsive font size, line height, truncation, badge placement, and surrounding actions unless a spacing change is explicitly described below.

## Typography

- Add `font-title font-normal` to every in-scope page title.
- Remove `font-semibold` or `font-bold` from in-scope page titles so the browser does not synthesize a heavier Gilda Display weight.
- Preserve existing title color, tracking, margins, truncation, and responsive size utilities.
- Update the shared `PageTitleBlock` first so Configuration, Knowledge Base, Channels, Availability, and Services inherit the typography consistently.
- Use a shared dashboard page-title class or focused shared header primitive for custom page headers where their layout permits it.
- Keep heterogeneous page headers structurally intact when they contain badges, inline editing, back links, or page-specific actions; apply the shared typography class to their actual top-level title only.

## Description-to-Content Spacing

- Preserve the current compact title-to-description spacing inside the header block.
- Standardize the vertical distance from a page header containing a description to the first content item at 24px.
- Reduce common 32px header-to-content gaps to 24px.
- Do not add descriptions to pages that currently have none.
- Pages without a description retain their existing structural spacing unless their header already uses the shared described-page layout.
- Do not alter internal spacing inside cards, tables, tabs, forms, dialogs, or sidebars.

## Implementation Boundaries

- Prefer shared styles over a global descendant selector so nested `h1` elements in wizards, error states, and embedded experiences are not restyled accidentally.
- Do not migrate unrelated page layout or business logic.
- Preserve accessibility semantics: each page keeps its existing `h1` and heading hierarchy.
- Keep every edited code file within the project's 300-line modularity rule; if an in-scope legacy page already exceeds 300 lines, limit the edit to its existing title/header classes rather than expanding the file.
- Preserve the unrelated working-tree change in `convex/_generated/api.d.ts`.

## Verification

- Add a route-aware source contract listing authenticated `/workspace` and `/dashboard/:agentId` page components with visible top-level page titles.
- Verify every in-scope title uses the shared KiloBot title typography and no in-scope title retains semibold or bold weight.
- Verify `PageTitleBlock` uses `font-title font-normal`.
- Verify described page layouts use a 24px header-to-content gap.
- Run focused header typography and spacing tests under Node v22.
- Run scoped ESLint for touched files, recording any pre-existing findings separately from change-related findings.
- Run `git diff --check` before completion.

## Release Handling

- Treat this as a customer-facing but unreleased visual improvement.
- Record it in `CONTINUITY.md` and do not add a changelog entry until production availability is confirmed.
