# Knowledge Base Q&A Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Q&A form’s Add more control with reusable common-question preset buttons that prefill editable Q&A rows.

**Architecture:** Keep the preset list and row-selection behavior inside `QASection`, which already owns the draft Q&A state. Preset selection fills the first row that lacks a question, otherwise appends one new draft row. The existing save action continues to process completed pairs only.

**Tech Stack:** React, TypeScript, Vitest, shadcn/ui Button, Tailwind CSS.

## Global Constraints

- Use Node.js v22 for all scripts and tests.
- Reuse the project Button component with semantic variants and `gap-*` layout utilities.
- Keep Q&A persistence and processing behavior unchanged.
- Do not add code comments.

---

### Task 1: Add a focused Q&A preset interaction regression

**Files:**
- Create: `src/components/knowledge-base/QASection.test.tsx`
- Modify: `src/components/knowledge-base/QASection.tsx`

**Interfaces:**
- Consumes: `QASection` with its existing `entries`, `agentId`, `openDeleteDialog`, and `canManage` props.
- Produces: regression coverage for visible preset labels and first-blank-or-appended draft behavior.

- [ ] **Step 1: Write the failing test**

```tsx
test('prefills a blank Q&A row from a common-question preset', async () => {
  render(<QASection entries={[]} agentId={undefined} openDeleteDialog={vi.fn()} />);

  await userEvent.click(screen.getByRole('button', { name: 'Refund policy' }));

  expect(screen.getByPlaceholderText('Enter question')).toHaveValue('What is your refund policy?');
});

test('adds a Q&A row when every existing question is filled', async () => {
  render(<QASection entries={[]} agentId={undefined} openDeleteDialog={vi.fn()} />);

  await userEvent.type(screen.getByPlaceholderText('Enter question'), 'What are your opening hours?');
  await userEvent.click(screen.getByRole('button', { name: 'Refund policy' }));

  expect(screen.getAllByPlaceholderText('Enter question')).toHaveLength(2);
  expect(screen.getAllByPlaceholderText('Enter question')[1]).toHaveValue('What is your refund policy?');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/knowledge-base/QASection.test.tsx`

Expected: FAIL because the common-question buttons are not rendered.

- [ ] **Step 3: Write minimal implementation**

```tsx
const qaQuestionPresets = [
  { label: 'Refund policy', question: 'What is your refund policy?' },
  { label: 'Shipping & delivery', question: 'What are your shipping and delivery options?' },
  { label: 'Returns & exchanges', question: 'What is your returns and exchanges policy?' },
  { label: 'Pricing', question: 'How much does it cost?' },
  { label: 'Payment methods', question: 'What payment methods do you accept?' },
  { label: 'Opening hours', question: 'What are your opening hours?' },
  { label: 'Contact support', question: 'How can I contact support?' },
] as const;

const selectQAPreset = (question: string) => {
  setQAPairs((pairs) => {
    const blankIndex = pairs.findIndex((pair) => !pair.question.trim());
    if (blankIndex === -1) return [...pairs, { question, answer: '' }];
    return pairs.map((pair, index) => index === blankIndex ? { ...pair, question } : pair);
  });
};
```

Render the preset buttons above `QAEntry`. Remove `addQAPair` and the `Add more` Button. Each preset button calls `selectQAPreset(preset.question)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/knowledge-base/QASection.test.tsx src/components/knowledge-base/QAEntry.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/knowledge-base/QASection.tsx src/components/knowledge-base/QASection.test.tsx
git commit -m "Add common Q&A presets"
```

### Task 2: Verify production integration

**Files:**
- Modify: `src/components/knowledge-base/QASection.tsx`
- Test: `src/components/knowledge-base/QASection.test.tsx`

**Interfaces:**
- Consumes: the preset controls and draft-row behavior from Task 1.
- Produces: a production-ready, type-safe Q&A editor with unchanged save behavior.

- [ ] **Step 1: Write the failing test**

```tsx
test('does not render the retired Add more action', () => {
  render(<QASection entries={[]} agentId={undefined} openDeleteDialog={vi.fn()} />);

  expect(screen.queryByRole('button', { name: 'Add more' })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/knowledge-base/QASection.test.tsx`

Expected: FAIL until the retired action is removed.

- [ ] **Step 3: Write minimal implementation**

Keep the Save Button and its disabled condition intact. Ensure the preset row is immediately before the `QAEntry` component, so it appears above the Add Q&A heading.

- [ ] **Step 4: Run verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/knowledge-base/QASection.test.tsx src/components/knowledge-base/QAEntry.test.tsx && bun run build && git diff --check`

Expected: focused tests, production build, and whitespace check PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/knowledge-base/QASection.tsx src/components/knowledge-base/QASection.test.tsx
git commit -m "Verify Q&A preset picker"
```
