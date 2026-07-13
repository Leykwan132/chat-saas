# Follow-up Message Activation Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent any follow-up from becoming active until every configured attempt has a selected message template, with clear inline red feedback in both activation surfaces.

**Architecture:** A dependency-free shared module defines message readiness and the canonical error copy for both React and Convex. The two existing pages only wire that rule into their switches and inline feedback, while Convex mutations enforce the same invariant for non-UI callers.

**Tech Stack:** React 19, TypeScript 6, Convex, Vitest 1.6, Tailwind CSS, shadcn Switch.

## Global Constraints

- Use Node v22 for every script and test command.
- Keep new code files below 300 lines and avoid expanding the responsibilities of the two existing oversized page files.
- Add no default fallbacks and no empty `try`/`catch` blocks.
- Add no comments unless a non-obvious workaround cannot be expressed in code.
- Use the exact inline copy: `You need to select a message first.`
- “Same message” requires its shared template; “Different messages” requires a template for every configured attempt.
- Incomplete inactive follow-ups are allowed; incomplete active follow-ups are rejected.

---

### Task 1: Shared message readiness contract

**Files:**
- Create: `shared/followUpMessageReadiness.ts`
- Create: `shared/followUpMessageReadiness.test.ts`

**Interfaces:**
- Consumes: attempt objects containing `templateName: string`.
- Produces: `FOLLOW_UP_MESSAGE_REQUIRED_ERROR` and `hasCompleteFollowUpMessages(attempts): boolean`.

- [ ] **Step 1: Write the failing readiness tests**

```ts
import { describe, expect, test } from 'vitest';
import {
  FOLLOW_UP_MESSAGE_REQUIRED_ERROR,
  hasCompleteFollowUpMessages,
} from './followUpMessageReadiness';

describe('follow-up message readiness', () => {
  test('uses the approved activation error copy', () => {
    expect(FOLLOW_UP_MESSAGE_REQUIRED_ERROR).toBe('You need to select a message first.');
  });

  test('requires at least one selected message', () => {
    expect(hasCompleteFollowUpMessages([])).toBe(false);
    expect(hasCompleteFollowUpMessages([{ templateName: '' }])).toBe(false);
    expect(hasCompleteFollowUpMessages([{ templateName: '   ' }])).toBe(false);
  });

  test('accepts a complete shared-message configuration', () => {
    expect(hasCompleteFollowUpMessages([{ templateName: 'follow_up_en' }])).toBe(true);
  });

  test('rejects a different-message configuration with any missing template', () => {
    expect(hasCompleteFollowUpMessages([
      { templateName: 'first' },
      { templateName: '' },
      { templateName: 'third' },
    ])).toBe(false);
  });

  test('accepts a different-message configuration when every attempt is selected', () => {
    expect(hasCompleteFollowUpMessages([
      { templateName: 'first' },
      { templateName: 'second' },
    ])).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run shared/followUpMessageReadiness.test.ts`

Expected: FAIL because `shared/followUpMessageReadiness.ts` does not exist.

- [ ] **Step 3: Implement the shared contract**

```ts
export const FOLLOW_UP_MESSAGE_REQUIRED_ERROR = 'You need to select a message first.';

type FollowUpMessageAttempt = {
  templateName: string;
};

export function hasCompleteFollowUpMessages(attempts: FollowUpMessageAttempt[]) {
  return attempts.length > 0 && attempts.every(({ templateName }) => templateName.trim().length > 0);
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run shared/followUpMessageReadiness.test.ts`

Expected: 5 tests pass.

- [ ] **Step 5: Commit the shared contract**

```bash
git add shared/followUpMessageReadiness.ts shared/followUpMessageReadiness.test.ts
git commit -m "Add follow-up message readiness contract"
```

### Task 2: Convex active-record enforcement

**Files:**
- Modify: `convex/whatsappFollowUp.ts`
- Create: `convex/whatsappFollowUpActivation.test.ts`

**Interfaces:**
- Consumes: `FOLLOW_UP_MESSAGE_REQUIRED_ERROR` and `hasCompleteFollowUpMessages` from Task 1.
- Produces: `assertActiveFollowUpMessages(isActive, attempts): void`, used by create, update, and activation mutations.

- [ ] **Step 1: Write failing Convex mutation tests**

Create a focused test fixture with `convexTest(schema, modules)`, an authenticated identity `{ subject: 'follow-up-owner', orgId: 'follow-up-org' }`, and directly inserted agent, channel, and inactive follow-up documents. Add tests that:

```ts
await expect(authed.mutation(api.whatsappFollowUp.createFollowUpRule, {
  agentId,
  channelId,
  name: 'Missing message',
  attempts: [{ attemptNumber: 1, templateName: '', templateLanguage: 'en' }],
  maxAttempts: 1,
  triggerDelayHours: 24,
  intervalHours: 24,
  audienceLeadTemperatures: ['Hot'],
  isActive: true,
  estimatedCostPerCustomer: 0,
})).rejects.toThrow(FOLLOW_UP_MESSAGE_REQUIRED_ERROR);

await expect(authed.mutation(api.whatsappFollowUp.setFollowUpRuleActive, {
  id: incompleteRuleId,
  isActive: true,
})).rejects.toThrow(FOLLOW_UP_MESSAGE_REQUIRED_ERROR);

await expect(authed.mutation(api.whatsappFollowUp.updateFollowUpRule, {
  id: incompleteRuleId,
  name: 'Paused draft',
  attempts: [{ attemptNumber: 1, templateName: '', templateLanguage: 'en' }],
  maxAttempts: 1,
  triggerDelayHours: 24,
  intervalHours: 24,
  audienceLeadTemperatures: ['Hot'],
  isActive: false,
  estimatedCostPerCustomer: 0,
})).resolves.toEqual({ success: true });
```

Also assert the inactive rule remains inactive after the rejected activation.

- [ ] **Step 2: Run the Convex test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappFollowUpActivation.test.ts`

Expected: FAIL because create and activation do not apply the readiness invariant and inactive update currently rejects missing templates.

- [ ] **Step 3: Add the invariant to all write paths**

Import the shared contract and add:

```ts
function assertActiveFollowUpMessages(
  isActive: boolean,
  attempts: Array<{ templateName: string }>,
) {
  if (isActive && !hasCompleteFollowUpMessages(attempts)) {
    throw new Error(FOLLOW_UP_MESSAGE_REQUIRED_ERROR);
  }
}
```

Call it in `createFollowUpRule` before the plan lookup, in `updateFollowUpRule` before the conditional plan lookup, and in `setFollowUpRuleActive` with `rule.attempts` before the conditional plan lookup. Remove the unconditional `invalidAttempts` rejection from update so incomplete inactive drafts remain valid. Preserve attempt-count, name, audience, ownership, and plan checks.

- [ ] **Step 4: Run focused backend tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappFollowUpActivation.test.ts convex/whatsappFollowUp.test.ts`

Expected: all focused Convex tests pass.

- [ ] **Step 5: Commit backend enforcement**

```bash
git add convex/whatsappFollowUp.ts convex/whatsappFollowUpActivation.test.ts
git commit -m "Enforce messages before follow-up activation"
```

### Task 3: New follow-up activation feedback

**Files:**
- Modify: `src/pages/AutomationsFollowUpPage.tsx`
- Create: `src/pages/AutomationsFollowUpActivation.test.ts`

**Interfaces:**
- Consumes: shared readiness helper and error constant from Task 1.
- Produces: creation-page switch behavior that stays off and displays inline red feedback when messages are incomplete.

- [ ] **Step 1: Write a failing source-contract test**

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const source = readFileSync(
  fileURLToPath(new URL('./AutomationsFollowUpPage.tsx', import.meta.url)),
  'utf8',
);

test('new follow-up activation blocks incomplete messages with inline feedback', () => {
  expect(source).toContain('hasCompleteFollowUpMessages(attempts)');
  expect(source).toContain('setShowMessageRequiredError(true)');
  expect(source).toContain('FOLLOW_UP_MESSAGE_REQUIRED_ERROR');
  expect(source).toContain('text-destructive');
});

test('paused creation does not require selected messages', () => {
  expect(source).toContain('if (isActiveOnCreate && !messagesReady)');
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/AutomationsFollowUpActivation.test.ts`

Expected: FAIL because the page has no readiness guard or inline warning state.

- [ ] **Step 3: Wire the creation switch and submit guard**

Import the shared helper and constant. Add `showMessageRequiredError` state, derive `messagesReady`, and replace the raw setter with a handler that keeps the switch off and sets the warning when `next === true && !messagesReady`. Clear the warning in an effect when `messagesReady` becomes true. Change submit validation from unconditional missing-attempt rejection to:

```ts
if (isActiveOnCreate && !messagesReady) {
  setShowMessageRequiredError(true);
  return;
}
```

Render directly beneath the activation row:

```tsx
{showMessageRequiredError && (
  <p className="text-[11px] font-semibold text-destructive">
    {FOLLOW_UP_MESSAGE_REQUIRED_ERROR}
  </p>
)}
```

- [ ] **Step 4: Run focused frontend tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run shared/followUpMessageReadiness.test.ts src/pages/AutomationsFollowUpActivation.test.ts`

Expected: all focused tests pass.

- [ ] **Step 5: Commit creation-page feedback**

```bash
git add src/pages/AutomationsFollowUpPage.tsx src/pages/AutomationsFollowUpActivation.test.ts
git commit -m "Prompt for messages before creating active follow-up"
```

### Task 4: Existing follow-up activation feedback and final verification

**Files:**
- Modify: `src/pages/FollowUpDetailPage.tsx`
- Create: `src/pages/FollowUpDetailActivation.test.ts`
- Modify: `CONTINUITY.md`
- Include: `.gitignore`
- Include: `docs/superpowers/specs/2026-07-13-follow-up-message-activation-guard-design.md`
- Include: `docs/superpowers/plans/2026-07-13-follow-up-message-activation-guard.md`

**Interfaces:**
- Consumes: shared readiness helper and error constant from Task 1.
- Produces: detail-page activation blocking, inline feedback, complete verification receipts, and tracked project artifacts.

- [ ] **Step 1: Write a failing detail-page source-contract test**

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const source = readFileSync(
  fileURLToPath(new URL('./FollowUpDetailPage.tsx', import.meta.url)),
  'utf8',
);

test('existing follow-up activation blocks incomplete messages before confirmation', () => {
  const handler = source.match(/const requestActiveChange = \(next: boolean\) => \{[\s\S]*?\n {2}\};/);
  expect(handler?.[0]).toContain('next && !messagesReady');
  expect(handler?.[0]).toContain('setShowMessageRequiredError(true)');
  expect(handler?.[0]).not.toContain('setActiveConfirmOpen(true);\n    }');
  expect(source).toContain('FOLLOW_UP_MESSAGE_REQUIRED_ERROR');
  expect(source).toContain('text-destructive');
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/FollowUpDetailActivation.test.ts`

Expected: FAIL because activation always opens confirmation.

- [ ] **Step 3: Wire the detail-page activation guard**

Import the shared helper and constant. Add `showMessageRequiredError`, derive `messagesReady`, and make `requestActiveChange` return early with the warning when `next && !messagesReady`. Clear the warning when readiness becomes true. Render the error beneath the header’s activation switch while retaining the current Active/Inactive label and unrestricted deactivation behavior.

- [ ] **Step 4: Run all focused tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run shared/followUpMessageReadiness.test.ts convex/whatsappFollowUpActivation.test.ts convex/whatsappFollowUp.test.ts src/pages/AutomationsFollowUpActivation.test.ts src/pages/FollowUpDetailActivation.test.ts`

Expected: all focused tests pass with no warnings or unhandled errors.

- [ ] **Step 5: Run proportional static verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint shared/followUpMessageReadiness.ts shared/followUpMessageReadiness.test.ts convex/whatsappFollowUp.ts convex/whatsappFollowUpActivation.test.ts src/pages/AutomationsFollowUpPage.tsx src/pages/AutomationsFollowUpActivation.test.ts src/pages/FollowUpDetailPage.tsx src/pages/FollowUpDetailActivation.test.ts`

Expected: zero ESLint errors.

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b`

Expected: exit code 0.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 6: Update continuity with implementation receipts**

Replace the design-only snapshot with a concise `[CODE]` completion statement and add focused test, ESLint, TypeScript, and diff-check results to Receipts. Keep Snapshot, Done, Working set, and Receipts within their documented caps.

- [ ] **Step 7: Commit the completed feature**

```bash
git add .gitignore CONTINUITY.md shared/followUpMessageReadiness.ts shared/followUpMessageReadiness.test.ts convex/whatsappFollowUp.ts convex/whatsappFollowUpActivation.test.ts src/pages/AutomationsFollowUpPage.tsx src/pages/AutomationsFollowUpActivation.test.ts src/pages/FollowUpDetailPage.tsx src/pages/FollowUpDetailActivation.test.ts docs/superpowers/specs/2026-07-13-follow-up-message-activation-guard-design.md docs/superpowers/plans/2026-07-13-follow-up-message-activation-guard.md
git commit -m "Require messages before follow-up activation"
```

Do not stage `.superpowers/` contents as part of this feature unless the user explicitly selects those files for inclusion.
