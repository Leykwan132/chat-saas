# Agent Identity Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make required fields easier to scan and give the optional business-description textarea slightly more starting space.

**Architecture:** Keep the change inside the existing identity-step markup. Use the project’s destructive text token only for the visual required marker, preserving the current native and assistive required semantics. Increase the textarea’s initial row count without changing its data flow.

**Tech Stack:** React, TypeScript, Tailwind CSS utilities, Vitest, Node v22.

## Global Constraints

- Use Node v22 for every script and test command.
- Keep code modules at or below 300 lines.
- Required marker text uses `text-destructive`; its assistive text remains unchanged.
- Business description starts at exactly five rows.
- Do not alter validation, creation payloads, Convex code, prompts, or existing agents.

---

### Task 1: Polish the identity-step field affordances

**Files:**
- Modify: `src/components/create-agent/CreateAgentIdentityStep.tsx`
- Modify: `src/components/create-agent/CreateAgentSteps.test.tsx`

**Interfaces:**
- Consumes: the existing `FieldLabel` structure and `Textarea` props.
- Produces: red visual asterisks for the two required labels and a five-row business-description field.
- Preserves: required-input semantics, accessible `required` label text, validation, and controlled field callbacks.

- [ ] **Step 1: Write the failing rendered-step expectations**

Add static-markup assertions that require each `aria-hidden` asterisk to have the `text-destructive` class and the business-description textarea to render with `rows="5"`.

- [ ] **Step 2: Run the focused rendered-step test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/create-agent/CreateAgentSteps.test.tsx
```

Expected: FAIL because the asterisks have no destructive color class and the textarea has four rows.

- [ ] **Step 3: Implement the minimal markup change**

Use the following label marker in both required labels:

```tsx
<span aria-hidden="true" className="text-destructive">*</span>
```

Change the controlled business-description textarea to:

```tsx
rows={5}
```

- [ ] **Step 4: Run focused tests and quality checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/create-agent/CreateAgentSteps.test.tsx src/components/create-agent/createAgentWizardModel.test.ts && bunx eslint src/components/create-agent/CreateAgentIdentityStep.tsx src/components/create-agent/CreateAgentSteps.test.tsx && git diff --check && wc -l src/components/create-agent/CreateAgentIdentityStep.tsx
```

Expected: both test files pass, lint and whitespace checks pass, and the production component stays below 300 lines.

- [ ] **Step 5: Commit and push the existing PR branch**

```bash
git add src/components/create-agent/CreateAgentIdentityStep.tsx src/components/create-agent/CreateAgentSteps.test.tsx docs/superpowers/specs/2026-08-09-agent-creation-identity-validation-design.md docs/superpowers/plans/2026-08-09-agent-identity-visual-polish.md CONTINUITY.md
git commit -m "Polish agent identity fields"
git push origin codex/goal-based-agent-creation
```
