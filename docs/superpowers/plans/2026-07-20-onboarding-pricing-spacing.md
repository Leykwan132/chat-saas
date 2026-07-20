# Onboarding Pricing Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the onboarding plan-selection step use the public pricing page's exact title, section, picker, and card spacing.

**Architecture:** Add one presentational `PlanSelectionLayout` that owns the shared heading and title-to-picker gap. Render the existing pricing and onboarding pickers through it, and remove onboarding's compact-density override so both screens use the picker's existing default spacing path.

**Tech Stack:** React 19, TypeScript 6, Tailwind CSS 4, Vitest 1.6, Bun, Vite

## Global Constraints

- Use Node v22 for every script and test command.
- Keep each code file at or below 300 lines.
- Add no comments.
- Preserve onboarding's page shell, Back action, checkout behavior, loading state, and responsive maximum width.
- Do not change pricing copy, plan data, billing behavior, other onboarding steps, or Convex code.

---

### Task 1: Share the plan-selection layout and default density

**Files:**
- Create: `src/components/pricing/PlanSelectionLayout.test.ts`
- Create: `src/components/pricing/PlanSelectionLayout.tsx`
- Modify: `src/pages/PricingPage.tsx`
- Modify: `src/components/OnboardingFlow.tsx`

**Interfaces:**
- Consumes: `children: ReactNode`
- Produces: `PlanSelectionLayout({ children }: { children: ReactNode }): JSX.Element`

- [ ] **Step 1: Write the failing source contract**

Create `src/components/pricing/PlanSelectionLayout.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const layoutUrl = new URL('./PlanSelectionLayout.tsx', import.meta.url);
const layoutSource = existsSync(layoutUrl) ? readFileSync(layoutUrl, 'utf8') : '';
const pricingSource = readFileSync(new URL('../../pages/PricingPage.tsx', import.meta.url), 'utf8');
const onboardingSource = readFileSync(new URL('../OnboardingFlow.tsx', import.meta.url), 'utf8');

test('pricing and onboarding share the full-size plan-selection layout', () => {
  expect(layoutSource).toContain('className="flex flex-col gap-10"');
  expect(layoutSource).toContain(
    'className="font-title text-center text-4xl font-normal tracking-tight sm:text-5xl"',
  );
  expect(pricingSource).toContain('<PlanSelectionLayout>');
  expect(onboardingSource).toContain('<PlanSelectionLayout>');
  expect(pricingSource).not.toContain('Choose your plan');
  expect(onboardingSource).not.toContain('Choose your plan');
  expect(onboardingSource).not.toContain('density="compact"');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/pricing/PlanSelectionLayout.test.ts
```

Expected: FAIL because `PlanSelectionLayout.tsx` does not exist and the two pages still own separate headings; onboarding also contains `density="compact"`.

- [ ] **Step 3: Add the shared layout**

Create `src/components/pricing/PlanSelectionLayout.tsx`:

```tsx
import type { ReactNode } from 'react';

export function PlanSelectionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-title text-center text-4xl font-normal tracking-tight sm:text-5xl">
        Choose your plan
      </h1>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Use the shared layout on the pricing page**

Add:

```tsx
import { PlanSelectionLayout } from '@/components/pricing/PlanSelectionLayout';
```

Replace the local `flex flex-col gap-10` wrapper and heading in `PricingPage` with:

```tsx
<PlanSelectionLayout>
  <SubscriptionPlanPicker
    variant="pricing"
    enterpriseLayout="column"
    includeEnterprise
    billingInterval={billingInterval}
    onBillingIntervalChange={setBillingInterval}
    disabled={submitting}
    renderPlanAction={(p) => {
      if (p.isEnterprise) {
        return <EnterprisePlanAction label="Contact our sales" />;
      }

      return (
        <SubscriptionPlanActionButton
          planId={p.id}
          emphasizeRecommended={p.id === 'growth'}
          disabled={submitting}
          loading={submitting && selectedPlan === p.id}
          label={
            submitting && selectedPlan === p.id ? (
              <Spinner className="size-3.5" />
            ) : (
              p.actionLabel
            )
          }
          onClick={() => void handlePlanSelect(p.id)}
        />
      );
    }}
  />
</PlanSelectionLayout>
```

- [ ] **Step 5: Use the shared layout and full-size density in onboarding**

Add:

```tsx
import { PlanSelectionLayout } from '@/components/pricing/PlanSelectionLayout';
```

Replace the local title/picker wrapper with:

```tsx
<PlanSelectionLayout>
  <SubscriptionPlanPicker
    variant="pricing"
    enterpriseLayout="column"
    includeEnterprise
    billingInterval={billingInterval}
    onBillingIntervalChange={setBillingInterval}
    disabled={submitting}
    renderPlanAction={(p) => {
      if (p.isEnterprise) {
        return <EnterprisePlanAction label="Contact our sales" />;
      }

      return (
        <SubscriptionPlanActionButton
          planId={p.id}
          disabled={submitting}
          loading={submitting && selectedPlan === p.id}
          label={
            submitting && selectedPlan === p.id ? (
              <Spinner className="size-3.5" />
            ) : (
              p.actionLabel
            )
          }
          onClick={() => {
            setSelectedPlan(p.id);
            void handleComplete(p.id);
          }}
        />
      );
    }}
  />
</PlanSelectionLayout>
```

Keep the existing Back action as the second child of the outer `motion.div`.

- [ ] **Step 6: Run the focused test and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/pricing/PlanSelectionLayout.test.ts
```

Expected: PASS with one test.

- [ ] **Step 7: Run targeted lint**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/pricing/PlanSelectionLayout.tsx src/components/pricing/PlanSelectionLayout.test.ts src/pages/PricingPage.tsx src/components/OnboardingFlow.tsx
```

Expected: PASS with no warnings or errors.

- [ ] **Step 8: Run the frontend regression suite**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run
```

Expected: PASS with all test files and tests green.

- [ ] **Step 9: Run the production build**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected: TypeScript and Vite build complete successfully; the existing chunk-size warning is acceptable.

- [ ] **Step 10: Run final static checks**

Run:

```bash
git diff --check
wc -l src/components/pricing/PlanSelectionLayout.tsx src/components/pricing/PlanSelectionLayout.test.ts src/pages/PricingPage.tsx src/components/OnboardingFlow.tsx
```

Expected: no whitespace errors; the two new files are below 300 lines. `PricingPage.tsx` remains below 300 lines. `OnboardingFlow.tsx` is pre-existing and above 300 lines; this focused change must not increase its responsibilities.

- [ ] **Step 11: Commit the implementation**

Run:

```bash
git add src/components/pricing/PlanSelectionLayout.tsx src/components/pricing/PlanSelectionLayout.test.ts src/pages/PricingPage.tsx src/components/OnboardingFlow.tsx CONTINUITY.md
git commit -m "Match onboarding pricing spacing"
```

Expected: one implementation commit containing only the shared layout, its source contract, the two consumers, and the continuity update.
