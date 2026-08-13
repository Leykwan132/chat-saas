# Checked Model Language Pills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the scored Language fit section and show applicable languages as neutral green-check pills beneath Best for.

**Architecture:** Simplify scorecard language data from scored objects to recognized language-name strings. Render those names inside the existing Best for block, keeping the overall rating, metrics, HoverCard identity, and model-selection behavior unchanged.

**Tech Stack:** React, TypeScript, Lucide React, Tailwind CSS, Vitest

## Global Constraints

- Use Node.js v22 for every script and test command.
- Keep all code files below 300 lines and add no code comments.
- Use only `Malay`, `Chinese`, and `English` language names.
- Render each language with a green Lucide check on a neutral background; show no language score, strength label, progress bar, or `Language fit` heading.
- Production availability remains unconfirmed, so do not update the public changelog.

---

### Task 1: Simplify language data and presentation

**Files:**
- Modify: `src/config/modelScorecards.test.ts`
- Modify: `src/components/ModelScoreHoverCard.test.tsx`
- Modify: `src/config/modelScorecards.ts`
- Modify: `src/components/ModelScoreHoverCard.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Produces: `ModelLanguage = 'Malay' | 'Chinese' | 'English'` and `ModelScorecard.languages: ModelLanguage[]`.
- Produces: neutral `data-slot="model-language"` pills beneath `bestFor`, each containing a green Lucide `Check` and its language name.

- [x] **Step 1: Write the failing data and HoverCard tests**

Change scorecard expectations to language-name arrays:

```ts
expect(getModelScorecard('qwen/qwen3.7-flash')?.languages).toEqual([
  'Chinese',
  'English',
]);
```

Assert the real HoverCard output omits `Language fit` and progress bars, then assert two neutral language pills and two green checks appear after the Best for content:

```tsx
expect(text).not.toContain('Language fit');
expect(languageProgress).toHaveLength(0);
expect(languagePills).toHaveLength(2);
expect(languageChecks).toHaveLength(2);
expect(languagePills[0]?.props.className).toContain('bg-muted');
expect(languageChecks[0]?.props.className).toContain('text-emerald-600');
expect(text).toContain('Chinese');
expect(text).toContain('English');
```

- [x] **Step 2: Run focused tests to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/config/modelScorecards.test.ts src/components/ModelScoreHoverCard.test.tsx
```

Expected: FAIL because language data remains scored and the HoverCard still renders the Language fit progress section.

- [x] **Step 3: Simplify the scorecard language data**

Replace `ModelLanguageScore` with:

```ts
export type ModelLanguage = 'Malay' | 'Chinese' | 'English';
```

Convert every language record to its existing language name without changing which languages are associated with a model.

- [x] **Step 4: Render checked language pills under Best for**

Delete the Language fit block and extend the Best for block with:

```tsx
<div className="flex flex-wrap gap-1.5 pt-1">
  {scorecard.languages.map((language) => (
    <span
      key={language}
      data-slot="model-language"
      className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
    >
      <Check className="size-3.5 text-emerald-600" />
      {language}
    </span>
  ))}
</div>
```

- [x] **Step 5: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/config/modelScorecards.test.ts src/components/ModelScoreHoverCard.test.tsx && bunx eslint src/config/modelScorecards.ts src/config/modelScorecards.test.ts src/components/ModelScoreHoverCard.tsx src/components/ModelScoreHoverCard.test.tsx && bun run build && git diff --check
```

Expected: focused tests, scoped ESLint, TypeScript, production build, and whitespace checks pass.

- [x] **Step 6: Record and commit**

Update `CONTINUITY.md`, mark this plan complete, and run:

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-08-12-checked-model-language-pills.md src/config/modelScorecards.ts src/config/modelScorecards.test.ts src/components/ModelScoreHoverCard.tsx src/components/ModelScoreHoverCard.test.tsx
git commit -m "Simplify model language guidance"
```
