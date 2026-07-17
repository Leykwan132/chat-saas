# Workflow Media Filename Prompt Privacy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent workflow media filenames from appearing in customer-visible reply prompts while preserving media matching and delivery.

**Architecture:** Keep filenames in the internal workflow context used to identify assets, but remove them from the prompt that directly guides the final customer reply. Add explicit filename-disclosure prohibitions to the planner, final-reply guidance, and general workflow runtime prompt.

**Tech Stack:** TypeScript, Convex, Vitest

## Global Constraints

- Node.js v22 is required for every script and test command.
- Enforcement is prompt-only; do not add sanitization or output rewriting.
- Media matching, structured action planning, and media delivery remain unchanged.
- Code files must remain under 300 lines.
- Do not add code comments.

---

### Task 1: Make workflow media reply prompts filename-private

**Files:**
- Modify: `convex/chat/workflowActionPlanner.test.ts`
- Modify: `convex/chat/workflowPrompt.test.ts`
- Modify: `convex/chat/workflowActionPlanner.ts`
- Modify: `convex/chat/workflowPrompt.ts`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `buildWorkflowActionPlannerSystemPrompt(context)`, `buildWorkflowActionPlanReplyGuidance(plan, context)`, and `buildWorkflowRuntimeBlock(context)`.
- Produces: Filename-free final reply guidance and explicit prompt contracts prohibiting uploaded filenames in customer-visible content.

- [ ] **Step 1: Write failing prompt contract tests**

Update the planner prompt test:

```ts
expect(prompt).toContain(
  "responseGuidance must never include uploaded filenames",
);
```

Update the final reply guidance test:

```ts
expect(guidance).not.toContain("Arden Heights Type B.mp4");
expect(guidance).toContain("Send Type B video (video/mp4)");
expect(guidance).toContain(
  "Never mention uploaded filenames in customer-visible content",
);
```

Update the workflow runtime media test:

```ts
expect(block).toContain(
  "uploaded filenames are internal metadata",
);
```

- [ ] **Step 2: Run the focused tests and confirm the expected failures**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/chat/workflowActionPlanner.test.ts convex/chat/workflowPrompt.test.ts
```

Expected: the new filename-privacy assertions fail because final guidance still contains `Arden Heights Type B.mp4` and the prompt rules do not yet ban filenames explicitly.

- [ ] **Step 3: Remove filenames from final reply guidance and strengthen prompt contracts**

In `workflowActionPlanSchema`, change the `responseGuidance` description to:

```ts
"A short instruction for the later customer-visible reply, without URLs, uploaded filenames, or internal metadata."
```

In `buildWorkflowActionPlanReplyGuidance`, format selected assets without their filenames:

```ts
const selectedList = matchedMediaNodes.map(
  (node) => `  - ${node.title} (${node.mediaAssets.map((asset) => asset.mediaType).join(", ")})`,
);
```

Add this final-reply rule:

```ts
"- Never mention uploaded filenames in customer-visible content, including parenthetical status text, markdown, captions, or attachment descriptions.",
```

Add this action-planner rule:

```ts
"- responseGuidance must never include uploaded filenames or instruct the later reply to display them.",
```

In `buildWorkflowRuntimeBlock`, extend the existing metadata rule:

```ts
4. Do not paste workflow metadata, media URLs, media client IDs, uploaded filenames, or internal action notes into the customer response. Uploaded filenames are internal metadata.
```

- [ ] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/chat/workflowActionPlanner.test.ts convex/chat/workflowPrompt.test.ts convex/chat/workflowPromptMediaActions.test.ts convex/chat/responseFormatting.test.ts
```

Expected: all focused prompt tests pass.

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/chat/workflowActionPlanner.ts convex/chat/workflowActionPlanner.test.ts convex/chat/workflowPrompt.ts convex/chat/workflowPrompt.test.ts
```

Expected: ESLint exits successfully with no warnings or errors.

Run:

```bash
wc -l convex/chat/workflowActionPlanner.ts convex/chat/workflowPrompt.ts
git diff --check -- convex/chat/workflowActionPlanner.ts convex/chat/workflowActionPlanner.test.ts convex/chat/workflowPrompt.ts convex/chat/workflowPrompt.test.ts CONTINUITY.md
```

Expected: both production code files remain under 300 lines and the scoped diff check exits successfully.

- [ ] **Step 5: Record the completed behavior**

Update `CONTINUITY.md` with the verified prompt-only filename-privacy behavior, working files, and test receipts while preserving its section caps.

- [ ] **Step 6: Commit the implementation**

```bash
git add CONTINUITY.md convex/chat/workflowActionPlanner.ts convex/chat/workflowActionPlanner.test.ts convex/chat/workflowPrompt.ts convex/chat/workflowPrompt.test.ts docs/superpowers/plans/2026-07-17-workflow-media-filename-prompt-privacy.md
git commit -m "Hide workflow media filenames from reply prompts"
```
