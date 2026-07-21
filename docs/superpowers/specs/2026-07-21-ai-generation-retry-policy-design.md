# AI Generation Retry Policy Design

Date: 2026-07-21
Status: Approved for planning

## Goal

Give every backend `generateText` and `generateObject` provider request one explicit, consistent retry policy without replaying the surrounding Convex action, database writes, tool effects, messages, or credit operations.

## Current State

The backend has six generation call sites:

- `convex/analyticsInsights.ts`: one direct AI SDK `generateObject` call.
- `convex/chat/inbox.ts`: two Convex Agent `generateText` calls.
- `convex/chat/inboxActions.ts`: two direct AI SDK `generateText` calls.
- `convex/chat/workflowActionPlanner.ts`: one Convex Agent `generateObject` call.

The installed AI SDK defaults to two retries. Those retries occur only for provider errors marked retryable, use exponential backoff starting at two seconds, and respect reasonable provider `Retry-After` headers. The current code relies on that implicit default.

The Action Retrier package is installed, but its `run` API retries a registered Convex action asynchronously and returns a run ID instead of the action result. Applying it to these call sites would change execution semantics and could replay side effects around generation.

## Decision

Define one backend constant named `AI_GENERATION_MAX_RETRIES` with the value `3`. In AI SDK terminology this permits one initial request and up to three retries, for four total provider attempts.

The policy will use the AI SDK's native retry implementation. It will retry only errors the provider or SDK identifies as transient and retryable. Authentication failures, invalid requests, aborts, malformed application configuration, and other non-retryable failures will fail immediately.

Action Retrier will not wrap these generation paths. It remains available for future isolated, idempotent background actions whose asynchronous run lifecycle is appropriate.

## Architecture

Create `convex/llm/retryPolicy.ts` as the single policy source. It exports only the descriptive retry constant needed by callers.

Direct AI SDK calls pass the constant as `maxRetries` in their existing `generateText` or `generateObject` options.

Convex Agent calls inherit the same value from `callSettings.maxRetries` on the shared `Agent` created by `buildAgent`. This covers both inbox response generation and workflow action planning without duplicating settings at each Agent call site.

No new retry loop, scheduler, component registration, schema, table, mutation, or action will be introduced.

## Data and Error Flow

1. A generation call sends its first provider request.
2. A retryable provider or network failure enters the AI SDK retry loop.
3. The SDK waits using exponential backoff or a valid provider `Retry-After` delay.
4. The SDK makes at most three further provider requests.
5. A successful response continues through the existing usage tracking, parsing, persistence, sending, and credit behavior exactly once.
6. A non-retryable failure, abort, or exhausted retry sequence follows the call site's existing error path.

Retries stay inside the provider request boundary. The outer Convex action and Agent tool executions are not restarted by this policy.

## Observability and Cost

Existing final success and failure logging remains unchanged. Existing usage capture continues to record the successful generation result using the usage returned by the SDK. No prompt, model, response, credit price, or user-visible error copy changes.

The higher limit may add one provider attempt and, under repeated transient failure, roughly one additional exponential-backoff interval compared with the SDK default. The four-attempt ceiling prevents unbounded latency and spend.

## Testing

Implementation follows red-green-refactor:

1. Add a focused source-contract test that fails while the six call sites still rely on the implicit SDK default.
2. Assert the shared policy is exactly three retries.
3. Assert direct generation calls reference the shared policy.
4. Assert the shared Convex Agent configuration applies the policy through `callSettings.maxRetries`, covering its `generateText` and `generateObject` consumers.
5. Assert no Action Retrier wrapper or component registration is required by this change.
6. Run the focused tests, relevant existing AI/workflow tests, `git diff --check`, and the repository's code-file size check under Node 22.

## Non-Goals

- Retrying all thrown errors regardless of retryability.
- Retrying entire Convex actions.
- Retrying Agent tool executions or message sends.
- Adding model fallback or provider failover.
- Changing timeouts, prompts, schemas, models, usage accounting, or credit charging.
- Deploying Convex functions or modifying production data.

## Acceptance Criteria

- Every current backend `generateText` and `generateObject` path uses the explicit three-retry policy.
- There is one source of truth for the retry count.
- Retry behavior remains provider-boundary-only and bounded to four total attempts.
- Non-retryable failures continue to fail without a broad catch-and-retry loop.
- Existing post-generation behavior and public APIs remain unchanged.
- Focused and relevant regression tests pass under Node 22.
