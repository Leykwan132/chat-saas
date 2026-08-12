# Compact Model Rating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the supplied compact rating reference by placing the decimal model score directly beside five small StickerStars.

**Architecture:** Change only the overall-rating presentation in `ModelScoreHoverCard`. Keep the existing scorecard data, StickerStar shape and colors, model metrics, language progress rows, and HoverCard behavior unchanged.

**Tech Stack:** React, TypeScript, `@smastrom/react-rating`, Tailwind CSS, Vitest

## Global Constraints

- Use Node.js v22 for every script and test command.
- Keep all code files below 300 lines and add no code comments.
- Preserve the read-only StickerStar style with active fill `#f59e0b` and inactive fill `#ffedd5`.
- Show no review count because the rating is Kilobot editorial data.
- Production availability remains unconfirmed, so do not update the public changelog.

---

### Task 1: Inline score and compact stars

**Files:**
- Modify: `src/components/ModelScoreHoverCard.test.tsx`
- Modify: `src/components/ModelScoreHoverCard.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `scorecard.overall: number` and the existing `modelRatingItemStyles` object.
- Produces: one flex row containing `scorecard.overall.toFixed(1)` followed by a read-only `Rating` with an 88px width.

- [x] **Step 1: Write the failing regression test**

Find the `Rating`, assert `style: { width: 88 }`, assert its parent is a flex row containing `4.0`, and assert the overall section does not render `4.0 / 5`.

```tsx
expect(rating?.props).toMatchObject({
  style: { width: 88 },
  value: 4,
  readOnly: true,
});
expect(ratingRow?.props.className).toContain('flex');
expect(collectText(ratingRow)).toContain('4.0');
expect(text).not.toContain('4.0 / 5');
```

- [x] **Step 2: Run the focused test to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ModelScoreHoverCard.test.tsx
```

Expected: FAIL because the rating still uses a 120px maximum width and displays `4.0 / 5` separately.

- [x] **Step 3: Implement the compact rating row**

Keep `Kilobot rating` as a small contextual label and replace the separated score and stars with:

```tsx
<div className="flex items-center gap-2">
  <span className="text-sm font-medium">{scorecard.overall.toFixed(1)}</span>
  <Rating
    style={{ width: 88 }}
    value={scorecard.overall}
    itemStyles={modelRatingItemStyles}
    readOnly
  />
</div>
```

- [x] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ModelScoreHoverCard.test.tsx src/config/modelScorecards.test.ts && bunx eslint src/components/ModelScoreHoverCard.tsx src/components/ModelScoreHoverCard.test.tsx && bun run build && git diff --check
```

Expected: tests, scoped ESLint, TypeScript, production build, and whitespace checks pass.

- [x] **Step 5: Record and commit**

Update `CONTINUITY.md`, mark this plan complete, and run:

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-08-12-compact-model-rating.md src/components/ModelScoreHoverCard.tsx src/components/ModelScoreHoverCard.test.tsx
git commit -m "Compact model rating display"
```
