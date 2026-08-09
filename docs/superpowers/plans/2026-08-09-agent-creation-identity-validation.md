# Agent Creation Identity Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the first agent-creation step friendlier and explain missing required information inline when Continue is pressed.

**Architecture:** Keep validation rules in the existing creation-wizard model so they are independently testable. The identity-step component owns display state and focus behavior, uses the shared field primitives for accessible inline errors, and does not alter creation payloads or backend behavior.

**Tech Stack:** React, TypeScript, shadcn field primitives, Vitest, Node v22.

## Global Constraints

- Use Node v22 for every script and test command.
- Keep code modules at or below 300 lines.
- Do not change agent creation payloads, Convex code, existing agents, or goal selection.
- Use `Let’s set up your agent` exactly as the identity-step heading.
- Required labels show a visual asterisk with an assistive-technology required label.
- Continue must remain clickable while Agent name or Business name is blank.

---

### Task 1: Validate and present the identity step

**Files:**
- Modify: `src/components/create-agent/createAgentWizardModel.ts`
- Modify: `src/components/create-agent/createAgentWizardModel.test.ts`
- Modify: `src/components/create-agent/CreateAgentIdentityStep.tsx`
- Modify: `src/components/create-agent/CreateAgentSteps.test.tsx`

**Interfaces:**
- Produces: `getIdentityValidation(input)` returning `{ agentNameError: string | null; businessNameError: string | null; firstInvalidField: 'agent-name' | 'business-name' | null }`.
- Consumes: `hasRequiredIdentity(input)` for valid progression to the goal step.
- Preserves: `CreateAgentIdentityStepProps` and the parent wizard’s creation state.

- [x] **Step 1: Write the failing validation and rendered-step tests**

Add these expectations to the wizard model test:

```ts
expect(getIdentityValidation({ name: ' ', businessName: ' ' })).toEqual({
  agentNameError: 'Enter an agent name.',
  businessNameError: 'Enter a business name.',
  firstInvalidField: 'agent-name',
});

expect(getIdentityValidation({ name: 'Nova', businessName: ' ' })).toEqual({
  agentNameError: null,
  businessNameError: 'Enter a business name.',
  firstInvalidField: 'business-name',
});
```

Add rendered-step expectations for `Let’s set up your agent`, `Agent name *`, `Business name *`, `noValidate`, and an enabled Continue button. Assert that the removed optional-description helper sentence is absent.

- [x] **Step 2: Run tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/create-agent/createAgentWizardModel.test.ts src/components/create-agent/CreateAgentSteps.test.tsx
```

Expected: FAIL because `getIdentityValidation` and the updated identity-step markup do not yet exist.

- [x] **Step 3: Implement the validation model and accessible identity-step feedback**

Add `getIdentityValidation` beside `hasRequiredIdentity` using trimmed input values and exact messages. In `CreateAgentIdentityStep`:

```tsx
const [showValidation, setShowValidation] = useState(false);
const agentNameInputRef = useRef<HTMLInputElement>(null);
const businessNameInputRef = useRef<HTMLInputElement>(null);
const validation = getIdentityValidation({ name, businessName });
```

Use `noValidate` on the form. On submit, set validation visible; when `firstInvalidField` is present, focus its matching ref and return. Otherwise call `onContinue()`.

Render each missing message with `FieldError`, set the matching `Field` to `data-invalid`, set `aria-invalid`, and extend `aria-describedby` with the error ID while invalid. Clear visible validation after the user makes both required values valid. Replace the heading, add the required markers, remove the optional-description helper, and remove the `disabled` prop from Continue.

- [x] **Step 4: Run tests to verify they pass**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/create-agent/createAgentWizardModel.test.ts src/components/create-agent/CreateAgentSteps.test.tsx
```

Expected: PASS with the new validation contract and rendered identity-step copy.

- [x] **Step 5: Run focused quality checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/create-agent/CreateAgentIdentityStep.tsx src/components/create-agent/createAgentWizardModel.ts src/components/create-agent/CreateAgentSteps.test.tsx src/components/create-agent/createAgentWizardModel.test.ts && git diff --check && wc -l src/components/create-agent/CreateAgentIdentityStep.tsx src/components/create-agent/createAgentWizardModel.ts
```

Expected: ESLint and whitespace checks pass; both production files remain at or below 300 lines.

- [x] **Step 6: Commit**

```bash
git add src/components/create-agent/CreateAgentIdentityStep.tsx src/components/create-agent/createAgentWizardModel.ts src/components/create-agent/CreateAgentSteps.test.tsx src/components/create-agent/createAgentWizardModel.test.ts
git commit -m "Improve agent identity validation"
```
