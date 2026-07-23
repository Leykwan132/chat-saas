# Avatar Embed Panel Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the Avatar preview and embed headings by removing the embed panel's outer card chrome.

**Architecture:** Keep the existing responsive grid and `AvatarEmbedCard` component boundary. Change only the embed component's outer section classes, preserving its content, code surface, clipboard behavior, and mobile stacking.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, Bun

## Global Constraints

- The embed section retains `flex min-w-0 flex-col gap-4`.
- The embed section does not use `rounded-xl`, `border`, `bg-card`, or `p-5`.
- The heading, description, code surface, and `Copy code` button remain unchanged.
- Node.js v22 must be selected in every script or test command.
- No code file may exceed 300 lines.
- Do not add comments unless the code cannot be made self-explanatory.

---

### Task 1: Remove the Embed Panel Outer Chrome

**Files:**
- Modify: `src/components/avatar/AvatarEmbedCard.test.ts`
- Modify: `src/components/avatar/AvatarEmbedCard.tsx`

**Interfaces:**
- Consumes: the existing `AvatarEmbedCard({ publicKey }: { publicKey: string })` contract.
- Produces: the same component contract with a borderless, top-aligned outer section.

- [ ] **Step 1: Write the failing alignment contract**

Add this test to `src/components/avatar/AvatarEmbedCard.test.ts`:

```ts
it('aligns with the preview through a borderless outer section', () => {
  expect(cardSource).toContain(
    '<section className="flex min-w-0 flex-col gap-4">',
  );
  expect(cardSource).not.toContain('rounded-xl border bg-card p-5');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/avatar/AvatarEmbedCard.test.ts
```

Expected: FAIL because the section still uses `rounded-xl border bg-card p-5`.

- [ ] **Step 3: Remove the embed panel outer chrome**

In `src/components/avatar/AvatarEmbedCard.tsx`, replace:

```tsx
<section className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5">
```

with:

```tsx
<section className="flex min-w-0 flex-col gap-4">
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/avatar/AvatarEmbedCard.test.ts src/pages/AvatarPage.test.ts
```

Expected: Both test files pass.

- [ ] **Step 5: Run scoped quality checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/avatar/AvatarEmbedCard.tsx src/components/avatar/AvatarEmbedCard.test.ts
git diff --check
wc -l src/components/avatar/AvatarEmbedCard.tsx src/components/avatar/AvatarEmbedCard.test.ts
```

Expected: Exit 0 and both code files remain at or below 300 lines.

- [ ] **Step 6: Commit the alignment refinement**

```bash
git add src/components/avatar/AvatarEmbedCard.tsx src/components/avatar/AvatarEmbedCard.test.ts
git commit -m "Align Avatar embed panel with preview"
```
