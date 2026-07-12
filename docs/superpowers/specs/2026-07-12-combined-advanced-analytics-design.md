# Combined Advanced Analytics Design

## Goal

Run topic detection, customer sentiment, and lead-temperature classification together in one structured AI request for Growth and Business conversations, once daily at 2:00 AM Malaysia time.

## Eligibility and Schedule

The combined job is available only to Growth, Business, and higher plans through the existing advanced-analytics plan check. Starter retains its existing one-time lead-temperature classification after Meta history sync and does not enter the daily job. Free remains ineligible.

The Convex cron will use a fixed daily UTC schedule at `18:00 UTC`, which is `02:00 MYT (UTC+8)` on the following calendar day. It replaces the separate topic-detection and sentiment interval jobs.

The job will inspect a bounded batch of the most recently active non-playground conversations. A conversation is eligible when it has a customer, contains at least one incoming customer message, and its latest message is newer than the last successfully persisted combined analysis watermark. Either an incoming or outgoing new message can make the conversation eligible because the topics and customer state may change with the complete exchange.

## One Structured Model Request

Each eligible conversation will use one `generateObject` request with a strict Zod schema. The object contains:

- `topics`: one to five topic objects with a specific label, description, conversation summary, optional existing topic ID, and confidence from 0 to 1.
- `sentiment`: exactly `positive`, `neutral`, or `negative`.
- `leadTemperature`: exactly `hot`, `warm`, or `cold`.

The request receives the same bounded chronological transcript and existing organization topics used by current topic detection. The prompt will define topic specificity, customer-only sentiment interpretation, and Hot/Warm/Cold buying-intent rules. Invalid or incomplete model output fails schema validation instead of being repaired with fallback values.

The default advanced-analytics model remains the model used for the request. One PostHog AI-generation span records the combined request and its token/latency usage.

## Persistence and Retry Semantics

Successful output updates all three insights:

- Topic records and conversation-topic assignments are replaced using the existing topic resolution behavior.
- Sentiment is stored on the conversation and synchronized to its topic assignments.
- Lead temperature is stored on the customer through the existing customer-level representation, with the existing lead-status event and conversation analytics synchronization when the value changes.
- A conversation-level combined-analysis timestamp and source-message watermark are advanced only after the structured result has been persisted.

If generation, validation, or persistence fails, the error is logged, the remaining batch continues, and the combined watermark is not advanced. The conversation therefore remains eligible for a future daily retry. No default sentiment, topic, or temperature is written.

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

Tests will cover the strict combined schema, prompt contract, Growth/Business eligibility, Starter exclusion, new-message watermark behavior, successful combined persistence, retry behavior when processing fails, the single fixed 18:00 UTC cron entry, removal of the two separate analytics crons, the third Advanced Analytics pricing item, and complete absence of `updateLeadsStatus` from workflow types, validators, catalogs, prompts, and landing workflow mocks.

Verification will run under Node.js 22 and include focused tests, Convex code generation when public/internal function references change, TypeScript checking because this is a multi-module backend change, formatting checks, and code-file line-count checks.
