# Combined Advanced Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace separate topic and sentiment jobs with one daily schema-validated analysis that also refreshes lead temperature, and remove the Qualify leads workflow node completely.

**Architecture:** A pure Zod contract and prompt module defines the combined model output. A bounded Convex records module selects stale Growth/Business conversations and persists the final sentiment/watermark, while existing topic assignment and customer lead-temperature mutations remain the focused persistence boundaries. The cron enqueues one action per conversation into a dedicated Workpool with maximum parallelism 1; each worker makes one `generateObject` request, and a strict deployment environment variable configures the daily UTC schedule.

**Tech Stack:** Convex, TypeScript, AI SDK `generateObject`, Zod v3, Vitest, convex-test, React

## Global Constraints

- Use Node.js 22 for every script and test.
- Code files must stay below 300 lines.
- Do not add fallback classifications or empty catches.
- Growth and Business receive daily combined analysis; Starter retains one-time sync lead labeling.
- Advance the combined watermark only after topics, lead temperature, and sentiment are persisted.
- Remove `updateLeadsStatus` without legacy compatibility or migration.

---

### Task 1: Define and persist combined Advanced Analytics

**Files:**
- Create: `convex/analyticsInsightsContract.ts`
- Create: `convex/analyticsInsightRecords.ts`
- Create: `convex/analyticsInsights.test.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/analytics.test.ts`
- Modify: `convex/analyticsTopicRecords.ts`

**Interfaces:**
- Produces: `analyticsInsightsSchema`, `buildAnalyticsInsightsSystemPrompt`, `buildAnalyticsInsightsPrompt`.
- Produces: `internal.analyticsInsightRecords.listCandidates` and `assignConversationInsights`.
- Consumes: `internal.analyticsTopicRecords.getTopicDetectionContext` and `assignConversationTopic`.

- [ ] **Step 1: Write failing contract, candidate, and persistence tests**

Test that the schema accepts one-to-five topics plus enum sentiment and lead temperature, rejects invalid enums, the prompt includes all three rule sets, Growth/Business stale conversations are candidates, Starter and fresh conversations are excluded, and persistence stores sentiment plus the combined watermark while synchronizing topic-assignment sentiment.

- [ ] **Step 2: Run focused tests and verify RED**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsInsights.test.ts convex/analytics.test.ts` and confirm failures are caused by missing combined modules/fields.

- [ ] **Step 3: Implement the strict contract and record boundaries**

Use `z.object` with `topics`, `sentiment: z.enum(["positive", "neutral", "negative"])`, and `leadTemperature: z.enum(["hot", "warm", "cold"])`. Add `advancedAnalyticsAnalyzedAt` and `advancedAnalyticsSourceMessageMaxCreatedAt` to conversations. Select bounded recent non-playground Growth/Business conversations with customers, incoming history, and a stale combined watermark. Persist sentiment, both sentiment compatibility timestamps, combined timestamps, and assignment sentiment in the final mutation.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the same focused test command and require zero failures.

---

### Task 2: Replace separate cron actions with one model request

**Files:**
- Create: `convex/analyticsInsights.ts`
- Create: `convex/analyticsInsightsSource.test.ts`
- Modify: `convex/crons.ts`
- Delete: `convex/analyticsTopics.ts`
- Delete: `convex/analyticsSentiment.ts`
- Modify: `convex/posthogDanglingPromises.test.ts`

**Interfaces:**
- Consumes: Task 1 contract and record functions.
- Produces: `internal.analyticsInsights.runDailyAnalysis`.

- [ ] **Step 1: Write failing source contracts**

Assert there is one `generateObject` call, one combined schema, one `captureAIGeneration` span, strict `ADVANCED_ANALYTICS_CRON_UTC` parsing, one `crons.daily` entry, and no separate topic/sentiment cron entries.

- [ ] **Step 2: Run source tests and verify RED**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsInsightsSource.test.ts convex/posthogDanglingPromises.test.ts`.

- [ ] **Step 3: Implement the combined action**

For each candidate, load context, require an incoming message, make one `generateObject` call with the default analytics model and strict schema, capture usage, assign topics, set customer lead temperature, then call the final insight mutation. Log failures with conversation ID and continue without advancing the watermark.

- [ ] **Step 4: Replace the cron and remove obsolete actions**

Parse required `ADVANCED_ANALYTICS_CRON_UTC` in `HH:MM` UTC format, schedule `internal.analyticsInsights.runDailyAnalysis` with the parsed daily schedule, and delete the old action modules.

- [ ] **Step 5: Run source tests and verify GREEN**

Run the Task 2 focused command and require zero failures.

---

### Task 3: Update pricing and remove Qualify leads workflows

**Files:**
- Modify: `shared/planCatalog.ts`
- Modify: `shared/workflows.ts`
- Modify: `convex/workflowValidators.ts`
- Modify: `convex/chat/workflowPrompt.ts`
- Modify: `src/components/workflow/workflowCatalog.tsx`
- Modify: `src/components/workflow/workflowCatalog.test.tsx`
- Modify: `src/components/landing/landingWorkflowMockGraph.ts`
- Modify: `src/components/landing/landingAppPreviewData.ts`
- Modify: workflow and landing tests that reference `updateLeadsStatus`

**Interfaces:**
- Produces: Advanced Analytics hover list ending in `Lead Temperature`.
- Produces: workflow types and UI with no `updateLeadsStatus` kind.

- [ ] **Step 1: Write failing pricing and workflow absence assertions**

Assert the pricing include list equals Common Topic Detection, Customer Sentiment, Lead Temperature; workflow add options exclude `updateLeadsStatus`; and active shared/Convex/frontend source has no `updateLeadsStatus` or `Qualify leads` workflow reference.

- [ ] **Step 2: Run focused tests and verify RED**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowCatalog.test.tsx src/components/landing/landingAppPreviewData.test.ts convex/workflows.test.ts convex/workflowActions.test.ts`.

- [ ] **Step 3: Remove the node and update presentation**

Delete the workflow kind from shared arrays/meta, validators, icon catalog, and prompt. Replace workflow tests with supported nodes. Replace the landing qualification mock with a Send message example. Add Lead Temperature to `ADVANCED_ANALYTICS_INCLUDES`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Task 3 focused command and scan active source for forbidden workflow references.

---

### Task 4: Generate types and verify the complete change

**Files:**
- Modify: generated Convex API files through code generation when required
- Modify: `CONTINUITY.md`

- [ ] **Step 1: Generate Convex references**

Run the project-approved Node 22 Convex codegen command with mock Stripe price variables.

- [ ] **Step 2: Run complete targeted and static verification**

Run all Task 1–3 tests together, `bunx tsc -b --pretty false`, `git diff --check`, stale-reference scans, and line counts for every touched code file.

- [ ] **Step 3: Update continuity and inspect the final diff**

Record implementation and verification receipts in `CONTINUITY.md`; stage or commit only if the user requests publication.
