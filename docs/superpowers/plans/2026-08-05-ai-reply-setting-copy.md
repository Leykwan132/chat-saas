# AI Reply Setting Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the vague Agent Setup trigger wording with one clear question while retaining the existing reply-mode selector.

**Architecture:** This is a presentation-only change in the existing routing panel. The heading becomes `When should AI reply`; the nested `Reply mode` label is removed, leaving the selector and all routing behavior unchanged.

**Tech Stack:** React, TypeScript, Vitest.

## Global Constraints

- Keep routing behavior, permissions, loading states, and selector wiring unchanged.
- Run commands with Node.js 22.
- Preserve unrelated local changes.

---

### Task 1: Simplify the Agent Setup reply-setting copy

**Files:**
- Modify: `src/components/agent-setup/AgentSetupRoutingPanel.tsx`
- Modify: `src/components/landing/landingAppPreviewData.test.ts`

**Interfaces:**
- Consumes: existing `replyMode` and `onReplyModeChange` props.
- Produces: the same reply-mode selector under a single `When should AI reply` heading.

- [ ] **Step 1: Write the failing text regression**

Replace the existing `Triggers` assertion with:

```ts
expect(routingPanelSource).toContain('When should AI reply');
expect(routingPanelSource).not.toContain('Reply mode');
expect(routingPanelSource).not.toContain('Triggers');
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/landing/landingAppPreviewData.test.ts
```

Expected: FAIL because the routing panel still renders `Triggers` and `Reply mode`.

- [ ] **Step 3: Make the minimal panel change**

Use this heading and remove the `Field`/`FieldLabel` wrapper only:

```tsx
<h2 className="m-0 text-lg font-semibold tracking-tight text-foreground">
  When should AI reply
</h2>
<Select value={replyMode} onValueChange={(value) => onReplyModeChange(value as ReplyMode)}>
```

Keep the existing `Select`, option rendering, and disabled state unchanged.

- [ ] **Step 4: Run the focused test and build**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/landing/landingAppPreviewData.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
git diff --check
```

Expected: test and build PASS; whitespace check is clean.

- [ ] **Step 5: Commit the copy change**

```bash
git add src/components/agent-setup/AgentSetupRoutingPanel.tsx src/components/landing/landingAppPreviewData.test.ts
git commit -m "Clarify AI reply setting"
```
