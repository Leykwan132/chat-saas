# Workflow Discard and Template Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Reset with a destructive Discard changes action, make every template card directly clickable, and give every template edge an intentional customer-routing condition.

**Architecture:** Preserve the existing workflow draft and fit-view behavior while changing only its dirty-state presentation. Keep template interaction inside `WorkflowTemplateHoverCard`, and extend the existing template data builder so condition labels and details live beside the action they describe rather than changing shared defaults.

**Tech Stack:** React, TypeScript, shadcn/ui Card and Button variants, Lucide icons, Vitest

## Global Constraints

- Use Node.js v22 for every script and test command.
- Keep every code file below 300 lines.
- Do not add comments.
- Do not change backend schema, save behavior, usage tracking, or confirmation dialogs.
- Preserve existing uncommitted work and do not commit overlapping implementation files.
- Applying a template remains draft-only until Save; Discard changes restores the saved workflow and fits it to the canvas.

---

### Task 1: Destructive Discard Changes Action

**Files:**
- Modify: `src/components/workflow/WorkflowDraftToolbar.test.ts`
- Modify: `src/components/workflow/WorkflowDraftActions.tsx`

**Interfaces:**
- Consumes: existing `onReset: () => void` callback and dirty-state toolbar layout.
- Produces: a destructive `Discard changes` button that invokes the unchanged `onReset` callback.

- [ ] **Step 1: Write the failing toolbar assertion**

Replace the Reset expectations with assertions for the new copy, semantic variant, and icon:

```ts
expect(actionsSource).toContain("import { Loader2, Save, Trash2 } from 'lucide-react'");
expect(actionsSource).toContain('variant="destructive"');
expect(actionsSource).toContain('<Trash2 data-icon="inline-start" />');
expect(actionsSource).toContain('Discard changes');
expect(actionsSource).not.toContain('RotateCcw');
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowDraftToolbar.test.ts`

Expected: FAIL because the source still contains Reset, `RotateCcw`, and the ghost variant.

- [ ] **Step 3: Implement the destructive action**

Update the icon import and button markup:

```tsx
import { Loader2, Save, Trash2 } from 'lucide-react';

<Button type="button" variant="destructive" size="sm" disabled={isSaving} onClick={onReset}>
  <Trash2 data-icon="inline-start" />
  Discard changes
</Button>
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowDraftToolbar.test.ts src/pages/WorkflowPage.test.ts`

Expected: PASS, including the existing reset-and-fit handler regression test.

### Task 2: Explicit Template Conditions

**Files:**
- Modify: `src/components/workflow/workflowTemplates.test.ts`
- Modify: `src/components/workflow/workflowTemplates.ts`

**Interfaces:**
- Consumes: `TemplateNode` actions passed to `buildTemplate`.
- Produces: `condition?: { label: string; detail: string }` on `TemplateNode`, copied into each generated workflow edge.

- [ ] **Step 1: Write the failing condition-data assertions**

Add exact expected labels and require every generated action edge to have a detail:

```ts
expect(WORKFLOW_TEMPLATES.map((template) => template.graph.edges.map((edge) => edge.label))).toEqual([
  ['Common question', 'Needs supporting material', 'Ready to book', 'Needs human help'],
  ['Requests property details', 'Requests property photos', 'Requests property documents', 'Ready to view', 'Needs a property agent'],
  ['Requests product details', 'Requests product images', 'Requests a product guide', 'Wants a consultation', 'Needs sales help'],
]);
for (const template of WORKFLOW_TEMPLATES) {
  expect(template.graph.edges.every((edge) => Boolean(edge.detail?.trim()))).toBe(true);
}
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowTemplates.test.ts`

Expected: FAIL because the edges still inherit generic node-kind conditions.

- [ ] **Step 3: Extend the template action interface and edge builder**

Add explicit condition metadata while preserving shared defaults for any future action that omits it:

```ts
type TemplateNode = {
  key: string;
  kind: WorkflowNodeKind;
  title?: string;
  description?: string;
  condition?: { label: string; detail: string };
};

const condition = actions[index].condition ?? workflowNodeDefaultCondition(node.kind);
```

- [ ] **Step 4: Add all approved condition labels and details**

Add this condition metadata to the matching actions:

```ts
condition: {
  label: 'Common question',
  detail: 'When the customer asks a common question that the configured response is intended to answer.',
}
condition: {
  label: 'Needs supporting material',
  detail: 'When the customer asks for a guide, document, brochure, or other supporting file.',
}
condition: {
  label: 'Ready to book',
  detail: 'When the customer wants to schedule time for further help.',
}
condition: {
  label: 'Needs human help',
  detail: 'When the customer asks for a person or the AI cannot resolve the request safely or confidently.',
}
condition: {
  label: 'Requests property details',
  detail: "When the customer asks about a property's price, features, location, availability, or other key details.",
}
condition: {
  label: 'Requests property photos',
  detail: 'When the customer wants to see photos or other visual media for a property.',
}
condition: {
  label: 'Requests property documents',
  detail: 'When the customer asks for a brochure, floor plan, listing sheet, or other property document.',
}
condition: {
  label: 'Ready to view',
  detail: 'When the customer wants to schedule a property viewing.',
}
condition: {
  label: 'Needs a property agent',
  detail: 'When the customer asks for an agent or needs help beyond the configured property information.',
}
condition: {
  label: 'Requests product details',
  detail: 'When the customer asks about product features, specifications, pricing, availability, or compatibility.',
}
condition: {
  label: 'Requests product images',
  detail: 'When the customer wants to see product images or other visual media.',
}
condition: {
  label: 'Requests a product guide',
  detail: 'When the customer asks for a manual, specification sheet, brochure, or other product file.',
}
condition: {
  label: 'Wants a consultation',
  detail: 'When the customer wants to schedule time to discuss the product before purchasing.',
}
condition: {
  label: 'Needs sales help',
  detail: 'When the customer asks for a sales teammate or needs help beyond the configured product information.',
}
```

- [ ] **Step 5: Run the focused test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowTemplates.test.ts`

Expected: PASS with all exact label arrays and non-empty details.

### Task 3: Fully Clickable Template Cards

**Files:**
- Modify: `src/components/workflow/WorkflowDraftToolbar.test.ts`
- Modify: `src/components/workflow/WorkflowTemplateHoverCard.tsx`

**Interfaces:**
- Consumes: `onReplace(template: WorkflowTemplate): void`.
- Produces: `applyTemplate(template)` and `handleTemplateKeyDown(event, template)` inside the HoverCard component.

- [ ] **Step 1: Write failing source assertions for full-card interaction**

Update the template-card test to require the right-arrow cue, card semantics, keyboard activation, and absence of the old button:

```ts
expect(templateSource).toContain("import { ArrowRight, LayoutTemplate } from 'lucide-react'");
expect(templateSource).toContain('role="button"');
expect(templateSource).toContain('tabIndex={0}');
expect(templateSource).toContain('onClick={() => applyTemplate(template)}');
expect(templateSource).toContain('onKeyDown={(event) => handleTemplateKeyDown(event, template)}');
expect(templateSource).toContain('Try now');
expect(templateSource).toContain('<ArrowRight data-icon="inline-end" />');
expect(templateSource).not.toContain('Replace current');
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowDraftToolbar.test.ts`

Expected: FAIL because only the footer outline button is currently interactive.

- [ ] **Step 3: Add shared activation handlers**

Use one application path for pointer and keyboard activation:

```tsx
const applyTemplate = (template: WorkflowTemplate) => {
  onReplace(template);
  setOpen(false);
};
const handleTemplateKeyDown = (
  event: React.KeyboardEvent<HTMLDivElement>,
  template: WorkflowTemplate,
) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  applyTemplate(template);
};
```

- [ ] **Step 4: Make each Card the interactive surface**

Give the Card button semantics and interaction feedback, then replace the nested footer Button with a non-interactive text cue:

```tsx
<Card
  role="button"
  tabIndex={0}
  aria-label={`Try ${template.name} template`}
  onClick={() => applyTemplate(template)}
  onKeyDown={(event) => handleTemplateKeyDown(event, template)}
  className="h-full cursor-pointer gap-3 rounded-xl shadow-none outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/30"
>
```

Replace the existing footer Button with:

```tsx
  <CardFooter className="mt-auto justify-end">
    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
      Try now
      <ArrowRight data-icon="inline-end" />
    </span>
  </CardFooter>
```

- [ ] **Step 5: Run all focused workflow-template tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowDraftToolbar.test.ts src/components/workflow/workflowTemplates.test.ts src/pages/WorkflowPage.test.ts src/components/workflow/WorkflowCanvas.test.ts src/components/workflow/useWorkflowCanvasView.test.ts`

Expected: PASS.

### Task 4: Final Quality Verification

**Files:**
- Modify: `CONTINUITY.md`
- Verify: all files changed by Tasks 1–3

**Interfaces:**
- Consumes: completed toolbar, card interaction, and template data changes.
- Produces: verified implementation evidence and an updated compaction-safe ledger.

- [ ] **Step 1: Run targeted lint checks**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/workflow/WorkflowDraftActions.tsx src/components/workflow/WorkflowTemplateHoverCard.tsx src/components/workflow/workflowTemplates.ts src/components/workflow/WorkflowDraftToolbar.test.ts src/components/workflow/workflowTemplates.test.ts`

Expected: exit 0.

- [ ] **Step 2: Verify diff integrity and file sizes**

Run: `git diff --check && wc -l src/components/workflow/WorkflowDraftActions.tsx src/components/workflow/WorkflowTemplateHoverCard.tsx src/components/workflow/workflowTemplates.ts src/components/workflow/WorkflowDraftToolbar.test.ts src/components/workflow/workflowTemplates.test.ts`

Expected: no diff errors and every code file below 300 lines.

- [ ] **Step 3: Update the continuity ledger**

Supersede the Reset and `Replace current` wording, add the explicit condition-label decision, and record the focused test/lint/diff/LOC evidence without exceeding the ledger section caps.
