# Workflow Template BODY Examples Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow workflow drafts to save and preserve strictly validated WhatsApp BODY named-parameter examples.

**Architecture:** Extend the existing shared workflow template snapshot validator with the exact Meta named BODY example shape. Align the shared and frontend component types, while leaving template selection, persistence, and sending behavior unchanged.

**Tech Stack:** Convex, TypeScript, React 19, Vitest, convex-test

## Global Constraints

- Use Node v22 for every script and test command.
- Read and follow `convex/_generated/ai/guidelines.md` before changing Convex code.
- Keep every code file under 300 lines.
- Add no comments unless a non-obvious workaround cannot be expressed clearly in code.
- Preserve strict validation; do not use `v.any()` or arbitrary records.
- Preserve all template metadata unchanged through workflow Save.

---

### Task 1: Accept named BODY examples in workflow template snapshots

**Files:**
- Modify: `convex/workflowDraftSave.test.ts`
- Modify: `convex/workflowAutomationValidators.ts`
- Modify: `shared/workflowAutomations.ts`
- Modify: `src/components/workflow/workflowWhatsappTemplates.ts`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `workflowWhatsappTemplateSnapshotValidator`, `WorkflowWhatsappTemplateComponent`, and the workflow template-listing component type.
- Produces: optional `example.body_text_named_params: Array<{ param_name: string; example: string }>` support across validation and TypeScript boundaries.

- [x] **Step 1: Add the failing workflow Save regression payload**

Replace the reminder template’s empty `components` array in `workflowDraftSave.test.ts` with:

```ts
components: [{
  type: 'BODY',
  text: 'Dear {{customer_name}}, your {{booking_service}} is on {{booking_date}} at {{booking_time}}.',
  example: {
    body_text_named_params: [
      { param_name: 'customer_name', example: 'Jessica Lee' },
      { param_name: 'booking_service', example: 'Consultation' },
      { param_name: 'booking_date', example: 'July 18 (Saturday)' },
      { param_name: 'booking_time', example: '2:00 PM - 3:00 PM' },
    ],
  },
}],
```

After the saved reminder assertions, add:

```ts
expect(saved.automations.reminder.template?.components?.[0]).toEqual(
  expect.objectContaining({
    example: {
      body_text_named_params: [
        { param_name: 'customer_name', example: 'Jessica Lee' },
        { param_name: 'booking_service', example: 'Consultation' },
        { param_name: 'booking_date', example: 'July 18 (Saturday)' },
        { param_name: 'booking_time', example: '2:00 PM - 3:00 PM' },
      ],
    },
  }),
);
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowDraftSave.test.ts
```

Expected: FAIL with an argument-validation error reporting the extra BODY component field `example`.

- [x] **Step 3: Extend the strict Convex snapshot validator**

Add this validator above `workflowWhatsappTemplateSnapshotValidator`:

```ts
const workflowWhatsappTemplateNamedBodyExampleValidator = v.object({
  body_text_named_params: v.array(v.object({
    param_name: v.string(),
    example: v.string(),
  })),
});
```

Add this field to the workflow template component object:

```ts
example: v.optional(workflowWhatsappTemplateNamedBodyExampleValidator),
```

- [x] **Step 4: Align shared and frontend component types**

Add this optional field to `WorkflowWhatsappTemplateComponent` in both `shared/workflowAutomations.ts` and `src/components/workflow/workflowWhatsappTemplates.ts`:

```ts
example?: {
  body_text_named_params: Array<{
    param_name: string;
    example: string;
  }>;
};
```

- [x] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowDraftSave.test.ts convex/workflowAutomationHistory.test.ts
```

Expected: both focused files pass and the saved snapshot assertion preserves the named examples.

- [x] **Step 6: Run quality checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/workflowDraftSave.test.ts convex/workflowAutomationValidators.ts shared/workflowAutomations.ts src/components/workflow/workflowWhatsappTemplates.ts
git diff --check
wc -l convex/workflowDraftSave.test.ts convex/workflowAutomationValidators.ts shared/workflowAutomations.ts src/components/workflow/workflowWhatsappTemplates.ts
```

Expected: ESLint and `git diff --check` exit 0, and every touched code file remains under 300 lines.

Observed: the validator, test, and shared type pass ESLint; the frontend type mirror retains the existing `react-hooks/set-state-in-effect` error at its unchanged no-channel branch, reproduced from `HEAD`. `git diff --check` passes and all touched files remain under 300 lines.

- [x] **Step 7: Record and commit the verified fix**

Update `CONTINUITY.md` with the completed state and verification receipt, then run:

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-07-14-workflow-template-body-examples.md convex/workflowDraftSave.test.ts convex/workflowAutomationValidators.ts shared/workflowAutomations.ts src/components/workflow/workflowWhatsappTemplates.ts
git commit -m "Accept workflow template BODY examples"
```
