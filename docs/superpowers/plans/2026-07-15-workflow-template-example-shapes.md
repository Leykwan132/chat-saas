# Workflow Template Example Shapes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow Workflow Reminder and Follow-up drafts to save every supported WhatsApp template component example shape while rejecting malformed or unknown example objects.

**Architecture:** Define one exported TypeScript discriminated object union in the shared workflow contract, reference it from the frontend template model, and mirror it with an exact Convex validator union. Exercise the public `workflowDraftSave.save` mutation so the regression covers argument validation and unchanged snapshot persistence.

**Tech Stack:** TypeScript, React, Convex, `convex-test`, Vitest, ESLint, Vite, Bun, Node.js v22.

## Global Constraints

- Use Node.js v22 for every script and test command.
- Keep every code file below 300 lines.
- Preserve valid template example objects unchanged; do not normalize or strip them.
- Keep `example` optional.
- Accept only `header_handle`, `header_text`, `header_text_named_params`, `body_text`, and `body_text_named_params` exact shapes.
- Do not use `v.any`, `v.record`, a broad optional-field object, or a fallback validator branch.
- Do not add code comments.
- No data migration is required because rejected saves did not persist incompatible data.

---

### Task 1: Add public save-mutation regression coverage

**Files:**
- Modify: `convex/workflowDraftSave.test.ts`

**Interfaces:**
- Consumes: `api.workflowDraftSave.save` and the existing workflow automation draft returned by `api.workflows.ensureForAgent`.
- Produces: A regression proving all five supported example objects persist unchanged and an unknown object is rejected before a save can occur.

- [ ] **Step 1: Add the five supported examples to the Follow-up same-template fixture**

Add a `followUp` override beside the existing Reminder override:

```ts
followUp: {
  ...initial.automations.followUp,
  messageStrategy: 'same' as const,
  sameTemplate: {
    key: 'final_sending_with_image\ten_US',
    name: 'final_sending_with_image',
    language: 'en_US',
    category: 'MARKETING',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        example: { header_handle: ['https://scontent.whatsapp.net/example.jpg'] },
      },
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '{{1}}',
        example: { header_text: ['Summer sale'] },
      },
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '{{campaign}}',
        example: {
          header_text_named_params: [
            { param_name: 'campaign', example: 'Summer sale' },
          ],
        },
      },
      {
        type: 'BODY',
        text: 'Hi {{1}}, your {{2}} is ready.',
        example: { body_text: [['Jessica Lee', 'Consultation']] },
      },
      {
        type: 'BODY',
        text: 'Hi {{customer_name}}.',
        example: {
          body_text_named_params: [
            { param_name: 'customer_name', example: 'Jessica Lee' },
          ],
        },
      },
    ],
  },
},
```

- [ ] **Step 2: Assert the exact examples persist unchanged**

Add this assertion immediately after the existing Reminder example assertion:

```ts
expect(saved.automations.followUp.sameTemplate?.components?.map(
  (component) => component.example,
)).toEqual([
  { header_handle: ['https://scontent.whatsapp.net/example.jpg'] },
  { header_text: ['Summer sale'] },
  {
    header_text_named_params: [
      { param_name: 'campaign', example: 'Summer sale' },
    ],
  },
  { body_text: [['Jessica Lee', 'Consultation']] },
  {
    body_text_named_params: [
      { param_name: 'customer_name', example: 'Jessica Lee' },
    ],
  },
]);
```

- [ ] **Step 3: Add a current-baseline rejection assertion for an unknown shape**

After the first successful save and before `savedAgain`, build a save request from the current persisted draft with the invalid example cast only at the test boundary:

```ts
const currentSaveArgs = {
  agentId,
  baselineUpdatedAt: saved.workflow.updatedAt,
  layoutOrientation: 'horizontal' as const,
  templateId: 'real-estate',
  nodes: saved.nodes.map((node) => ({
    clientId: node._id,
    persistedNodeId: node._id,
    kind: node.kind,
    title: node.title,
    description: node.description,
    positionX: node.positionX,
    positionY: node.positionY,
  })),
  edges: saved.edges.map((edge) => ({
    sourceClientId: edge.sourceNodeId,
    targetClientId: edge.targetNodeId,
    label: edge.label,
    detail: edge.detail,
  })),
  automations: saved.automations,
};
await expect(authed.mutation(api.workflowDraftSave.save, {
  ...currentSaveArgs,
  automations: {
    ...saved.automations,
    followUp: {
      ...saved.automations.followUp,
      sameTemplate: {
        ...saved.automations.followUp.sameTemplate!,
        components: [{
          type: 'HEADER',
          format: 'IMAGE',
          example: { unsupported: [] },
        }],
      },
    },
  },
} as Parameters<typeof authed.mutation>[1])).rejects.toThrow();
```

If the generic mutation cast is not accepted by TypeScript, import `WorkflowAutomationConfigs`, cast only the malformed `example` through `unknown`, and retain the otherwise typed request:

```ts
example: { unsupported: [] } as unknown as NonNullable<
  NonNullable<WorkflowAutomationConfigs['followUp']['sameTemplate']>['components']
>[number]['example'],
```

Reuse `currentSaveArgs` for `savedAgain` so the valid save has the same current baseline and proves the rejected request did not mutate state.

- [ ] **Step 4: Run the focused regression and confirm RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowDraftSave.test.ts
```

Expected: FAIL with `ArgumentValidationError` requiring `body_text_named_params` at the Follow-up media-header example.

### Task 2: Align the shared, frontend, and Convex contracts

**Files:**
- Modify: `shared/workflowAutomations.ts`
- Modify: `src/components/workflow/workflowWhatsappTemplates.ts`
- Modify: `convex/workflowAutomationValidators.ts`

**Interfaces:**
- Produces: `WorkflowWhatsappTemplateNamedParameterExample` and `WorkflowWhatsappTemplateExample` exported by `shared/workflowAutomations.ts`.
- Consumes: The frontend component model imports `WorkflowWhatsappTemplateExample`; the Convex validator independently mirrors the same exact runtime shapes.

- [ ] **Step 1: Export the shared exact example union**

Replace the inline BODY-only component example in `shared/workflowAutomations.ts` with:

```ts
export type WorkflowWhatsappTemplateNamedParameterExample = {
  param_name: string;
  example: string;
};

export type WorkflowWhatsappTemplateExample =
  | { header_handle: string[] }
  | { header_text: string[] }
  | {
      header_text_named_params: WorkflowWhatsappTemplateNamedParameterExample[];
    }
  | { body_text: string[][] }
  | {
      body_text_named_params: WorkflowWhatsappTemplateNamedParameterExample[];
    };

export type WorkflowWhatsappTemplateComponent = {
  type: string;
  format?: string;
  text?: string;
  r2Key?: string;
  example?: WorkflowWhatsappTemplateExample;
```

Leave the existing `buttons` field and remaining component fields unchanged.

- [ ] **Step 2: Reuse the shared union in the frontend template model**

Add this import to `src/components/workflow/workflowWhatsappTemplates.ts`:

```ts
import type { WorkflowWhatsappTemplateExample } from '../../../shared/workflowAutomations';
```

Replace the inline BODY-only `example` declaration with:

```ts
example?: WorkflowWhatsappTemplateExample;
```

- [ ] **Step 3: Mirror the exact union in Convex validation**

Replace `workflowWhatsappTemplateNamedBodyExampleValidator` with:

```ts
const workflowWhatsappTemplateNamedParameterExampleValidator = v.object({
  param_name: v.string(),
  example: v.string(),
});

const workflowWhatsappTemplateExampleValidator = v.union(
  v.object({ header_handle: v.array(v.string()) }),
  v.object({ header_text: v.array(v.string()) }),
  v.object({
    header_text_named_params: v.array(
      workflowWhatsappTemplateNamedParameterExampleValidator,
    ),
  }),
  v.object({ body_text: v.array(v.array(v.string())) }),
  v.object({
    body_text_named_params: v.array(
      workflowWhatsappTemplateNamedParameterExampleValidator,
    ),
  }),
);
```

Update the snapshot component validator to use:

```ts
example: v.optional(workflowWhatsappTemplateExampleValidator),
```

- [ ] **Step 4: Run the focused regression and confirm GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowDraftSave.test.ts
```

Expected: the workflow draft save regression passes, including all five supported examples and the unknown-shape rejection.

### Task 3: Verify, document, and commit

**Files:**
- Modify: `CONTINUITY.md`
- Modify if generated output changes: `convex/_generated/api.d.ts`

**Interfaces:**
- Consumes: The completed test and aligned contracts from Tasks 1 and 2.
- Produces: Generated Convex types, verification receipts, and a scoped implementation commit on `main`.

- [ ] **Step 1: Run Convex code generation**

Run under Node v22 with the repository's configured mock Stripe price environment if the local deployment requires it:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen
```

Expected: code generation and Convex type checking complete successfully.

- [ ] **Step 2: Run targeted lint**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/workflowDraftSave.test.ts convex/workflowAutomationValidators.ts shared/workflowAutomations.ts src/components/workflow/workflowWhatsappTemplates.ts
```

Expected: zero errors.

- [ ] **Step 3: Run the complete test suite**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run
```

Expected: every test passes.

- [ ] **Step 4: Run the production build**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected: TypeScript and Vite production build complete successfully.

- [ ] **Step 5: Check diff integrity and line limits**

Run:

```bash
git diff --check
wc -l convex/workflowDraftSave.test.ts convex/workflowAutomationValidators.ts shared/workflowAutomations.ts src/components/workflow/workflowWhatsappTemplates.ts
```

Expected: no whitespace errors and every touched code file remains below 300 lines.

- [ ] **Step 6: Update the continuity ledger**

Record the strict example union as completed, list the focused/full verification outcomes in Receipts, update the Working set, and keep all bounded sections within their configured caps.

- [ ] **Step 7: Commit the scoped implementation**

Run:

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-07-15-workflow-template-example-shapes.md convex/workflowDraftSave.test.ts convex/workflowAutomationValidators.ts shared/workflowAutomations.ts src/components/workflow/workflowWhatsappTemplates.ts
git add convex/_generated/api.d.ts
git commit -m "Accept workflow template example shapes"
```

Only stage `convex/_generated/api.d.ts` if code generation changed it. Expected: one scoped implementation commit on `main`; do not push without a separate request.
