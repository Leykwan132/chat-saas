# AI Lead Temperature Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AI Lead Temperature a standalone Analytics pricing feature above Advanced Analytics and clarify both hover cards.

**Architecture:** `shared/planCatalog.ts` remains the single source of pricing labels, hover content, eligibility, and row order. The existing lead-temperature hover component consumes renamed catalog constants, while the Advanced Analytics hover reads the reduced included-feature list.

**Tech Stack:** TypeScript, React, Vitest

## Global Constraints

- Use Node.js 22 for every script and test.
- Code files must stay below 300 lines.
- Do not alter plan feature flags, AI processing, or lead-temperature data behavior.
- AI Lead Temperature remains enabled from Starter upward.
- Advanced Analytics remains enabled from Growth upward.

---

### Task 1: Update the pricing catalogue and hover contracts

**Files:**
- Modify: `shared/planCatalog.ts:393-480, 750-825`
- Modify: `convex/analyticsInsights.test.ts:1-65`

**Interfaces:**
- Produces: `AI_LEAD_TEMPERATURE_LABEL`, `AI_LEAD_TEMPERATURE_HOVER_TITLE`, and `AI_LEAD_TEMPERATURE_HOVER_DESCRIPTION`.
- Produces: `ADVANCED_ANALYTICS_INCLUDES` containing `Common Topic Detection` and `Customer Sentiment` only.
- Produces: `isAiLeadTemperatureLabel(label)` as the catalog predicate consumed by the existing hover renderer.

- [ ] **Step 1: Write the failing pricing-catalog test**

```ts
expect(ADVANCED_ANALYTICS_INCLUDES).toEqual([
  "Common Topic Detection",
  "Customer Sentiment",
]);
expect(getGroupedPlanComparisonRows().find((group) => group.title === "Analytics")?.rows)
  .toMatchObject([
    { label: "Basic Analytics" },
    { label: "Team analytics" },
    { label: "AI Lead Temperature" },
    { label: "Advanced Analytics" },
  ]);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsInsights.test.ts`

Expected: FAIL because Advanced Analytics still includes Lead Temperature and the comparison row still uses `Auto lead tagging` in the AI group.

- [ ] **Step 3: Implement the minimal catalogue change**

Rename the public lead-label and hover constants to `AI Lead Temperature`; set the requested hover sentence; remove `Lead Temperature` from `ADVANCED_ANALYTICS_INCLUDES`; and move the existing plan row specification into the Analytics group immediately before `Advanced Analytics`. Retain the existing `lead_tagging` feature-flag predicate and values.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsInsights.test.ts`

Expected: PASS with no failures.

### Task 2: Connect the renamed standalone hover and verify presentation contracts

**Files:**
- Modify: `src/components/pricing/PlanAutoLeadTaggingHoverHint.tsx:7-50`
- Create: `src/components/pricing/PlanAutoLeadTaggingHoverHint.test.tsx`

**Interfaces:**
- Consumes: the Task 1 `AI_LEAD_TEMPERATURE_*` constants and `isAutoLeadTaggingLabel` predicate.
- Produces: a hover trigger for `AI Lead Temperature` and no trigger for unrelated labels.

- [ ] **Step 1: Write the failing hover test**

```ts
const element = PlanAutoLeadTaggingHoverHint({
  label: "AI Lead Temperature",
});

expect(isValidElement(element) && element.type).toBe(HoverCard);
expect(collectReactText(element)).toContain(
  "AI analyzes customer conversations and classifies each lead as Hot, Warm, or Cold, helping your team prioritize follow-ups.",
);
expect(collectReactText(element)).toContain("Hot");
expect(collectReactText(element)).toContain("Warm");
expect(collectReactText(element)).toContain("Cold");
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/pricing/PlanAutoLeadTaggingHoverHint.test.tsx`

Expected: FAIL because the component does not recognize `AI Lead Temperature` and therefore renders only a plain span.

- [ ] **Step 3: Implement the minimal hover update**

Replace the component's old catalog constant imports and rendered identifiers with the Task 1 `AI_LEAD_TEMPERATURE_*` constants. Keep the existing Hot, Cold, and Warm list and hover interaction unchanged.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsInsights.test.ts src/components/pricing/PlanAutoLeadTaggingHoverHint.test.tsx`

Expected: PASS with no failures.

### Task 3: Verify and publish the focused feature branch

**Files:**
- Modify: `shared/planCatalog.ts:309-317`
- Create: `shared/planKeyFeatures.test.ts`

**Interfaces:**
- Consumes: `PLAN_CATALOG[planId].displayFeatures` and `AI_LEAD_TEMPERATURE_LABEL`.
- Produces: `getPlanKeyFeatures(planId)` lists that include AI Lead Temperature for every eligible self-serve plan and position it before Advanced Analytics.

- [ ] **Step 1: Write the failing compact-card feature test**

```ts
expect(getPlanKeyFeatures("free")).not.toContain(AI_LEAD_TEMPERATURE_LABEL);
expect(getPlanKeyFeatures("starter")).toContain(AI_LEAD_TEMPERATURE_LABEL);
expect(getPlanKeyFeatures("business")).toContain(AI_LEAD_TEMPERATURE_LABEL);

const growthFeatures = getPlanKeyFeatures("growth");
expect(growthFeatures.indexOf(AI_LEAD_TEMPERATURE_LABEL)).toBeLessThan(
  growthFeatures.indexOf(TOPIC_ANALYTICS_LABEL),
);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run shared/planKeyFeatures.test.ts`

Expected: FAIL because compact plan-card lists still omit AI Lead Temperature.

- [ ] **Step 3: Implement the shared compact-card list update**

Update `getPlanKeyFeatures` to add AI Lead Temperature when `lead_tagging` is enabled and it is not already present. Insert it immediately before Advanced Analytics when present; otherwise append it. Do not change `displayFeatures`, feature flags, plan-card components, or backend data.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run shared/planKeyFeatures.test.ts convex/analyticsInsights.test.ts src/components/pricing/PlanAutoLeadTaggingHoverHint.test.tsx`

Expected: PASS with no failures.

### Task 4: Verify and publish the focused feature branch

**Files:**
- Modify: `CONTINUITY.md`

- [ ] **Step 1: Run static and focused verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run shared/planKeyFeatures.test.ts convex/analyticsInsights.test.ts src/components/pricing/PlanAutoLeadTaggingHoverHint.test.tsx && bunx tsc --noEmit && git diff --check`

Expected: every command exits 0.

- [ ] **Step 2: Inspect scope and record continuity**

Confirm the diff contains only the pricing catalogue, pricing hover, focused tests, design/plan documentation, and continuity record. Record the isolated branch, unchanged entitlement decision, and verification receipt in `CONTINUITY.md`.

- [ ] **Step 3: Commit, push, and create a draft pull request**

Run: `git add shared/planCatalog.ts convex/analyticsInsights.test.ts src/components/pricing/PlanAutoLeadTaggingHoverHint.tsx src/components/pricing/PlanAutoLeadTaggingHoverHint.test.tsx docs/superpowers/specs/2026-08-14-ai-lead-temperature-pricing-design.md docs/superpowers/plans/2026-08-14-ai-lead-temperature-pricing.md CONTINUITY.md && git commit -m "feat: separate AI lead temperature pricing" && git push -u origin codex/ai-lead-temperature && gh pr create --draft --base main --head codex/ai-lead-temperature --title "feat: separate AI lead temperature pricing" --body "## Summary\n- present AI Lead Temperature as its own Analytics feature\n- clarify the dedicated hover content\n- keep Advanced Analytics focused on topics and sentiment\n\n## Testing\n- bunx vitest run convex/analyticsInsights.test.ts src/components/pricing/PlanAutoLeadTaggingHoverHint.test.tsx\n- bunx tsc --noEmit"`

Expected: a draft pull-request URL is returned and the worktree remains available for review feedback.
