# Broadcast Recipient Table Pagination Design

## Goal

Replace the Broadcast detail Recipients tab's native table with the shared shadcn Table composition and paginate the existing recipient rows in fixed pages of 10.

## Scope

- Preserve the existing recipient columns, status presentation, empty state, and responsive horizontal overflow.
- Show numbered shadcn pagination with Previous, Next, and bounded ellipses only when more than 10 recipients exist.
- Keep the footer recipient count and estimated cost based on the complete broadcast, independent of the active page.
- Keep the existing reactive `listBroadcastScheduleRecipients` query unchanged. Broadcast creation already enforces a maximum of 50 recipients, so client-side pagination is bounded.
- Split the oversized detail page into focused overview and recipients components so every touched code file remains below 300 lines.

## Component Design

`BroadcastDetailPage` continues to own route validation, Convex queries, permissions, mutations, active-tab state, and confirmation actions.

`BroadcastDetailOverview` renders the current overview content from explicit schedule, channel, template-preview, and cost props without changing its behavior.

`BroadcastRecipientsTable` owns current-page state and renders the shared `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, and `TableCell` components. It slices rows through a pure pagination model using a fixed page size of 10 and renders the shared shadcn Pagination controls below the table card.

## Pagination Behavior

- The first page is selected initially.
- A page contains at most 10 rows.
- Page links are bounded and use ellipses when the page range is truncated.
- Previous is disabled on page one; Next is disabled on the final page.
- Selecting a page prevents default anchor navigation.
- If reactive data reduces the page count, the selected page is clamped to the final valid page.
- Empty data renders the existing empty row and no pagination controls.

## Totals and Data Flow

The detail page continues to calculate estimated cost from every returned recipient. The recipients component receives the all-recipient cost and uses the complete row count in its footer. Changing pages affects only the visible body rows.

No Convex schema, query, index, or generated API changes are required.

## Error Handling

Existing loading, missing-schedule, permission, and query behavior remains unchanged. Pagination accepts only page numbers produced by its own model and clamps reactive data changes, so it cannot display an out-of-range empty page.

## Testing

Test the pure pagination model before implementation for:

- empty rows;
- exactly one 10-row page;
- an additional page when the row count exceeds 10;
- correct row slicing;
- bounded page-number and ellipsis output;
- clamping after the total row count decreases.

Run the focused test under Node 22, then targeted ESLint, the production build, `git diff --check`, and touched-code line-count checks.
