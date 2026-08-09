# Goal-Based Agent Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace template-and-model selection during agent creation with required business context, a Support or Book a Service goal, deterministic backend prompt construction, and a Channels deployment action.

**Architecture:** Shared goal metadata and a deterministic prompt builder define the creation contract. Convex owns validation, default-model selection, prompt construction, and persistence while optional schema fields preserve legacy agents. The 764-line creation page is split into a small route wrapper, a coordinator, focused steps, progress/success states, and a visual companion panel.

**Tech Stack:** React 19, React Router 7, TypeScript 6, Convex, Vitest, shadcn/ui, Tailwind CSS 4, Motion, Bun, Node 22.

## Global Constraints

- Run every script and test with `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- No code file may exceed 300 lines.
- Keep code self-explanatory and do not add comments.
- Business name is required and business description is optional.
- Agent goal is exactly `support` or `bookService`.
- Creation uses `DEFAULT_AGENT_MODEL`; the wizard does not expose model or legacy template selection.
- Existing agents, prompts, workflows, knowledge bases, models, templates, and channels remain unchanged.
- Existing agents require no data migration; new schema fields are optional.
- Prompt generation is deterministic and does not call an LLM.
- Book a Service must not invent services, schedules, prices, availability, or booking success.
- Deploy to a channel routes to `/dashboard/{agentId}/channels`.
- Do not update the production changelog until production availability is confirmed.

---

## File Structure

- `shared/agentCreationGoals.ts`: goal types, user-facing metadata, legacy template-key mapping, and deterministic prompt construction.
- `shared/agentCreationGoals.test.ts`: prompt and mapping contract tests.
- `convex/schema.ts`: optional persisted business context and goal fields.
- `convex/agents.ts`: creation validator, default model, prompt generation, and persistence.
- `convex/agentCreation.test.ts`: authenticated creation behavior and validation.
- `convex/agentModelProvider.test.ts`: update the default-provider creation fixture to the new contract.
- `convex/agentTemplateKeys.test.ts`: replace legacy create-template coverage with goal compatibility coverage.
- `convex/workflows.test.ts`: update the workflow-provisioning create fixture.
- `src/components/create-agent/createAgentWizardModel.ts`: step types and pure validation helpers.
- `src/components/create-agent/createAgentWizardModel.test.ts`: pure wizard validation tests.
- `src/components/create-agent/CreateAgentIdentityStep.tsx`: agent name and business context form.
- `src/components/create-agent/CreateAgentGoalStep.tsx`: accessible two-option goal selection.
- `src/components/create-agent/CreateAgentCreationState.tsx`: animated creating state and progress list.
- `src/components/create-agent/CreateAgentSuccessState.tsx`: training, playground, and channel actions.
- `src/components/create-agent/CreateAgentVisualPanel.tsx`: terminal-style context for each wizard state.
- `src/components/create-agent/CreateAgentWizard.tsx`: mutation, timer, analytics, state, and navigation coordinator.
- `src/components/create-agent/CreateAgentSteps.test.tsx`: rendered step and success-action contracts.
- `src/pages/CreateAgentPage.tsx`: authenticated route wrapper only.
- `src/pages/CreateAgentPage.test.ts`: source-level contract for the slim wrapper and absence of creation-time model/template controls.
- `CONTINUITY.md`: completion status, verification receipts, local URL, and unreleased status.

### Task 1: Shared Goal and Prompt Contract

**Files:**
- Create: `shared/agentCreationGoals.ts`
- Create: `shared/agentCreationGoals.test.ts`

**Interfaces:**
- Produces: `AgentGoal = "support" | "bookService"`.
- Produces: `AGENT_GOAL_OPTIONS: Record<AgentGoal, { label: string; description: string }>`.
- Produces: `templateKeyForAgentGoal(goal: AgentGoal): "support" | "sales"`.
- Produces: `buildAgentSystemPrompt(input: { businessName: string; businessDescription?: string; goal: AgentGoal }): string`.

- [ ] **Step 1: Write the failing prompt and mapping tests**

```ts
import { describe, expect, test } from "vitest";
import {
  AGENT_GOAL_OPTIONS,
  buildAgentSystemPrompt,
  templateKeyForAgentGoal,
} from "./agentCreationGoals";

describe("agent creation goals", () => {
  test("builds a business-specific support prompt", () => {
    const prompt = buildAgentSystemPrompt({
      businessName: " Northstar Dental ",
      businessDescription: " Family dental care in Kuala Lumpur. ",
      goal: "support",
    });

    expect(prompt).toContain("Northstar Dental");
    expect(prompt).toContain("Family dental care in Kuala Lumpur.");
    expect(prompt).toContain("customer support AI agent");
    expect(prompt).toContain("Do not request passwords");
  });

  test("builds a safe booking prompt without an empty description section", () => {
    const prompt = buildAgentSystemPrompt({
      businessName: "Glow Studio",
      goal: "bookService",
    });

    expect(prompt).toContain("help customers book services");
    expect(prompt).toContain("Do not claim a booking is confirmed");
    expect(prompt).not.toContain("undefined");
    expect(prompt).not.toContain("Business description:\n\n");
  });

  test("maps goals to compatible legacy template keys", () => {
    expect(templateKeyForAgentGoal("support")).toBe("support");
    expect(templateKeyForAgentGoal("bookService")).toBe("sales");
    expect(AGENT_GOAL_OPTIONS.bookService.label).toBe("Book a Service");
  });
});
```

- [ ] **Step 2: Run the tests and verify the missing module failure**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run shared/agentCreationGoals.test.ts`

Expected: FAIL because `shared/agentCreationGoals.ts` does not exist.

- [ ] **Step 3: Implement goal metadata, compatibility mapping, and prompt construction**

```ts
export type AgentGoal = "support" | "bookService";

export const AGENT_GOAL_OPTIONS = {
  support: {
    label: "Support",
    description: "Answer questions, resolve issues, and escalate when human help is needed.",
  },
  bookService: {
    label: "Book a Service",
    description: "Answer service questions and help customers book an appointment.",
  },
} as const satisfies Record<AgentGoal, { label: string; description: string }>;

export function templateKeyForAgentGoal(goal: AgentGoal) {
  return goal === "support" ? "support" : "sales";
}

export function buildAgentSystemPrompt(input: {
  businessName: string;
  businessDescription?: string;
  goal: AgentGoal;
}) {
  const businessName = input.businessName.trim();
  const description = input.businessDescription?.trim();
  const businessContext = description
    ? `Business name: ${businessName}\nBusiness description: ${description}`
    : `Business name: ${businessName}`;
  const goalPrompt = input.goal === "support" ? SUPPORT_PROMPT : BOOK_SERVICE_PROMPT;
  return `# Role\n${goalPrompt.role}\n\n# About the business\n${businessContext}\n\n# Goal\n${goalPrompt.goal}\n\n# Guardrails\n${goalPrompt.guardrails}\n\n# Error handling\n${ERROR_HANDLING}`;
}
```

Define `SUPPORT_PROMPT`, `BOOK_SERVICE_PROMPT`, and `ERROR_HANDLING` in the same file with the exact behavioral constraints from the design. Keep the file under 300 lines and avoid generic fallback business copy.

- [ ] **Step 4: Run the focused shared tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run shared/agentCreationGoals.test.ts shared/agentPromptTemplates.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the shared contract**

```bash
git add shared/agentCreationGoals.ts shared/agentCreationGoals.test.ts
git commit -m "Add agent creation goal prompts"
```

### Task 2: Convex Creation Contract and Legacy Compatibility

**Files:**
- Create: `convex/agentCreation.test.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/agents.ts`
- Modify: `convex/agentModelProvider.test.ts`
- Modify: `convex/agentTemplateKeys.test.ts`
- Modify: `convex/workflows.test.ts`

**Interfaces:**
- Consumes: `AgentGoal`, `buildAgentSystemPrompt`, and `templateKeyForAgentGoal` from `shared/agentCreationGoals.ts`.
- Produces: `api.agents.create({ name, businessName, businessDescription?, goal, ...existing non-prompt settings })`.
- Persists: optional `businessName`, `businessDescription`, and `goal` fields on `agents` documents.

- [ ] **Step 1: Write failing authenticated creation tests**

Create a Convex test setup matching `convex/agentModelProvider.test.ts`, then add:

```ts
test("agents.create stores business context and builds the selected goal prompt", async () => {
  const t = initTest();
  const authed = t.withIdentity({ subject: "goal-agent-owner" });
  const agentId = await authed.mutation(api.agents.create, {
    name: "  Nova  ",
    businessName: "  Northstar Dental  ",
    businessDescription: "  Family dental care.  ",
    goal: "support",
  });
  const agent = await authed.query(api.agents.get, { agentId });

  expect(agent).toMatchObject({
    name: "Nova",
    businessName: "Northstar Dental",
    businessDescription: "Family dental care.",
    goal: "support",
    templateKey: "support",
    model: DEFAULT_AGENT_MODEL,
  });
  expect(agent?.systemPrompt).toContain("Northstar Dental");
});

test("agents.create omits a blank description and maps booking to sales compatibility", async () => {
  const t = initTest();
  const authed = t.withIdentity({ subject: "booking-agent-owner" });
  const agentId = await authed.mutation(api.agents.create, {
    name: "Booking Assistant",
    businessName: "Glow Studio",
    businessDescription: "   ",
    goal: "bookService",
  });
  const agent = await authed.query(api.agents.get, { agentId });

  expect(agent?.businessDescription).toBeUndefined();
  expect(agent?.templateKey).toBe("sales");
  expect(agent?.systemPrompt).toContain("Do not claim a booking is confirmed");
});

test("agents.create rejects an empty business name", async () => {
  const t = initTest();
  const authed = t.withIdentity({ subject: "invalid-business-owner" });
  await expect(authed.mutation(api.agents.create, {
    name: "Support",
    businessName: "   ",
    goal: "support",
  })).rejects.toThrow("Business name is required");
});
```

- [ ] **Step 2: Run the new test and verify contract failures**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/agentCreation.test.ts`

Expected: FAIL because the schema and mutation do not expose the new fields.

- [ ] **Step 3: Extend the schema without migrating existing agents**

Add to the `agents` table validator:

```ts
businessName: v.optional(v.string()),
businessDescription: v.optional(v.string()),
goal: v.optional(v.union(v.literal("support"), v.literal("bookService"))),
```

- [ ] **Step 4: Make creation backend-owned**

Replace creation-time model, prompt, and template arguments with:

```ts
businessName: v.string(),
businessDescription: v.optional(v.string()),
goal: v.union(v.literal("support"), v.literal("bookService")),
```

Trim `name`, `businessName`, and `businessDescription`; reject empty required fields; use `DEFAULT_AGENT_MODEL`; call `buildAgentSystemPrompt`; call `templateKeyForAgentGoal`; and persist the three new fields. Do not change `agents.update`, so updates preserve legacy and new metadata.

- [ ] **Step 5: Update existing create fixtures to the new contract**

Use explicit fixture values:

```ts
{
  name: "Created Agent",
  businessName: "Fixture Business",
  goal: "support",
}
```

Update `agentModelProvider.test.ts` to assert that creation uses `DEFAULT_AGENT_MODEL` and the matching provider. Update `agentTemplateKeys.test.ts` to assert both goal-to-template mappings rather than accepting a creation-time template key. Update `workflows.test.ts` to pass business context and goal.

- [ ] **Step 6: Run focused Convex tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/agentCreation.test.ts convex/agentModelProvider.test.ts convex/agentTemplateKeys.test.ts convex/workflows.test.ts`

Expected: PASS.

- [ ] **Step 7: Regenerate Convex API types**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen`

Expected: generated types accept the new create arguments. If the configured deployment is unavailable, record the exact blocker and rely on the strict Convex TypeScript check later.

- [ ] **Step 8: Commit the backend contract**

```bash
git add convex/schema.ts convex/agents.ts convex/agentCreation.test.ts convex/agentModelProvider.test.ts convex/agentTemplateKeys.test.ts convex/workflows.test.ts convex/_generated
git commit -m "Create agents from business goals"
```

### Task 3: Wizard Model and Focused Steps

**Files:**
- Create: `src/components/create-agent/createAgentWizardModel.ts`
- Create: `src/components/create-agent/createAgentWizardModel.test.ts`
- Create: `src/components/create-agent/CreateAgentIdentityStep.tsx`
- Create: `src/components/create-agent/CreateAgentGoalStep.tsx`
- Create: `src/components/create-agent/CreateAgentSteps.test.tsx`

**Interfaces:**
- Consumes: `AgentGoal` and `AGENT_GOAL_OPTIONS` from the shared contract.
- Produces: `CreateAgentStep = "identity" | "goal" | "creating" | "success"`.
- Produces: `hasRequiredIdentity({ name, businessName }): boolean`.
- Produces: controlled identity and goal step components.

- [ ] **Step 1: Fetch the installed shadcn component documentation**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx --bun shadcn@latest docs field input textarea toggle-group button`

Expected: official component documentation URLs for the installed radix-based project APIs.

- [ ] **Step 2: Write failing pure validation tests**

```ts
import { expect, test } from "vitest";
import { hasRequiredIdentity } from "./createAgentWizardModel";

test("requires trimmed agent and business names", () => {
  expect(hasRequiredIdentity({ name: "Nova", businessName: "Northstar" })).toBe(true);
  expect(hasRequiredIdentity({ name: " ", businessName: "Northstar" })).toBe(false);
  expect(hasRequiredIdentity({ name: "Nova", businessName: " " })).toBe(false);
});
```

- [ ] **Step 3: Run the model test and verify the missing module failure**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/create-agent/createAgentWizardModel.test.ts`

Expected: FAIL because the model does not exist.

- [ ] **Step 4: Implement the model and controlled step components**

Use `FieldGroup`, `Field`, `FieldLabel`, `FieldDescription`, `Input`, and `Textarea` for identity. Use a single-value `ToggleGroup` containing exactly two `ToggleGroupItem` options for goals. The identity submit button is disabled until `hasRequiredIdentity` returns true. The goal submit button is disabled until a goal is selected. Each component receives values and callbacks; neither component calls Convex or navigation directly.

- [ ] **Step 5: Add rendered component contracts**

```tsx
test("identity step renders required business fields and optional description", () => {
  const markup = renderToStaticMarkup(
    <CreateAgentIdentityStep
      name=""
      businessName=""
      businessDescription=""
      onNameChange={() => undefined}
      onBusinessNameChange={() => undefined}
      onBusinessDescriptionChange={() => undefined}
      onBack={() => undefined}
      onContinue={() => undefined}
    />,
  );
  expect(markup).toContain("Agent name");
  expect(markup).toContain("Business name");
  expect(markup).toContain("Business description");
  expect(markup).toContain("Optional");
});

test("goal step renders only Support and Book a Service", () => {
  const markup = renderToStaticMarkup(
    <CreateAgentGoalStep goal={null} onGoalChange={() => undefined} onBack={() => undefined} onCreate={() => undefined} />,
  );
  expect(markup).toContain("Support");
  expect(markup).toContain("Book a Service");
  expect(markup).not.toContain("Model");
});
```

- [ ] **Step 6: Run the focused wizard component tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/create-agent/createAgentWizardModel.test.ts src/components/create-agent/CreateAgentSteps.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit the wizard steps**

```bash
git add src/components/create-agent/createAgentWizardModel.ts src/components/create-agent/createAgentWizardModel.test.ts src/components/create-agent/CreateAgentIdentityStep.tsx src/components/create-agent/CreateAgentGoalStep.tsx src/components/create-agent/CreateAgentSteps.test.tsx
git commit -m "Add business and goal creation steps"
```

### Task 4: Creation Coordinator, Progress, Success, and Visuals

**Files:**
- Create: `src/components/create-agent/CreateAgentCreationState.tsx`
- Create: `src/components/create-agent/CreateAgentSuccessState.tsx`
- Create: `src/components/create-agent/CreateAgentVisualPanel.tsx`
- Create: `src/components/create-agent/CreateAgentWizard.tsx`
- Modify: `src/components/create-agent/CreateAgentSteps.test.tsx`
- Modify: `src/pages/CreateAgentPage.tsx`
- Modify: `src/pages/CreateAgentPage.test.ts`

**Interfaces:**
- Consumes: controlled steps, `CreateAgentStep`, `AgentGoal`, and `api.agents.create`.
- Produces: authenticated creation flow with retry-safe mutation submission.
- Produces: success callbacks for knowledge base, agent setup, and Channels.

- [ ] **Step 1: Add failing success-action and source contracts**

```tsx
test("success state offers training, playground, and channel deployment", () => {
  const markup = renderToStaticMarkup(
    <CreateAgentSuccessState
      onTrain={() => undefined}
      onPlayground={() => undefined}
      onDeploy={() => undefined}
    />,
  );
  expect(markup).toContain("Train your agent");
  expect(markup).toContain("Try in Playground");
  expect(markup).toContain("Deploy to a channel");
});
```

Update `CreateAgentPage.test.ts` to assert that `CreateAgentPage.tsx` imports `CreateAgentWizard`, does not import `ModelPicker` or `AGENT_TEMPLATES`, and remains below 300 lines. Add source assertions against `CreateAgentWizard.tsx` for `businessName`, `businessDescription`, `goal`, and ``/dashboard/${createdAgentId}/channels``.

- [ ] **Step 2: Run focused tests and verify failures**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/CreateAgentPage.test.ts src/components/create-agent/CreateAgentSteps.test.tsx`

Expected: FAIL because the new coordinator and success state do not exist.

- [ ] **Step 3: Extract progress, success, and terminal visual components**

Use the existing motion, terminal, grid, spinner, and typing primitives. Replace role/model wording with:

```ts
[
  "Creating agent",
  "Adding business context",
  "Applying agent goal",
  "Agent ready",
]
```

The visual panel must show the trimmed business name and selected goal label without showing a model. Keep each file below 300 lines.

- [ ] **Step 4: Implement the coordinator and slim route wrapper**

The coordinator owns identity values, nullable goal, step, created ID, error, progress phase, and a duplicate-submission ref. On creation it calls:

```ts
await createAgent({
  name: name.trim(),
  businessName: businessName.trim(),
  businessDescription: businessDescription.trim() || undefined,
  goal,
});
```

On failure, restore the goal step, preserve all values, clear the submission ref, and show the mutation error. Capture analytics with `{ goal }`, not model or legacy template. Route the three success actions to knowledge base, agent setup, and Channels respectively.

- [ ] **Step 5: Run focused frontend tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/CreateAgentPage.test.ts src/components/create-agent/createAgentWizardModel.test.ts src/components/create-agent/CreateAgentSteps.test.tsx`

Expected: PASS.

- [ ] **Step 6: Enforce the code-file size limit**

Run: `wc -l src/pages/CreateAgentPage.tsx src/components/create-agent/CreateAgent*.tsx src/components/create-agent/createAgentWizardModel.ts shared/agentCreationGoals.ts`

Expected: every listed code file is 300 lines or fewer.

- [ ] **Step 7: Commit the completed UI flow**

```bash
git add src/pages/CreateAgentPage.tsx src/pages/CreateAgentPage.test.ts src/components/create-agent
git commit -m "Redesign agent creation around business goals"
```

### Task 5: Verification and Local Test Handoff

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: verified feature branch and a running local Vite URL.

- [ ] **Step 1: Run the complete focused feature suite**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run shared/agentCreationGoals.test.ts shared/agentPromptTemplates.test.ts convex/agentCreation.test.ts convex/agentModelProvider.test.ts convex/agentTemplateKeys.test.ts convex/workflows.test.ts src/pages/CreateAgentPage.test.ts src/components/create-agent/createAgentWizardModel.test.ts src/components/create-agent/CreateAgentSteps.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run scoped lint**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint shared/agentCreationGoals.ts shared/agentCreationGoals.test.ts convex/agents.ts convex/agentCreation.test.ts convex/agentModelProvider.test.ts convex/agentTemplateKeys.test.ts convex/workflows.test.ts src/pages/CreateAgentPage.tsx src/pages/CreateAgentPage.test.ts src/components/create-agent/*.ts src/components/create-agent/*.tsx`

Expected: PASS.

- [ ] **Step 3: Run the production build**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bun run build`

Expected: TypeScript and Vite production build PASS.

- [ ] **Step 4: Check repository hygiene and code size**

Run: `git diff --check && git status --short && wc -l src/pages/CreateAgentPage.tsx src/components/create-agent/CreateAgent*.tsx src/components/create-agent/createAgentWizardModel.ts shared/agentCreationGoals.ts`

Expected: no whitespace errors; only intended changes; all code files at or below 300 lines.

- [ ] **Step 5: Start the local application**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bun run dev --host 127.0.0.1 --port 5178`

Expected: Vite reports `http://127.0.0.1:5178/`. Keep the process running for user testing.

- [ ] **Step 6: Record completion without publishing a changelog entry**

Update `CONTINUITY.md` with dated `[CODE]` and `[TOOL]` receipts covering behavior, tests, build, local URL, and any environment limitations. State that production availability is unconfirmed and no changelog entry was added.

- [ ] **Step 7: Commit verification receipts**

```bash
git add CONTINUITY.md
git commit -m "Record goal-based agent creation verification"
```
