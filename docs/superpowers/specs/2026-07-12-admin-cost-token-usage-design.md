# Admin Cost Token Usage Design

## Goal

Add total token usage to the Admin Costs report without scanning `rawAgentUsage` when the page loads. Historical and future totals must use the same user, provider, model, and month dimensions as the existing cost report.

## Scope

- Show one combined `totalTokens` value, sourced from `rawAgentUsage.usage.totalTokens`.
- Add a Total tokens summary card that follows the existing month filter.
- Add a sortable Tokens column to Spend by user and Model spend by user.
- Preserve the existing cost, request, plan, and date behavior.
- Backfill every existing raw usage row once, verify the result, and remove the temporary migration entrypoint afterward.

Input and output token breakdowns are outside this change.

## Aggregate Design

Create an `agentTokenUsage` aggregate alongside `agentCostUsage`. It uses the existing `AgentCostSortKey`, `agentCostSortKey`, and `agentCostNamespace`, while its sum value is `doc.usage.totalTokens`.

Reusing the cost namespace keeps token totals aligned with the requests represented on the Costs page: WorkOS user ID, provider, and model, excluding the same uncosted namespace from report dimensions. Reusing the `[monthKey, createdAt]` sort key supports identical all-time and monthly ranges.

The token aggregate remains permanent. Only the historical backfill entrypoint is temporary.

## Query and Data Flow

The admin aggregate query discovers report dimensions from `agentCostUsage`, then requests cost and token sums for the same namespace and optional month bounds. Each model, user, monthly model, monthly user, and month option accumulator carries `totalTokens`.

The public admin report returns `totalTokens` on all table row types and month options. The selected user rows are the source for the summary total, ensuring the summary card follows the existing month filter.

## Interface

The summary section gains a Total tokens card. Values use compact notation in the card and locale-separated integers in tables.

Both tables gain a right-aligned, sortable Tokens column. Sorting is numeric and follows the existing sort direction behavior.

## Backfill and Cleanup

Rollout is staged to avoid missing or duplicating writes:

1. Register the new aggregate component and an idempotent raw-usage trigger.
2. Deploy a temporary internal paginated backfill mutation.
3. Process `rawAgentUsage` in bounded batches using `insertIfDoesNotExist` and a continuation cursor.
4. Continue until the cursor reports completion.
5. Verify aggregate counts and sums against independently calculated raw-row totals, including representative monthly namespaces.
6. Remove the temporary backfill and verification entrypoints.
7. Change the permanent trigger from idempotent to strict and deploy again.

The migration never changes or deletes `rawAgentUsage` records. A retry is safe during the idempotent phase.

## Failure Handling

Backfill responses report processed rows, continuation cursor, and completion state. A failed batch stops the run and retains its last successful cursor. The next run resumes from that cursor. Verification failure blocks cleanup and the strict-trigger switch.

Missing or invalid token values are not given fallback behavior because the schema requires `usage.totalTokens` to be numeric.

## Testing

- Aggregate tests prove all-time and monthly token sums by user and model.
- Admin report tests prove `totalTokens` is serialized through all row types and month options.
- Model tests prove month filtering, summary totals, numeric sorting, and token formatting.
- Backfill tests prove pagination and retry-safe insertion without duplication.
- Existing cost-report tests remain green.

## Success Criteria

- Historical and new token totals match `rawAgentUsage.usage.totalTokens` for cost-report dimensions.
- Month selection updates the card and both tables consistently.
- No page-load scan of raw usage is introduced.
- The temporary migration code is absent from the final codebase.
