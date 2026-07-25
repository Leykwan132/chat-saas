# Ilmu Mini Default Agent Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Ilmu Mini V3.3 the shared frontend and backend default for newly created agents.

**Architecture:** Export one client-safe `DEFAULT_AGENT_MODEL` constant from the shared plan/model catalog. The Create Agent page uses it for preselection, while the Convex mutation uses it only when the caller omits or empties `model`; explicit selections and existing validation remain unchanged.

**Tech Stack:** TypeScript, React 19, Convex, Vitest, convex-test, Bun

## Global Constraints

- Run every script and test under Node 22 by invoking `nvm use 22` in the same shell command.
- Keep `DEFAULT_OPENROUTER_MODEL` unchanged for OpenRouter-only analytics and conversation fallback paths.
- Do not add dependencies, schema changes, migrations, or deployment steps.
- Do not add comments.
- Do not add a changelog entry until production availability is confirmed.

---

### Task 1: Unify new-agent model defaults

**Files:**
- Modify: `shared/planCatalog.ts:63-79`
- Modify: `src/pages/CreateAgentPage.tsx:26-39,121-126,183`
- Modify: `convex/agents.ts:1-21,141`
- Modify: `convex/llm/modelPricing.test.ts:1-5`
- Modify: `convex/agentModelProvider.test.ts:1-35`
- Create: `src/pages/CreateAgentPage.test.ts`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Produces: `DEFAULT_AGENT_MODEL: "ilmu-mini-v3.3"` from `shared/planCatalog.ts`
- Consumes: `DEFAULT_AGENT_MODEL` in `src/pages/CreateAgentPage.tsx` and `convex/agents.ts`
- Preserves: `DEFAULT_OPENROUTER_MODEL: "deepseek/deepseek-v4-flash"` for existing OpenRouter-only consumers

- [ ] **Step 1: Add failing shared-default and UI source tests**

Update the catalog test import and add the shared-default assertion:

```ts
import {
  DEFAULT_AGENT_MODEL,
  PLAN_CATALOG,
} from "../planCatalog";

test("Ilmu Mini V3.3 is the default agent model", () => {
  expect(DEFAULT_AGENT_MODEL).toBe("ilmu-mini-v3.3");
  expect(listEnabledModels().some((model) => model.value === DEFAULT_AGENT_MODEL)).toBe(true);
});
```

Create `src/pages/CreateAgentPage.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const sourcePath = fileURLToPath(new URL("./CreateAgentPage.tsx", import.meta.url));
const source = readFileSync(sourcePath, "utf8");

test("Create Agent preselects the shared default model", () => {
  expect(source).toContain(
    "import { DEFAULT_AGENT_MODEL } from '../../shared/planCatalog';",
  );
  expect(source.match(/m\.value === DEFAULT_AGENT_MODEL/g)).toHaveLength(2);
  expect(source).not.toContain("const RECOMMENDED_MODEL");
});
```

- [ ] **Step 2: Add the failing backend fallback test**

Add this test to `convex/agentModelProvider.test.ts`, using the same component registration and authenticated setup as the existing provider test:

```ts
test("agents.create defaults to Ilmu Mini V3.3", async () => {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeSchema, {
    public: () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
    private: () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
    "_generated/server": () =>
      import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
  });
  const authed = t.withIdentity({
    subject: "user-agent-ilmu-default",
    email: "ilmu-default@example.com",
  });

  const agentId = await authed.mutation(api.agents.create, {
    name: "Default Ilmu Agent",
    templateKey: "blank",
  });

  const agent = await authed.query(api.agents.get, { agentId });
  expect(agent).toMatchObject({
    model: "ilmu-mini-v3.3",
    provider: "ilmu",
  });
});
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/CreateAgentPage.test.ts convex/llm/modelPricing.test.ts convex/agentModelProvider.test.ts
```

Expected: FAIL because `DEFAULT_AGENT_MODEL` is not exported, Create Agent still owns `RECOMMENDED_MODEL`, and model omission still falls back to DeepSeek V4 Flash.

- [ ] **Step 4: Export and consume the shared default**

Add to `shared/planCatalog.ts` beside the model catalog constants:

```ts
export const DEFAULT_AGENT_MODEL = "ilmu-mini-v3.3";
```

In `src/pages/CreateAgentPage.tsx`, import the constant:

```ts
import { DEFAULT_AGENT_MODEL } from '../../shared/planCatalog';
```

Remove:

```ts
const RECOMMENDED_MODEL = 'deepseek/deepseek-v4-flash';
```

Use the shared constant for both catalog lookups:

```ts
const recommended = enabledModels.find((m: any) => m.value === DEFAULT_AGENT_MODEL);
```

```ts
const recommendedModel = enabledModels?.find(
  (m: any) => m.value === DEFAULT_AGENT_MODEL,
);
```

In `convex/agents.ts`, remove `DEFAULT_OPENROUTER_MODEL` from the model-pricing import, remove `const DEFAULT_MODEL`, and import:

```ts
import { DEFAULT_AGENT_MODEL } from "../shared/planCatalog";
```

Change the mutation fallback to:

```ts
const model = args.model?.trim() || DEFAULT_AGENT_MODEL;
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/CreateAgentPage.test.ts convex/llm/modelPricing.test.ts convex/agentModelProvider.test.ts
```

Expected: PASS for all tests in the three files.

- [ ] **Step 6: Run scoped quality checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint shared/planCatalog.ts src/pages/CreateAgentPage.tsx src/pages/CreateAgentPage.test.ts convex/agents.ts convex/llm/modelPricing.test.ts convex/agentModelProvider.test.ts
```

Expected: exit 0 with no new lint errors.

Run:

```bash
git diff --check
```

Expected: exit 0.

Verify the default is centralized while the OpenRouter constant remains unchanged:

```bash
rg -n 'DEFAULT_AGENT_MODEL|DEFAULT_OPENROUTER_MODEL|RECOMMENDED_MODEL' shared/planCatalog.ts src/pages/CreateAgentPage.tsx convex/agents.ts convex/llm/modelPricing.ts convex/chat/inboxActions.ts convex/analyticsInsights.ts
```

Expected: `DEFAULT_AGENT_MODEL` is exported once and consumed by Create Agent plus `agents.create`; `RECOMMENDED_MODEL` has no matches; `DEFAULT_OPENROUTER_MODEL` remains DeepSeek V4 Flash in its existing OpenRouter-only paths.

- [ ] **Step 7: Update continuity and commit**

Update `CONTINUITY.md` with the implemented state, verification receipt, touched paths, and the fact that no deployment occurred. Do not add a public changelog entry.

```bash
git add shared/planCatalog.ts src/pages/CreateAgentPage.tsx src/pages/CreateAgentPage.test.ts convex/agents.ts convex/llm/modelPricing.test.ts convex/agentModelProvider.test.ts CONTINUITY.md
git commit -m "Default new agents to Ilmu Mini"
```
