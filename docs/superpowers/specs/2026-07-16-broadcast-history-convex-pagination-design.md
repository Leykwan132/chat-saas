# Broadcast History Convex Pagination Design

## Goal

Update Broadcast History to use the shared shadcn Table and Pagination components while loading history through Convex cursor pagination in 10-record batches.

## Success Criteria

- Broadcast History uses `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, and `TableCell` from `@/components/ui/table`.
- The first query requests 10 schedules with `usePaginatedQuery` and `initialNumItems: 10`.
- Each visible numbered page contains at most 10 broadcasts.
- Previous, loaded page numbers, and Next work without exposing an artificial history limit.
- Existing ordering, row navigation, permissions, actions, loading state, empty state, status presentation, and delete animation remain intact.
- Every touched code file contains at most 300 lines.

## Backend Query

Keep `api.whatsappBroadcast.listSchedulesForAgent` as the stable public entrypoint. Add `paginationOpts: paginationOptsValidator` to its arguments and replace the current descending `.take(100)` call with `.paginate(args.paginationOpts)`.

The query continues to use `by_agentId_and_scheduledAt`, constrain results to the requested agent, and order schedules newest first. Its result becomes Convex's standard paginated response containing `page`, `isDone`, and `continueCursor`. This removes the current latest-100 ceiling without adding a count query or unbounded collection read.

## Frontend Data Flow

`BroadcastPage` calls:

```tsx
usePaginatedQuery(
  api.whatsappBroadcast.listSchedulesForAgent,
  { agentId },
  { initialNumItems: 10 },
)
```

The hook's accumulated `results` are divided into fixed 10-row UI pages. `currentPage` begins at one.

- Previous moves to the prior loaded page.
- A loaded page number moves directly to that page.
- Next moves immediately when the following page is already loaded.
- At the loaded edge, Next calls `loadMore(10)` when status is `CanLoadMore`.
- The current page remains visible while status is `LoadingMore`; after the new batch arrives, the UI advances to the newly loaded page.
- Duplicate loads are blocked while status is `LoadingMore`.
- Next is disabled at the last loaded page only when status is `Exhausted`.
- The current page is clamped when reactive changes or deletion reduce the loaded page count.

Only loaded page numbers are displayed because cursor pagination cannot know or jump to unloaded page numbers. The pagination uses the project's bounded page-link and ellipsis treatment as loaded pages accumulate.

## Components

### `BroadcastHistoryTable`

Owns the shadcn table markup, loaded-result slicing, pagination controls, loading and empty rows, formatting, and row action menu. It receives navigation and delete-request callbacks plus the current permission and deletion state. It does not execute mutations or own confirmation dialogs.

### `BroadcastDeleteDialog`

Owns the existing cancel/delete confirmation presentation. `BroadcastPage` retains the selected schedule and mutation orchestration so success and failure behavior remain unchanged.

### `BroadcastCostCalculatorDialog`

Moves the existing calculator dialog and its local slider calculation into a focused component without visual or behavioral changes.

### `BroadcastGuideCard`

Moves the existing guide-card presentation out of the route file without visual or behavioral changes.

These focused extractions keep `BroadcastPage` responsible for route parameters, permissions, query and mutation integration, top-level dialog visibility, and composition while bringing it below the 300-line project limit. They do not broaden the feature scope.

## Presentation and Interaction

The history retains its seven existing columns:

1. Campaign Name
2. Scheduled Time
3. Recipients
4. Status
5. Reply rate
6. Est. Cost
7. Action

Rows continue to open the Broadcast detail route. The Action cell stops row propagation. Users with Broadcast management permission retain the delete action; other users see no action control. Pending schedules retain cancel-oriented confirmation copy, while other schedules retain delete-history copy.

Initial loading shows the existing centered spinner row. Loading another batch leaves the current rows in place and disables forward navigation until the request settles. An exhausted empty result shows the existing empty message. Convex query errors continue through the application's existing error boundary, and mutation failures continue to use the existing error toast.

## Testing

- Add a Convex test proving the query returns the newest 10 schedules first and exposes a cursor for the next batch.
- Add a second-page test proving the cursor returns the next schedules without overlap and reaches completion correctly.
- Add pagination-state tests for loaded-page navigation, edge loading, disabled states, post-load advancement, and reactive clamping.
- Add component or structure tests proving the shared shadcn Table is used and the native history `<table>` is removed.
- Preserve or extend tests covering row navigation, action propagation, permission visibility, and delete confirmation behavior where practical.
- Run focused tests, targeted ESLint, the production build, the complete test suite, `git diff --check`, and touched-code line-count checks under Node 22.

## Out of Scope

- A total-history count or random access to unloaded cursor pages.
- Changes to Broadcast detail Recipients pagination.
- Changes to broadcast scheduling, sending, pricing, status calculation, or permissions.
- Visual redesign of the guide cards, calculator, status pills, or confirmation dialogs.
