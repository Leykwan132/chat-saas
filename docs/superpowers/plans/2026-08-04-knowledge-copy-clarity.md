# Knowledge Copy Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clarify that Knowledge Base content is for the agent and correct the Early Adopter form's use-case label.

**Architecture:** Update the two existing user-facing strings in their owning React components. Remove the stale Knowledge Base source-text assertion because human-facing prose has no runtime behavior worth asserting.

**Tech Stack:** React, TypeScript, Vitest.

## Global Constraints

- Use Node.js v22 for every script or test command.
- Keep the Knowledge Base message exactly `This is something that won’t be sent to the user.`
- Keep the Early Adopter form label as `What is your use case?`.
- Do not alter form validation or submission behavior.

---

### Task 1: Update and cover copy ownership

**Files:**
- Modify: `src/components/knowledge-base/KnowledgeBaseHeader.tsx:21`
- Modify: `src/components/knowledge-base/KnowledgeBaseHeader.test.ts:17-21`
- Modify: `src/components/early-adopter/EarlyAdopterApplicationForm.tsx:203`

**Interfaces:**
- Consumes: Existing `PageTitleBlock` `description` prop and static form JSX.
- Produces: The agent-only Knowledge Base helper text and the spaced Early Adopter use-case label.

- [ ] **Step 1: Update the component copy**

```tsx
description="This is something that won’t be sent to the user."
```

```tsx
What is your use case? <span className="text-red-500">*</span>
```

- [ ] **Step 2: Run the existing Knowledge Base header test**

Run: `nvm use 22 && bunx vitest run src/components/knowledge-base/KnowledgeBaseHeader.test.ts`

Expected: PASS with the structural Knowledge Base behavior intact.

- [ ] **Step 3: Check whitespace and commit**

Run: `git diff --check`

```bash
git add src/components/knowledge-base/KnowledgeBaseHeader.tsx src/components/knowledge-base/KnowledgeBaseHeader.test.ts src/components/early-adopter/EarlyAdopterApplicationForm.tsx docs/superpowers/plans/2026-08-04-knowledge-copy-clarity.md
git commit -m "Clarify knowledge and early adopter copy"
```
