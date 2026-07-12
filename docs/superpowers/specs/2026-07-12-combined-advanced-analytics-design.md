# Combined Advanced Analytics Design

## Goal

Run topic detection, customer sentiment, and lead-temperature classification together in one structured AI request for Growth and Business conversations, once daily at 2:00 AM Malaysia time.

## Eligibility and Schedule

The combined job is available only to Growth, Business, and higher plans through the existing advanced-analytics plan check. Starter retains its existing one-time lead-temperature classification after Meta history sync and does not enter the daily job. Free remains ineligible.

The Convex cron will read the required `ADVANCED_ANALYTICS_CRON_UTC` deployment environment variable in strict `HH:MM` UTC format. Missing or invalid values fail deployment instead of silently choosing a fallback. The initial value is `18:00`, which is `02:00 MYT (UTC+8)` on the following calendar day. Changing the variable requires redeploying Convex functions so the registered daily schedule is updated. The combined cron replaces the separate topic-detection and sentiment interval jobs.

The job will inspect a bounded batch of the most recently active non-playground conversations. A conversation is eligible when it has a customer, contains at least one incoming customer message, and its latest message is newer than the last successfully persisted combined analysis watermark. Either an incoming or outgoing new message can make the conversation eligible because the topics and customer state may change with the complete exchange.

## One Structured Model Request

Each eligible conversation will use one `generateObject` request with a strict Zod schema. The object contains:

- `topics`: one to five topic objects with a specific label, description, conversation summary, optional existing topic ID, and confidence from 0 to 1.
- `sentiment`: exactly `positive`, `neutral`, or `negative`.
- `leadTemperature`: exactly `hot`, `warm`, or `cold`.

The request receives the same bounded chronological transcript and existing organization topics used by current topic detection. The prompt will define topic specificity, customer-only sentiment interpretation, and Hot/Warm/Cold buying-intent rules. Invalid or incomplete model output fails schema validation instead of being repaired with fallback values.

The default advanced-analytics model remains the model used for the request. One PostHog AI-generation span records the combined request and its token/latency usage.

## Serial Workpool

The cron action only selects eligible conversations and enqueues one action per conversation into a dedicated `advancedAnalyticsWorkpool`. The pool uses `maxParallelism: 1`, so model requests and persistence run serially. The cron returns after enqueueing and does not wait for the queue to drain.

Each work item enables Workpool retries for transient failures. The worker owns context loading, the single structured model request, and all persistence. A failed attempt throws after logging so the Workpool can retry it; no failure path advances the combined watermark.

## Persistence and Retry Semantics

Successful output updates all three insights:

- Topic records and conversation-topic assignments are replaced using the existing topic resolution behavior.
- Sentiment is stored on the conversation and synchronized to its topic assignments.
- Lead temperature is stored on the customer through the existing customer-level representation, with the existing lead-status event and conversation analytics synchronization when the value changes.
- A conversation-level combined-analysis timestamp and source-message watermark are advanced only after the structured result has been persisted.

If generation, validation, or persistence fails, the worker logs and throws so Workpool retry policy applies, and the combined watermark is not advanced. The conversation therefore remains eligible after retries are exhausted. No default sentiment, topic, or temperature is written.

## Structured Logs

The cron emits `cron_started` and `jobs_enqueued`. Work items emit `worker_started`, `worker_skipped`, `worker_completed`, and `worker_failed`. Logs share a generated run ID; worker logs include only conversation ID, safe outcome metadata, and duration. They never include transcript content, customer names, phone numbers, or contact addresses.

## Existing Behavior

Starter, Growth, and Business retain the existing one-time Meta history-sync lead classification. For Growth and Business, the daily combined analysis subsequently refreshes the customer-level lead temperature after new conversation activity. Manual lead-temperature edits remain supported but may be superseded by a later successful daily analysis of a newly active conversation.

## Pricing Presentation

The Advanced Analytics hover list will contain, in order:

1. Common Topic Detection
2. Customer Sentiment
3. Lead Temperature

Advanced Analytics remains included only for Growth, Business, and Enterprise in the pricing comparison.

## Workflow Lead Qualification Removal

The `updateLeadsStatus` workflow node and its “Qualify leads” presentation will be removed completely. It will no longer exist in shared workflow kinds, addable kinds, action kinds, Convex validators, workflow catalog icons/options, workflow prompts, or workflow tests.

Existing saved `updateLeadsStatus` nodes are not supported or migrated. The deployment assumes those legacy workflow documents can be discarded or are absent; no compatibility validator or runtime branch will remain.

The landing-page workflow mock will stop mapping its AI step to `updateLeadsStatus` and will replace the qualification example with a supported workflow action that does not present lead qualification as a workflow capability. General sales-oriented copy outside workflow feature surfaces remains unchanged.

Lead temperature remains available through Starter’s one-time Meta sync classification and the combined daily Growth/Business Advanced Analytics job. Removing the workflow node does not remove customer lead-temperature fields, filters, badges, manual editing, or automation audiences.

## Verification

Tests will cover the strict combined schema, prompt contract, Growth/Business eligibility, Starter exclusion, new-message watermark behavior, successful combined persistence, a dedicated Workpool with maximum parallelism 1 and retries, safe structured lifecycle logging, strict parsing of the required UTC cron environment variable, one combined daily cron entry, removal of the two separate analytics crons, the third Advanced Analytics pricing item, and complete absence of `updateLeadsStatus` from workflow types, validators, catalogs, prompts, and landing workflow mocks.

Verification will run under Node.js 22 and include focused tests, Convex code generation when public/internal function references change, TypeScript checking because this is a multi-module backend change, formatting checks, and code-file line-count checks.
