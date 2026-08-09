# Agent Goal Card Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the agent-goal cards more breathing room, smaller corners, and a clear dark selected outline.

**Architecture:** Override only the card layout classes passed to the existing shared ToggleGroup and ToggleGroupItem primitives. Preserve all selection values and responsive behavior while adding static-render coverage for the visual class contract.

**Tech Stack:** React, TypeScript, Tailwind CSS utilities, Vitest, Node v22.

## Global Constraints

- Use Node v22 for every script and test command.
- Keep code modules at or below 300 lines.
- Card group spacing is 16px through `spacing={4}`.
- Cards use `rounded-2xl`, `min-h-40`, `p-5`, and 16px internal content spacing.
- Selected cards retain `bg-muted` and add `border-foreground`, `ring-1`, and `ring-foreground/20`.
- Do not alter goal labels, values, creation behavior, shared toggle primitives, or mobile stacking.

---

### Task 1: Refine the goal-card presentation

**Files:**
- Modify: `src/components/create-agent/CreateAgentGoalStep.tsx`
- Modify: `src/components/create-agent/CreateAgentSteps.test.tsx`

**Interfaces:**
- Consumes: `ToggleGroup` spacing prop and `ToggleGroupItem` Tailwind class overrides.
- Produces: spacious `rounded-2xl` goal cards with a dark-outline selected state.
- Preserves: `AgentGoal` selection, `aria-labelledby`, `aria-describedby`, and the one-column-to-two-column responsive grid.

- [ ] **Step 1: Write a failing goal-step markup test**

Extend the existing goal-step test to assert that static markup includes `data-spacing="4"`, `rounded-2xl`, `min-h-40`, `p-5`, `gap-4`, `data-[state=on]:border-foreground`, and `data-[state=on]:ring-foreground/20`.

- [ ] **Step 2: Run the focused goal-step test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/create-agent/CreateAgentSteps.test.tsx
```

Expected: FAIL because the goal cards still use their inherited `rounded-3xl`, 8px group gap, 16px padding, and muted-only selected state.

- [ ] **Step 3: Apply the card class overrides**

Update the group and item JSX to include:

```tsx
<ToggleGroup spacing={4} className="grid w-full grid-cols-1 sm:grid-cols-2">
  <ToggleGroupItem className="min-h-40 h-auto items-start justify-start rounded-2xl border-input p-5 text-left whitespace-normal data-[state=on]:border-foreground data-[state=on]:ring-1 data-[state=on]:ring-foreground/20">
    <span className="flex flex-col items-start gap-4">
```

- [ ] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/create-agent/CreateAgentSteps.test.tsx src/components/create-agent/createAgentWizardModel.test.ts && bunx eslint src/components/create-agent/CreateAgentGoalStep.tsx src/components/create-agent/CreateAgentSteps.test.tsx && git diff --check && wc -l src/components/create-agent/CreateAgentGoalStep.tsx
```

Expected: both focused test files pass, lint and whitespace checks pass, and the goal-step component is below 300 lines.

- [ ] **Step 5: Commit and push the existing PR branch**

```bash
git add src/components/create-agent/CreateAgentGoalStep.tsx src/components/create-agent/CreateAgentSteps.test.tsx docs/superpowers/specs/2026-08-09-agent-goal-card-layout-design.md docs/superpowers/plans/2026-08-09-agent-goal-card-layout.md CONTINUITY.md
git commit -m "Refine agent goal cards"
git push origin codex/goal-based-agent-creation
```
