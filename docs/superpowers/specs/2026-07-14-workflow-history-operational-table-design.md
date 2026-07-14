# Workflow History Operational Table Design

## Goal

Replace the populated Reminder and Follow-up History card lists with one shared operational table that makes delivery activity easy to scan.

## Shared UI

`WorkflowAutomationHistoryDialog` remains the single renderer for both automation kinds. Its populated state uses the existing shadcn `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, and `TableCell` components.

The dialog keeps its title, description, rounded treatment, scroll boundary, 25-row pagination, Load more action, and existing empty state.

## Columns

The table contains five columns in this order:

1. `Customer`
2. `Template`
3. `Scheduled`
4. `Sent`
5. `Status`

The Customer cell shows the best available customer identity as its primary line and the appointment or conversation subject as muted secondary context when it adds distinct information. The Template cell shows the template name first and language beneath it. Scheduled and Sent use the current locale date-time formatting; Sent displays an em dash when delivery has not occurred.

Status uses the existing semantic Badge mapping. A stored reason appears as muted secondary text only for failed, skipped, or cancelled activity. Scheduled and sent rows do not reserve empty reason space.

## Data and Behavior

The existing paginated Convex history query already returns every field required by the table. No schema, query, scheduling, delivery, or pagination changes are included.

Reminder and Follow-up continue passing their automation kind into the same dialog, so both receive the table without duplicate implementations.

## Verification

A focused source contract requires the shared shadcn table composition and the five operational headers. It also verifies that populated history no longer renders the card-list treatment or the audit-only Scope and Attempt fields. Existing coverage continues to verify separate Reminder and Follow-up usage and pagination.
