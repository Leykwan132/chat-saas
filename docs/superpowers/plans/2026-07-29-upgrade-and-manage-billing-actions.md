# Upgrade and Manage Billing Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use a trailing CircleArrowUp for Upgrade and provide a text-style Manage billing action that opens Stripe Portal in a new tab.

**Architecture:** Keep billing side effects in the root Adjust Plan provider. Extract the Portal-session redirect boundary into a small tested helper, expose a direct `openBillingPortal` context action, and consume it only from Settings → Plan.

**Tech Stack:** React 19, TypeScript, Convex actions, Stripe Customer Portal, Lucide React, Vitest

## Global Constraints

- `Upgrade` continues to open the Adjust Plan picker.
- `Adjust plan` continues to open the Adjust Plan picker.
- `Manage billing` bypasses the picker and opens Stripe Customer Portal.
- Checkout, team-Free warnings, cancellation routing, public Pricing, and onboarding remain unchanged.
- Use Node.js 22 for every script and test.
- Keep every code file below 300 lines.

---

Tasks 1 and 2 are complete. Task 3 supersedes their icon, button treatment, and direct-Portal tab target while preserving their provider boundary.

### Task 1: Direct Billing Portal Action

**Files:**
- Create: `src/components/billing/billingPortalNavigation.ts`
- Create: `src/components/billing/billingPortalNavigation.test.ts`
- Modify: `src/components/billing/adjustPlanContext.ts`
- Modify: `src/components/billing/AdjustPlanProvider.tsx`

**Interfaces:**
- Produces: `openBillingPortalNavigation(options): Promise<void>`
- Produces: `AdjustPlanContextValue.openBillingPortal: () => void`
- Consumes: existing `api.stripe.createPortal` action and provider return-path builder

- [ ] **Step 1: Write the failing Portal navigation test**

```ts
import { expect, test } from 'vitest';
import { openBillingPortalNavigation } from './billingPortalNavigation';

test('opens the returned Stripe billing portal URL', async () => {
  let assignedUrl: string | null = null;

  await openBillingPortalNavigation({
    createPortal: async ({ returnPath }) => ({
      url: `https://billing.stripe.test?return=${encodeURIComponent(returnPath)}`,
    }),
    returnPath: '/workspace/settings?section=plan',
    assign: (url) => {
      assignedUrl = url;
    },
  });

  expect(assignedUrl).toBe(
    'https://billing.stripe.test?return=%2Fworkspace%2Fsettings%3Fsection%3Dplan',
  );
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/billing/billingPortalNavigation.test.ts
```

Expected: FAIL because `billingPortalNavigation` does not exist.

- [ ] **Step 3: Implement the Portal navigation boundary**

```ts
type CreatePortal = (args: {
  returnPath: string;
}) => Promise<{ url?: string | null } | null>;

export async function openBillingPortalNavigation({
  createPortal,
  returnPath,
  assign,
}: {
  createPortal: CreatePortal;
  returnPath: string;
  assign: (url: string) => void;
}) {
  const session = await createPortal({ returnPath });
  if (!session?.url) {
    throw new Error('Could not load billing portal.');
  }
  assign(session.url);
}
```

Update the provider's existing Portal callback to use the helper. Expose `openBillingPortal`, enforce the same billing-profile and owner checks as `openAdjustPlan`, and call the existing Portal callback with the current plan solely to reuse its loading state.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/billing/billingPortalNavigation.test.ts src/components/billing/adjustPlanFlow.test.ts
```

Expected: 2 test files pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/billing/billingPortalNavigation.ts src/components/billing/billingPortalNavigation.test.ts src/components/billing/adjustPlanContext.ts src/components/billing/AdjustPlanProvider.tsx
git commit -m "Expose direct billing portal action"
```

### Task 2: Upgrade and Settings Presentation

**Files:**
- Modify: `src/components/CreditMeter.tsx`
- Modify: `src/components/PlanTab.tsx`

**Interfaces:**
- Consumes: `useAdjustPlan().openBillingPortal`
- Preserves: `useAdjustPlan().openAdjustPlan`

- [ ] **Step 1: Replace the Upgrade icon**

Change the Lucide import from `Settings` to `Rocket`, then render:

```tsx
<Rocket className="size-2.5" />
```

Keep the existing `Upgrade` label, button style, and `openAdjustPlan` click handler.

- [ ] **Step 2: Add the secondary Manage billing action**

Read `openBillingPortal` from `useAdjustPlan()`. Beside the primary Adjust plan button, render:

```tsx
<Button
  type="button"
  size="sm"
  variant="outline"
  onClick={openBillingPortal}
  disabled={isAdjustPlanLoading}
>
  {isAdjustPlanLoading ? <Spinner /> : null}
  Manage billing
</Button>
```

- [ ] **Step 3: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/billing/billingPortalNavigation.test.ts src/components/billing/adjustPlanFlow.test.ts src/components/PlanTab.test.ts
```

Expected: 3 test files pass.

- [ ] **Step 4: Run static verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx eslint src/components/billing/billingPortalNavigation.ts src/components/billing/billingPortalNavigation.test.ts src/components/billing/adjustPlanContext.ts src/components/billing/AdjustPlanProvider.tsx src/components/CreditMeter.tsx src/components/PlanTab.tsx
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bun run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/CreditMeter.tsx src/components/PlanTab.tsx
git commit -m "Clarify upgrade and billing actions"
```

### Task 3: New-Tab Billing Presentation Refinement

**Files:**
- Modify: `src/components/billing/billingPortalNavigation.ts`
- Modify: `src/components/billing/billingPortalNavigation.test.ts`
- Modify: `src/components/billing/AdjustPlanProvider.tsx`
- Modify: `src/components/CreditMeter.tsx`
- Modify: `src/components/PlanTab.tsx`

**Interfaces:**
- Produces: `openBillingPortalInNewWindow(options): Promise<void>`
- Consumes: existing `openBillingPortalNavigation(options): Promise<void>`
- Preserves: same-tab Portal navigation for plan changes

- [ ] **Step 1: Add failing new-tab lifecycle tests**

Add three tests using local state instead of mock assertions:

```ts
test('reserves a new tab before requesting the Portal session', async () => {
  const events: string[] = [];
  let assignedUrl: string | null = null;
  const portalWindow = {
    opener: {} as unknown,
    location: {
      assign: (url: string) => {
        events.push('assign');
        assignedUrl = url;
      },
    },
    close: () => {
      events.push('close');
    },
  };

  await openBillingPortalInNewWindow({
    createPortal: async () => {
      events.push('create');
      return { url: 'https://billing.stripe.test' };
    },
    returnPath: '/workspace/settings?section=plan',
    openWindow: () => {
      events.push('open');
      return portalWindow;
    },
  });

  expect(events).toEqual(['open', 'create', 'assign']);
  expect(portalWindow.opener).toBeNull();
  expect(assignedUrl).toBe('https://billing.stripe.test');
});

test('does not request a Portal session when the browser blocks the tab', async () => {
  let createCount = 0;

  await expect(
    openBillingPortalInNewWindow({
      createPortal: async () => {
        createCount += 1;
        return { url: 'https://billing.stripe.test' };
      },
      returnPath: '/workspace/settings?section=plan',
      openWindow: () => null,
    }),
  ).rejects.toThrow('Allow pop-ups to manage billing.');

  expect(createCount).toBe(0);
});

test('closes the reserved tab when Portal creation fails', async () => {
  let closed = false;

  await expect(
    openBillingPortalInNewWindow({
      createPortal: async () => null,
      returnPath: '/workspace/settings?section=plan',
      openWindow: () => ({
        opener: null,
        location: { assign: () => undefined },
        close: () => {
          closed = true;
        },
      }),
    }),
  ).rejects.toThrow('Could not load billing portal.');

  expect(closed).toBe(true);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/billing/billingPortalNavigation.test.ts
```

Expected: FAIL because `openBillingPortalInNewWindow` does not exist.

- [ ] **Step 3: Implement synchronous tab reservation**

Add a small window interface and implement:

```ts
type BillingPortalWindow = {
  opener: unknown;
  location: { assign: (url: string) => void };
  close: () => void;
};

export async function openBillingPortalInNewWindow({
  createPortal,
  returnPath,
  openWindow,
}: {
  createPortal: CreatePortal;
  returnPath: string;
  openWindow: () => BillingPortalWindow | null;
}) {
  const portalWindow = openWindow();
  if (!portalWindow) {
    throw new Error('Allow pop-ups to manage billing.');
  }
  portalWindow.opener = null;
  try {
    await openBillingPortalNavigation({
      createPortal,
      returnPath,
      assign: (url) => portalWindow.location.assign(url),
    });
  } catch (error) {
    portalWindow.close();
    throw error;
  }
}
```

Update the provider's direct Manage billing path to use `window.open('about:blank', '_blank')`. Keep plan-selection Portal redirects in the current tab.

- [ ] **Step 4: Refine the two action presentations**

Render the credit-meter action in this order:

```tsx
{resolvePlanEntryLabel('credit_meter')}
<CircleArrowUp className="size-2.5" />
```

Render Manage billing as:

```tsx
<Button
  type="button"
  size="sm"
  variant="link"
  className="px-0"
  onClick={openBillingPortal}
  disabled={isAdjustPlanLoading}
>
  {isAdjustPlanLoading ? <Spinner /> : <ExternalLink className="size-3.5" />}
  Manage billing
</Button>
```

- [ ] **Step 5: Run focused and static verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/billing/billingPortalNavigation.test.ts src/components/billing/adjustPlanFlow.test.ts src/components/PlanTab.test.ts
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx eslint src/components/billing/billingPortalNavigation.ts src/components/billing/billingPortalNavigation.test.ts src/components/billing/AdjustPlanProvider.tsx src/components/CreditMeter.tsx src/components/PlanTab.tsx
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bun run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/plans/2026-07-29-upgrade-and-manage-billing-actions.md src/components/billing/billingPortalNavigation.ts src/components/billing/billingPortalNavigation.test.ts src/components/billing/AdjustPlanProvider.tsx src/components/CreditMeter.tsx src/components/PlanTab.tsx
git commit -m "Refine billing action presentation"
```
