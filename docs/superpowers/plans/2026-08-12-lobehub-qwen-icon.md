# LobeHub Qwen Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Qwen’s local SVG model-picker logo with LobeHub’s colored Qwen React icon everywhere the shared selector logo renders.

**Architecture:** `ModelSelectorLogo` remains the single logo boundary used by both the selected-model trigger and model rows. It renders `Qwen.Color` for the `qwen` provider slug and preserves the existing image/custom-source behavior for every other provider. Convex pricing no longer transports a Qwen-specific image URL.

**Tech Stack:** React 19, TypeScript, `@lobehub/icons` 5.10.0, Vitest, React DOM server rendering, Convex, Node.js 22, Bun.

## Global Constraints

- Keep source files below 300 lines and avoid code comments.
- Use `Qwen.Color` from `@lobehub/icons` for the `qwen` provider slug.
- Preserve custom `imageUrl` and models.dev fallback behavior for all non-Qwen providers.
- Preserve the Qwen model ID, provider, chef, and chef slug.
- Remove `public/model-logos/qwen.svg` and Qwen’s catalog `imageUrl`.
- Preserve the unrelated `pricing-knowledge-base-updated.md` working-tree file.
- Do not update the production changelog until availability is confirmed.

---

### Task 1: Render Qwen through the shared LobeHub icon path

**Files:**
- Rename: `src/components/ai-elements/modelSelectorLogo.test.ts` to `src/components/ai-elements/modelSelectorLogo.test.tsx`
- Modify: `src/components/ai-elements/model-selector.tsx`
- Modify: `convex/llm/modelPricing.test.ts`
- Modify: `convex/llm/modelPricing.ts`
- Delete: `public/model-logos/qwen.svg`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `ModelSelectorLogo({ provider: string, src?: string, className?: string })` and `Qwen.Color` from `@lobehub/icons`.
- Produces: a Qwen-specific SVG branch inside `ModelSelectorLogo`; non-Qwen providers continue returning an `<img>` resolved by `getModelSelectorLogoSource`.

- [x] **Step 1: Write the failing rendered-logo regression**

Rename the test to TSX, import `renderToStaticMarkup` and `ModelSelectorLogo`, and add this behavior test:

```tsx
test('renders the colored LobeHub Qwen icon for the qwen provider', () => {
  const markup = renderToStaticMarkup(<ModelSelectorLogo provider="qwen" />);

  expect(markup).toContain('<title>Qwen</title>');
  expect(markup).not.toContain('<img');
});
```

Keep the existing literal tests for custom source and models.dev fallback resolution. This catches replacing the shared Qwen branch with the generic image path.

- [x] **Step 2: Lock Qwen’s catalog boundary**

Change the existing Qwen pricing assertion to:

```ts
expect(model).not.toHaveProperty('imageUrl');
expect(model?.chefSlug).toBe('qwen');
```

This catches accidentally restoring a Qwen-only asset transport while preserving the provider key used by the shared renderer.

- [x] **Step 3: Run the focused tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ai-elements/modelSelectorLogo.test.tsx convex/llm/modelPricing.test.ts
```

Expected: the rendered-logo test fails because Qwen still produces an `<img>`, and the pricing test fails because Qwen still has `/model-logos/qwen.svg`.

- [x] **Step 4: Add the minimal shared Qwen rendering branch**

Import the color-only Qwen component subpath and render it before the existing image branch. The package root and compounded Qwen entry import unrelated `@lobehub/ui` feature modules, while this subpath contains only the requested icon:

```tsx
import QwenColor from '@lobehub/icons/es/Qwen/components/Color';

if (provider === 'qwen') {
  return (
    <QwenColor
      aria-label="Qwen logo"
      className={cn('size-3', className)}
      size={12}
    />
  );
}
```

Keep the existing `<img>` implementation unchanged for every other provider. The existing `className="size-4"` calls continue overriding visual size through the shared class name while the SVG retains a 12px default.

- [x] **Step 5: Remove the obsolete asset transport**

Delete Qwen’s `imageUrl` property from `convex/llm/modelPricing.ts` and delete `public/model-logos/qwen.svg`. Keep `chefSlug: "qwen"` unchanged so both picker surfaces select the LobeHub branch.

- [x] **Step 6: Run focused tests and verify GREEN**

Run the Step 3 command and expect all focused tests to pass.

- [x] **Step 7: Run scoped verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/ai-elements/model-selector.tsx src/components/ai-elements/modelSelectorLogo.test.tsx convex/llm/modelPricing.ts convex/llm/modelPricing.test.ts && bun run build && git diff --check
```

Expected: ESLint, TypeScript/Vite production build, and whitespace validation all exit successfully.

- [x] **Step 8: Update continuity and commit**

Record the LobeHub Qwen renderer, removed local asset, focused test count, lint/build evidence, unchanged changelog state, and untouched unrelated pricing note. Stage only the planned files and commit:

```bash
git add CONTINUITY.md convex/llm/modelPricing.ts convex/llm/modelPricing.test.ts public/model-logos/qwen.svg src/components/ai-elements/model-selector.tsx src/components/ai-elements/modelSelectorLogo.test.ts src/components/ai-elements/modelSelectorLogo.test.tsx
git commit -m "Use LobeHub Qwen icon"
```
