# Knowledge Base Q&A Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Q&A form’s Add more control with reusable common-question preset buttons that prefill editable Q&A rows.

**Architecture:** Put the preset list and row-selection behavior in a small `qaQuestionPresets` module. `QASection` owns the draft state and calls the helper when a preset button is selected. The helper fills the first row that lacks a question, otherwise appends one new draft row. The existing save action continues to process completed pairs only.

**Tech Stack:** React, TypeScript, Vitest, shadcn/ui Button, Tailwind CSS.

## Global Constraints

- Use Node.js v22 for all scripts and tests.
- Reuse the project Button component with semantic variants and `gap-*` layout utilities.
- Keep Q&A persistence and processing behavior unchanged.
- Do not add code comments.

---

### Task 1: Add a focused Q&A preset interaction regression

**Files:**
- Create: `src/components/knowledge-base/qaQuestionPresets.ts`
- Create: `src/components/knowledge-base/qaQuestionPresets.test.ts`
- Create: `src/components/knowledge-base/QASection.test.tsx`
- Modify: `src/components/knowledge-base/QASection.tsx`

**Interfaces:**
- Consumes: `QASection` with its existing `entries`, `agentId`, `openDeleteDialog`, and `canManage` props.
- Produces: regression coverage for visible preset labels and first-blank-or-appended draft behavior.

- [x] **Step 1: Write the failing test**

```tsx
test('fills the first blank Q&A row from a common-question preset', () => {
  expect(addQAPreset([{ question: '', answer: '' }], 'What is your refund policy?')).toEqual([
    { question: 'What is your refund policy?', answer: '' },
  ]);
});

test('adds a Q&A row when every existing question is filled', () => {
  expect(addQAPreset([{ question: 'What are your opening hours?', answer: '' }], 'What is your refund policy?')).toEqual([
    { question: 'What are your opening hours?', answer: '' },
    { question: 'What is your refund policy?', answer: '' },
  ]);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/knowledge-base/qaQuestionPresets.test.ts`

Expected: FAIL because the preset-state helper is not implemented.

- [x] **Step 3: Write minimal implementation**

```tsx
export type QAPairDraft = { question: string; answer: string };

export const qaQuestionPresets = [
  { label: 'Refund policy', question: 'What is your refund policy?' },
  { label: 'Shipping & delivery', question: 'What are your shipping and delivery options?' },
  { label: 'Services', question: 'What services do you offer?' },
  { label: 'Payment methods', question: 'What payment methods do you accept?' },
  { label: 'Opening hours', question: 'What are your opening hours?' },
] as const;

export function addQAPreset(pairs: QAPairDraft[], question: string): QAPairDraft[] {
  const blankIndex = pairs.findIndex((pair) => !pair.question.trim());
  if (blankIndex === -1) return [...pairs, { question, answer: '' }];
  return pairs.map((pair, index) => index === blankIndex ? { ...pair, question } : pair);
}
```

Render the preset buttons above `QAEntry`. Remove `addQAPair` and the `Add more` Button. Each preset button updates draft state with `addQAPreset(pairs, preset.question)`.

- [x] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/knowledge-base/qaQuestionPresets.test.ts src/components/knowledge-base/QASection.test.tsx src/components/knowledge-base/QAEntry.test.tsx`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/components/knowledge-base/qaQuestionPresets.ts src/components/knowledge-base/qaQuestionPresets.test.ts src/components/knowledge-base/QASection.tsx src/components/knowledge-base/QASection.test.tsx
git commit -m "Add common Q&A presets"
```

### Task 2: Verify production integration

**Files:**
- Modify: `src/components/knowledge-base/QASection.tsx`
- Test: `src/components/knowledge-base/QASection.test.tsx`

**Interfaces:**
- Consumes: the preset controls and draft-row behavior from Task 1.
- Produces: a production-ready, type-safe Q&A editor with unchanged save behavior.

- [x] **Step 1: Write the failing test**

```tsx
test('renders common-question presets above the Q&A form', () => {
  const markup = renderToStaticMarkup(
    createElement(QASection, { entries: [], agentId: undefined, openDeleteDialog: () => undefined }),
  );

  expect(markup).toContain('Refund policy');
  expect(markup).toContain('Opening hours');
  expect(markup).not.toContain('Returns &amp; exchanges');
  expect(markup).not.toContain('Contact support');
  expect(markup.indexOf('Refund policy')).toBeLessThan(markup.indexOf('Add Q&amp;A'));
  expect(markup).not.toContain('Add more');
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/knowledge-base/QASection.test.tsx`

Expected: FAIL until the preset controls are rendered before the Q&A form and the retired action is removed.

- [x] **Step 3: Write minimal implementation**

Keep the Save Button and its disabled condition intact. Ensure the preset row is immediately before the `QAEntry` component, so it appears above the Add Q&A heading.

- [x] **Step 4: Run verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/knowledge-base/qaQuestionPresets.test.ts src/components/knowledge-base/QASection.test.tsx src/components/knowledge-base/QAEntry.test.tsx && bun run build && git diff --check`

Expected: focused tests, production build, and whitespace check PASS.

- [x] **Step 5: Commit**

```bash
git add src/components/knowledge-base/qaQuestionPresets.ts src/components/knowledge-base/qaQuestionPresets.test.ts src/components/knowledge-base/QASection.tsx src/components/knowledge-base/QASection.test.tsx
git commit -m "Verify Q&A preset picker"
```
