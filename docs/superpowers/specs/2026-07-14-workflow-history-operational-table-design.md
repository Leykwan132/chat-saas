# Workflow History Operational Table Design

## Goal

Replace the populated Reminder and Follow-up History card lists with one shared operational table that makes delivery activity easy to scan.

## Shared UI

`WorkflowAutomationHistoryDialog` remains the single renderer for both automation kinds. Its populated state uses the existing shadcn `Table`, `TableCaption`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, and `TableCell` components. The caption is the first table child and shows the exact all-time sent count with correct singular/plural copy, such as `1 reminder sent so far.` or `8 follow-ups sent so far.` The count is independent of the currently loaded page.

The dialog keeps its title, description, rounded treatment, 25-row cursor pagination, and existing empty state. The Load more button is replaced by the installed shadcn `Pagination` composition with Previous, bounded page-number links, ellipses, and Next. Previously loaded pages remain locally navigable. Moving beyond the last loaded page requests the next cursor batch, and navigation stops when Convex reports pagination exhaustion.

## Responsive Dialog Layout

The shared dialog sizes to the table's complete intrinsic width instead of using a fixed or viewport-capped width. `DialogContent` uses `w-max max-w-none sm:max-w-none` with `p-6 sm:p-8`, so the desktop dialog expands automatically for every column.

History does not use `ScrollArea`. A local wrapper overrides the shared Table container to `overflow-visible`, and the table uses `w-max`; the dialog therefore owns the table's full width and does not render an internal horizontal or vertical scrollbar.

## Columns

The table contains six columns in this order:

1. `Customer`
2. `Template`
3. `Scheduled`
4. `Sent`
5. `Status`
6. `Estimated cost`

The Customer cell shows the best available customer identity as its primary line and the appointment or conversation subject as muted secondary context when it adds distinct information. The Template cell shows the template name first and language beneath it. Scheduled and Sent use the current locale date-time formatting; Sent displays an em dash when delivery has not occurred.

Status uses the existing semantic Badge mapping. A stored reason appears as muted secondary text only for failed, skipped, or cancelled activity. Scheduled and sent rows do not reserve empty reason space.

Estimated cost is the saved Malaysian WhatsApp template rate for successfully sent activity. Unsent activity and unknown template categories display an em dash. A `TableFooter` row at the bottom shows `Estimated total spent` for all successfully sent history, independent of the currently loaded page.

## Data and Behavior

Each successfully sent run records its estimated MYR cost exactly once from the template category snapshot. A per-agent, per-automation-kind total is updated in the same Convex transaction so duplicate Workpool completion callbacks cannot double-count it. Unknown categories are explicitly marked unpriced and never assigned a fallback rate.

The paginated history query returns each run's saved estimate and the all-time cost total. The same total document's priced and unpriced sent counters produce the exact caption count. A bounded `@convex-dev/migrations` migration backfills existing sent runs through the same idempotent accounting function.

Reminder and Follow-up continue passing their automation kind into the same dialog, so both receive the table without duplicate implementations.

## Verification

A focused source contract requires the shared shadcn table and Pagination compositions, the six operational headers, exact sent caption, 25-row page slicing, estimated-spend footer, unrestricted intrinsic dialog width, responsive padding, visible table overflow, and absence of `ScrollArea`. Unit coverage verifies singular and plural captions plus bounded page-number and ellipsis behavior. Backend coverage verifies per-run pricing, idempotent total accounting, unknown-category handling, separate Reminder and Follow-up totals, authorization, and pagination.
