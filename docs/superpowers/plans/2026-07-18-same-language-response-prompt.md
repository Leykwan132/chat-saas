# Same-Language Response Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require every generated customer reply to use the exact same language as the user's prompt, demonstrated with Chinese and English examples.

**Architecture:** Extend the existing `chatResponseFormattingBlock`, which `convex/chat/threads.ts` already injects into every runtime agent instruction. Protect the prompt contract with a focused Vitest assertion and leave stored agent prompts, model selection, workflow execution, persistence, and response post-processing unchanged.

**Tech Stack:** TypeScript, Convex Agent runtime, Vitest, Bun, Node.js 22

## Global Constraints

- Use Node.js 22 for every script and test command.
- Add no dependencies.
- Keep every code file below 300 lines.
- Do not add comments.
- Preserve unrelated worktree changes.
- Use the exact approved same-language instruction and Chinese and English examples.
- Do not change stored agent prompts or deterministic response post-processing.

---

### Task 1: Add the global same-language prompt contract

**Files:**
- Modify: `convex/chat/responseFormatting.test.ts`
- Modify: `convex/chat/responseFormatting.ts`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `chatResponseFormattingBlock: string`, imported by `convex/chat/threads.ts`
- Produces: The same exported string with the approved language rule and examples appended to every runtime agent instruction

- [ ] **Step 1: Write the failing prompt-contract test**

Add this test to `convex/chat/responseFormatting.test.ts`:

```typescript
test("requires customer replies to match the user's language", () => {
  expect(chatResponseFormattingBlock).toContain(
    "IMPORTANT: You must always respond in the exact same language that the user uses in their prompt. Do not translate the user's input before answering.",
  );
  expect(chatResponseFormattingBlock).toContain(
    'User: "你好，请问你们今天营业吗？"',
  );
  expect(chatResponseFormattingBlock).toContain(
    'Assistant: "你好！我们今天营业。请问有什么可以帮助你？"',
  );
  expect(chatResponseFormattingBlock).toContain(
    'User: "Hello, are you open today?"',
  );
  expect(chatResponseFormattingBlock).toContain(
    'Assistant: "Hello! Yes, we are open today. How can I help you?"',
  );
});
```

- [ ] **Step 2: Run the focused test and verify the red state**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/chat/responseFormatting.test.ts
```

Expected: FAIL in `requires customer replies to match the user's language` because the exact instruction is absent from `chatResponseFormattingBlock`.

- [ ] **Step 3: Add the approved instruction and examples**

Extend the start of `chatResponseFormattingBlock` in `convex/chat/responseFormatting.ts` to exactly:

```typescript
export const chatResponseFormattingBlock = `\n\n## Response Formatting
IMPORTANT: You must always respond in the exact same language that the user uses in their prompt. Do not translate the user's input before answering.

Examples:
- User: "你好，请问你们今天营业吗？"
  Assistant: "你好！我们今天营业。请问有什么可以帮助你？"
- User: "Hello, are you open today?"
  Assistant: "Hello! Yes, we are open today. How can I help you?"

- For customer-facing emphasis, use exactly one asterisk at the start and one at the end, like *Luminar Residence*.
```

Keep the remaining existing response-formatting lines unchanged after the shown emphasis rule.

- [ ] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/chat/responseFormatting.test.ts
```

Expected: PASS for the complete `responseFormatting.test.ts` file.

Run:

```bash
git diff --check -- convex/chat/responseFormatting.ts convex/chat/responseFormatting.test.ts
wc -l convex/chat/responseFormatting.ts convex/chat/responseFormatting.test.ts
```

Expected: `git diff --check` emits no output and both code files are below 300 lines.

- [ ] **Step 5: Record the verified implementation**

Update `CONTINUITY.md` with these factual entries:

```markdown
# Snapshot
- 2026-07-18 [CODE] Every generated customer reply receives a global prompt rule requiring the exact same language as the user's prompt, reinforced by Chinese and English examples; stored agent prompts and response post-processing are unchanged.

# Done (recent)
- 2026-07-18 [CODE] Added and verified the global same-language response prompt contract with Chinese and English examples.

# Receipts
- 2026-07-18 [TOOL] The focused same-language response prompt contract test passed under Node.js 22; `git diff --check` and the code-file line-limit check passed.
```

Supersede the existing planned snapshot and working-set wording so the ledger records the implementation as complete without duplicating the same fact.

- [ ] **Step 6: Commit the implementation**

```bash
git add convex/chat/responseFormatting.ts convex/chat/responseFormatting.test.ts CONTINUITY.md
git commit -m "Require replies to match user language"
```
