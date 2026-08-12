# Agent Setup Goal Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show only Support and Book a Service in Agent Setup and generate both prompts from the same goal definitions used during agent creation.

**Architecture:** Keep `shared/agentCreationGoals.ts` as the goal-copy and prompt source. Agent Setup passes an `AgentGoal`, derives its compatible stored template key, and builds a prompt with saved business context or a generic context for legacy agents.

**Tech Stack:** React 19, TypeScript, Vitest, Convex data types, Lucide React

## Global Constraints

- Run every script under Node v22.
- Keep every code file below 300 lines.
- Add no source comments.
- Preserve stored `blank`, `sales`, `productSales`, and `support` compatibility.
- Do not change the WhatsApp message-template library.
- Leave the public changelog unchanged while production availability is unconfirmed.

---

### Task 1: Shared goal prompt builder

**Files:**
- Modify: `shared/agentCreationGoals.test.ts`
- Modify: `shared/agentCreationGoals.ts`

**Interfaces:**
- Produces: `buildAgentSystemPrompt({ businessName?, businessDescription?, goal }): string` supporting both complete and absent business context.
- Preserves: `templateKeyForAgentGoal(goal): 'support' | 'sales'`.

- [x] **Step 1: Add a failing generic-context test**

Assert a `bookService` prompt built without business fields contains the shared booking role, goal, conversation guidance, guardrails, and a generic About the business instruction; assert it contains neither `undefined` nor empty `Business name:` lines.

```ts
const prompt = buildAgentSystemPrompt({ goal: 'bookService' });
expect(prompt).toContain('help customers book services');
expect(prompt).toContain('Use the business profile, uploaded knowledge, and conversation context');
expect(prompt).not.toContain('undefined');
expect(prompt).not.toContain('Business name:');
```

- [x] **Step 2: Verify RED**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run shared/agentCreationGoals.test.ts`.

Expected: TypeScript or assertion failure because business fields are currently required and no generic business context exists.

- [x] **Step 3: Implement the optional business context**

Make the two business fields optional at the builder boundary. Use the existing exact business block when both trimmed values exist; otherwise use `Use the business profile, uploaded knowledge, and conversation context to understand what the business offers and what customers need.` Keep all goal-specific sections shared.

```ts
export function buildAgentSystemPrompt(input: {
  businessName?: string;
  businessDescription?: string;
  goal: AgentGoal;
}): string
```

- [x] **Step 4: Verify GREEN and commit**

Run the focused test, then commit `shared/agentCreationGoals.ts` and its test with message `Share agent goal prompt templates`.

### Task 2: Two-option Agent Setup library

**Files:**
- Modify: `src/components/agent-setup/agentSetupOptions.test.ts`
- Modify: `src/components/agent-setup/agentSetupOptions.ts`
- Modify: `src/components/agent-setup/AgentSetupSystemPromptPanel.tsx`
- Modify: `src/components/agent-setup/AgentSetupPanels.tsx`
- Modify: `src/pages/InstructionsPage.tsx`

**Interfaces:**
- `templateOptions` produces exactly `{ goal, key, icon }[]` for `support/support` and `bookService/sales`.
- `onApplyTemplate` consumes an `AgentGoal`.

- [x] **Step 1: Add failing option-contract assertions**

Assert the visible options are exactly `support` then `bookService`, their stored keys are `support` then `sales`, and their labels/descriptions equal `AGENT_GOAL_OPTIONS`.

```ts
expect(templateOptions.map(({ goal, key }) => ({ goal, key }))).toEqual([
  { goal: 'support', key: 'support' },
  { goal: 'bookService', key: 'sales' },
]);
```

- [x] **Step 2: Verify RED**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-setup/agentSetupOptions.test.ts`.

Expected: FAIL because four legacy options are currently visible.

- [x] **Step 3: Implement shared two-option rendering and application**

Use Headphones for Support and CalendarCheck for Book a Service. Render labels and descriptions from `AGENT_GOAL_OPTIONS`. In `InstructionsPage`, derive the stored key with `templateKeyForAgentGoal` and prompt with `buildAgentSystemPrompt`, passing the agent's optional business fields.

```ts
const applyTemplate = (goal: AgentGoal) => {
  setTemplateKey(templateKeyForAgentGoal(goal));
  setSystemPrompt(buildAgentSystemPrompt({
    businessName: agent?.businessName,
    businessDescription: agent?.businessDescription,
    goal,
  }));
};
```

- [x] **Step 4: Verify GREEN and commit**

Run the goal and Agent Setup tests, scoped ESLint, and TypeScript. Commit the five UI files and test with message `Align Agent Setup templates with creation goals`.
