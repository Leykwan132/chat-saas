# Workflow Follow-up Legacy Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Workflow Follow-up the only follow-up configuration and execution system and permanently remove the legacy rule/send engine.

**Architecture:** Use a two-deployment Convex retirement. Deployment A removes all legacy entry points while retaining the permissive schema and exposes batched destructive migrations; after dry-run, cleanup, and zero-state verification, Deployment B removes the tables, fields, modules, component, and temporary migration code.

**Tech Stack:** React 19, React Router, TypeScript, Convex, `@convex-dev/migrations`, `@convex-dev/workpool`, Vitest, Bun, Node.js 22.

## Global Constraints

- Run every script and test under Node.js 22 by invoking `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- Read `convex/_generated/ai/guidelines.md` before changing Convex code.
- Keep every code file at or below 300 lines.
- Do not add runtime fallbacks to `followUpRules`, `followUpSends`, or legacy customer fields.
- Do not preserve or translate legacy rules or legacy send history.
- Preserve Workflow timers, runs, operations, messages, history, and costs.
- Use `apply_patch` for source edits and preserve unrelated working-tree changes.

---

### Task 1: Lock the retirement behavior with failing source-boundary tests

**Files:**
- Create: `src/legacyFollowUpRetirement.test.ts`
- Create: `convex/legacyFollowUpRetirement.test.ts`

**Interfaces:**
- Consumes: current source tree and route definitions.
- Produces: regression boundaries that require Workflow redirects and prohibit the legacy runtime after final narrowing.

- [ ] **Step 1: Write the frontend failing test**

Create a source test that reads `src/main.tsx`, `ConversationWindowBanner.tsx`, `WorkflowFollowupCostCalculatorDialog.tsx`, and `WorkflowFollowupGuides.tsx`. Assert that the three `follow-ups` routes render `FollowUpRedirect`, the redirect targets `/dashboard/${agentId}/workflow`, the three legacy page imports are absent, and all three user entry links contain `/workflow` rather than `/follow-ups`.

- [ ] **Step 2: Write the backend failing test**

Create a source test that reads `convex/crons.ts`, `convex/schema.ts`, and `convex/convex.config.ts`, and scans production Convex TypeScript files. Assert that the final source has no legacy cron, tables, customer fields, component, or modules while explicitly excluding the retirement test itself from the scan.

- [ ] **Step 3: Run the tests and verify failure**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/legacyFollowUpRetirement.test.ts convex/legacyFollowUpRetirement.test.ts
```

Expected: FAIL because legacy routes, links, cron, tables, fields, component, and modules still exist.

---

### Task 2: Remove legacy frontend entry points

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/components/inbox/ConversationWindowBanner.tsx`
- Modify: `src/components/workflow/WorkflowFollowupCostCalculatorDialog.tsx`
- Modify: `src/components/workflow/WorkflowFollowupGuides.tsx`
- Modify: `src/pages/pageHeaderChrome.test.ts`
- Modify: `src/components/templates/localWhatsappTemplateConsumers.test.ts`
- Delete: `src/pages/AutomationsFollowUpPage.tsx`
- Delete: `src/pages/FollowUpPage.tsx`
- Delete: `src/pages/FollowUpDetailPage.tsx`
- Delete: `src/pages/AutomationsFollowUpActivation.test.ts`
- Delete: `src/pages/FollowUpDetailActivation.test.ts`

**Interfaces:**
- Consumes: `agentId` route parameter.
- Produces: `FollowUpRedirect(): JSX.Element`, which redirects every legacy path to `/dashboard/:agentId/workflow`.

- [ ] **Step 1: Add the redirect component**

Add beside the other redirect helpers:

```tsx
function FollowUpRedirect() {
  const { agentId } = useParams()
  return <Navigate to={`/dashboard/${agentId}/workflow`} replace />
}
```

- [ ] **Step 2: Replace the three route elements and imports**

Remove the legacy page imports and render `<FollowUpRedirect />` for `follow-ups`, `follow-ups/new`, and `follow-ups/:ruleId`.

- [ ] **Step 3: Retarget every known entry link**

Change the Inbox banner, Workflow guide CTA, and calculator CTA to `/dashboard/${agentId}/workflow`. Keep existing dialog-close behavior.

- [ ] **Step 4: Delete the standalone pages and update fixture lists**

Remove the pages and their dedicated tests. Remove their filenames from page-header and local-template consumer fixture arrays.

- [ ] **Step 5: Run the frontend retirement test**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/legacyFollowUpRetirement.test.ts src/pages/pageHeaderChrome.test.ts src/components/templates/localWhatsappTemplateConsumers.test.ts
```

Expected: PASS for frontend retirement and adjusted fixture coverage.

- [ ] **Step 6: Commit the frontend checkpoint**

Stage only Task 1 frontend test and Task 2 files, then commit with `Retire standalone follow-up pages`.

---

### Task 3: Build and verify the destructive cleanup migration

**Files:**
- Create temporarily: `convex/legacyFollowUpRetirementMigration.ts`
- Create temporarily: `convex/legacyFollowUpRetirementMigration.test.ts`
- Modify: `convex/crons.ts`
- Delete: `convex/whatsappFollowUp.ts`
- Delete: `convex/followUpPool.ts`
- Delete: `convex/followUpQueries.ts`
- Delete: `convex/whatsappFollowUp.test.ts`
- Delete: `convex/whatsappFollowUpActivation.test.ts`

**Interfaces:**
- Produces: `clearLegacyFollowUpCustomerPatch(customer): LegacyFollowUpCustomerPatch | undefined`.
- Produces temporarily: `deleteLegacyFollowUpSends`, `clearLegacyFollowUpCustomerFields`, `deleteLegacyFollowUpRules`, and ordered `runLegacyFollowUpRetirement` migration functions.
- Produces temporarily: `verifyLegacyFollowUpRetirement` internal query returning bounded samples and `complete`.

- [ ] **Step 1: Write failing cleanup-helper tests**

Test that a customer carrying any legacy field receives this exact patch and a clean customer returns `undefined`:

```ts
{
  followUpPending: undefined,
  followUpAttempt: undefined,
  followUpPendingRuleId: undefined,
  followUpScheduledAt: undefined,
}
```

- [ ] **Step 2: Implement the migration module**

Use `Migrations<DataModel>(components.migrations)` with batches of 25. Delete send documents with `ctx.db.delete(send._id)`, patch customers only when any legacy field is defined, then delete rule documents. Expose one ordered runner:

```ts
export const runLegacyFollowUpRetirement = migrations.runner([
  internal.legacyFollowUpRetirementMigration.deleteLegacyFollowUpSends,
  internal.legacyFollowUpRetirementMigration.clearLegacyFollowUpCustomerFields,
  internal.legacyFollowUpRetirementMigration.deleteLegacyFollowUpRules,
]);
```

The internal verification query must use bounded `.take(1)` checks for both tables and iterate over customers only until one legacy field is found. It returns `{ complete, sendsRemaining, rulesRemaining, customersRemaining }` as booleans, never unbounded counts.

- [ ] **Step 3: Disable and remove the legacy runtime**

Remove the daily cron registration and delete the legacy Convex modules and their tests. Keep the legacy schema and `followUpWorkpool` component for Deployment A only.

- [ ] **Step 4: Run focused tests and Convex type checking**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/legacyFollowUpRetirementMigration.test.ts convex/legacyFollowUpRetirement.test.ts && bunx tsc -p convex/tsconfig.json --noEmit
```

Expected: migration helper tests PASS; the backend final-boundary test still fails only on intentionally retained Deployment A schema/component/migration references.

- [ ] **Step 5: Deploy Deployment A to development**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex dev --once
```

Expected: functions push successfully while the legacy tables and component remain mounted.

- [ ] **Step 6: Dry-run and execute cleanup in development**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex run legacyFollowUpRetirementMigration:runLegacyFollowUpRetirement '{"dryRun":true}'
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex run legacyFollowUpRetirementMigration:runLegacyFollowUpRetirement
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex run legacyFollowUpRetirementMigration:verifyLegacyFollowUpRetirement
```

Expected: the dry run reports the affected legacy data, the live run completes, and verification returns `complete: true` with every remaining flag false.

---

### Task 4: Narrow the Convex schema and delete temporary compatibility

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/convex.config.ts`
- Delete: `convex/legacyFollowUpRetirementMigration.ts`
- Delete: `convex/legacyFollowUpRetirementMigration.test.ts`
- Modify: `convex/legacyFollowUpRetirement.test.ts`

**Interfaces:**
- Consumes: successful Task 3 verification for the target deployment.
- Produces: final DataModel without legacy tables, fields, functions, or component.

- [ ] **Step 1: Remove the schema definitions**

Delete `followUpRules`, `followUpSends`, and these customer fields:

```ts
followUpPending
followUpAttempt
followUpPendingRuleId
followUpScheduledAt
```

- [ ] **Step 2: Remove the legacy Workpool component**

Delete only:

```ts
app.use(workpool, { name: "followUpWorkpool" });
```

Keep `workflowFollowUpWorkpool` unchanged.

- [ ] **Step 3: Remove the temporary migration module and test**

Delete them only after development verification has passed. Adjust the permanent retirement source test so it excludes documentation and generated files but scans every production Convex module.

- [ ] **Step 4: Regenerate Convex types**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen
```

Expected: generated DataModel and API contain no legacy table or function references.

- [ ] **Step 5: Run the permanent retirement tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/legacyFollowUpRetirement.test.ts convex/legacyFollowUpRetirement.test.ts convex/workflowAutomationConfig.test.ts convex/workflowFollowUpTimer.test.ts
```

Expected: PASS.

- [ ] **Step 6: Deploy Deployment B to development**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex dev --once
```

Expected: narrowed schema and component configuration deploy successfully.

---

### Task 5: Verify Workflow-only behavior and the complete repository

**Files:**
- Modify if necessary: existing Workflow tests only when an assertion must reflect the authoritative configuration behavior.
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: final narrowed implementation.
- Produces: evidence that Workflow Follow-up is the only live system.

- [ ] **Step 1: Scan production source for legacy identifiers**

Run:

```bash
rg -n "followUpRules|followUpSends|followUpPending|followUpAttempt|followUpPendingRuleId|followUpScheduledAt|followUpWorkpool|whatsappFollowUp|followUpQueries" convex src shared --glob '!**/*.test.*' --glob '!convex/_generated/**'
```

Expected: no matches. `workflowFollowUpWorkpool` is not matched because its capitalization differs.

- [ ] **Step 2: Run targeted lint and touched-file checks**

Run Node 22 ESLint over the modified retained source files, `git diff --check`, and verify every retained code file is at most 300 lines.

- [ ] **Step 3: Run the full verification suite**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && STRIPE_PRICE_STARTER_MONTHLY=mock_starter_monthly STRIPE_PRICE_STARTER_ANNUAL=mock_starter_annual STRIPE_PRICE_GROWTH_MONTHLY=mock_growth_monthly STRIPE_PRICE_GROWTH_ANNUAL=mock_growth_annual STRIPE_PRICE_BUSINESS_MONTHLY=mock_business_monthly STRIPE_PRICE_BUSINESS_ANNUAL=mock_business_annual STRIPE_PRICE_EXTRA_CREDITS_2000=mock_extra_2000 STRIPE_PRICE_EXTRA_CREDITS_5000=mock_extra_5000 STRIPE_PRICE_EXTRA_CREDITS_15000=mock_extra_15000 bunx vitest run
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -p convex/tsconfig.json --noEmit
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected: every test file passes, Convex TypeScript passes, and the production build succeeds.

- [ ] **Step 4: Update the continuity ledger**

Record the two development deployments, destructive cleanup result, final source-of-truth decision, retained Workflow operational data, and exact verification outcomes.

- [ ] **Step 5: Review the final diff**

Confirm that unrelated existing changes remain intact, only intended legacy files are deleted, the earlier Workflow schedule-save fix is preserved, and no production deployment was attempted.

## Production Rollout Gate

Production is intentionally not narrowed by this local implementation. Before a production Deployment B, repeat Deployment A, migration dry run, destructive cleanup, zero-state verification, and legacy Workpool inactivity verification against production. Only then deploy the narrowed schema and remove the legacy component in production.
