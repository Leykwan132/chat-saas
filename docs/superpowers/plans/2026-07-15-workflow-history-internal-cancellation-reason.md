# Workflow History Internal Cancellation Reason Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep cancelled Reminder and Follow-up History rows visible while preventing the exact internal `Workpool job cancelled` reason from reaching the browser.

**Architecture:** Redact the exact internal phrase in the shared Convex history response projection. Persisted worker state remains available for backend diagnostics, and all other user-meaningful reasons continue through the existing shared dialog unchanged.

**Tech Stack:** TypeScript, Convex, convex-test, Vitest, Bun, Node.js 22

## Global Constraints

- Run every script and test with `nvm use 22` in the same shell execution sequence.
- Read `convex/_generated/ai/guidelines.md` before changing Convex code.
- Keep every code file below 300 lines.
- Add no fallback behavior, empty catch blocks, or unnecessary comments.
- Preserve the cancelled history row and `cancelled` status.
- Suppress only the exact `Workpool job cancelled` reason for both `reminder` and `followUp` history.
- Preserve all other cancellation and failure reasons.

---

### Task 1: Redact the internal cancellation reason from history responses

**Files:**
- Modify: `convex/workflowAutomationHistory.test.ts`
- Modify: `convex/workflowAutomationHistory.ts`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `api.workflowAutomationHistory.list({ agentId, automationKind, paginationOpts })`
- Produces: the existing history item shape, with `reason` set to `undefined` only when the stored reason is exactly `Workpool job cancelled`

- [ ] **Step 1: Write a failing query regression test**

Add a test that creates one manageable agent and workflow, inserts internal and meaningful cancelled runs for both automation kinds, queries each history, and asserts exact redaction while preserving rows, statuses, and meaningful reasons:

```typescript
test('redacts internal Workpool cancellation reasons from reminder and follow-up history', async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert('users', {
      workosUserId: 'redaction-owner',
      email: 'redaction@example.com',
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert('teams', {
      type: 'personal',
      name: 'Personal',
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('teamMemberships', { teamId, userId, role: 'owner', createdAt: now });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    const agentId = await ctx.db.insert('agents', {
      name: 'Redaction Agent',
      provider: 'openrouter',
      model: 'deepseek/deepseek-v4-flash',
      systemPrompt: 'Test',
      templateKey: 'blank',
      fileSize: 0,
      userId: 'redaction-owner',
      orgId: '',
      createdAt: now,
      updatedAt: now,
    });
    const workflowId = await ctx.db.insert('workflows', {
      agentId,
      orgId: '',
      userId: 'redaction-owner',
      name: 'Workflow',
      createdAt: now,
      updatedAt: now,
    });
    const cases = [
      { status: 'cancelled', reason: 'Workpool job cancelled' },
      { status: 'cancelled', reason: 'Appointment cancelled' },
      { status: 'failed', reason: 'Provider failed' },
    ] as const;
    for (const automationKind of ['reminder', 'followUp'] as const) {
      for (const [index, historyCase] of cases.entries()) {
        await ctx.db.insert('workflowAutomationRuns', {
          workflowId,
          agentId,
          orgId: '',
          automationKind,
          subjectType: automationKind === 'reminder' ? 'appointment' : 'conversation',
          subjectKey: `${automationKind}-${index}`,
          deduplicationKey: `${automationKind}-${index}`,
          configurationRevision: 1,
          activationScope: 'futureOnly',
          attempt: 1,
          scheduledAt: now + index,
          status: historyCase.status,
          reason: historyCase.reason,
          workIds: [`work-${automationKind}-${index}`],
          templateSnapshot: {
            key: 'history\ten_US',
            name: 'history',
            language: 'en_US',
            category: 'UTILITY',
            components: [],
          },
          createdAt: now + index,
          updatedAt: now + index,
        });
      }
    }
    return { agentId };
  });
  const authed = t.withIdentity({ subject: 'redaction-owner' });
  for (const automationKind of ['reminder', 'followUp'] as const) {
    const history = await authed.query(api.workflowAutomationHistory.list, {
      agentId: fixture.agentId,
      automationKind,
      paginationOpts: { numItems: 25, cursor: null },
    });
    expect(history.page).toHaveLength(3);
    const internalCancellation = history.page.find(
      (row) => row.subjectKey === `${automationKind}-0`,
    );
    expect(internalCancellation?.status).toBe('cancelled');
    expect(internalCancellation?.reason).toBeUndefined();
    expect(history.page.find((row) => row.subjectKey === `${automationKind}-1`)).toMatchObject({
      status: 'cancelled',
      reason: 'Appointment cancelled',
    });
    expect(history.page.find((row) => row.subjectKey === `${automationKind}-2`)).toMatchObject({
      status: 'failed',
      reason: 'Provider failed',
    });
  }
});
```

- [ ] **Step 2: Run the regression test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowAutomationHistory.test.ts
```

Expected: FAIL because the internal row still returns `reason: "Workpool job cancelled"`.

- [ ] **Step 3: Add the minimal API-boundary redaction**

In `convex/workflowAutomationHistory.ts`, define the exact internal value and use it in the existing response projection:

```typescript
const internalCancellationReason = 'Workpool job cancelled';

function userFacingReason(reason: string | undefined) {
  return reason === internalCancellationReason ? undefined : reason;
}
```

Replace the projected reason:

```typescript
reason: userFacingReason(run.reason),
```

- [ ] **Step 4: Run focused verification and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowAutomationHistory.test.ts
```

Expected: PASS with both automation kinds retaining all three rows and only the internal reasons absent.

- [ ] **Step 5: Run targeted lint and repository integrity checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/workflowAutomationHistory.ts convex/workflowAutomationHistory.test.ts
git diff --check
wc -l convex/workflowAutomationHistory.ts convex/workflowAutomationHistory.test.ts
```

Expected: ESLint exits successfully, `git diff --check` emits no output, and both code files remain below 300 lines.

- [ ] **Step 6: Update continuity and commit the implementation**

Record the completed behavior and verification receipt in `CONTINUITY.md`, keeping all section caps intact, then stage only the task files:

```bash
git add convex/workflowAutomationHistory.ts convex/workflowAutomationHistory.test.ts CONTINUITY.md docs/superpowers/plans/2026-07-15-workflow-history-internal-cancellation-reason.md
git commit -m "Hide internal workflow cancellation reasons"
```
