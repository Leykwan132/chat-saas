# Gated Feature Upgrade Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every interactive paid-feature gate show UpgradeModal before Adjust Plan, while explicit Upgrade and Adjust Plan actions continue opening Adjust Plan directly.

**Architecture:** Restore one root UpgradeModal provider inside the existing Adjust Plan provider and keep their contexts separate. Feature gates call `openUpgradeModal`; the teaser closes itself before calling `openAdjustPlan`. Explicit billing actions and the existing inline full-page UpgradeCard continue calling `openAdjustPlan` directly.

**Tech Stack:** React 19, TypeScript, Convex React, Radix-backed shadcn Dialog, Vitest

## Global Constraints

- Explicit Upgrade and Adjust Plan actions always open Adjust Plan directly.
- Every other interactive plan gate opens UpgradeModal first.
- UpgradeModal's action closes UpgradeModal and opens Adjust Plan.
- Adjust Plan keeps a simple “Choose your plan” header without a secondary Manage plan action.
- UpgradeModal never opens Stripe directly.
- Preserve non-billing restriction messages and backend entitlement checks.
- Keep locked models visible and clickable without making them selectable.
- Reuse existing shadcn Dialog and UpgradeCard components; install no new UI component.
- Keep every code file below 300 lines and add no comments.
- Use Node.js 22 in the same shell command for every test and build.

---

### Task 1: Shared UpgradeModal controller and root provider

**Files:**
- Create: `src/components/upgradeModalContext.ts`
- Create: `src/components/upgradeModalFlow.ts`
- Create: `src/components/upgradeModalFlow.test.ts`
- Create: `src/components/UpgradeModalProvider.tsx`
- Modify: `src/components/UpgradeModal.tsx`
- Modify: `src/router/AppRouteComponents.tsx`

**Interfaces:**
- Produces: `useUpgradeModal(): { openUpgradeModal: (scenario?: UpgradeScenario) => void; closeUpgradeModal: () => void }`.
- Produces: `resolveUpgradeScenario(plan: PlanKey): UpgradeScenario`.
- Extends: `UpgradeCard` with optional `onUpgrade?: () => void`; absence preserves direct `openAdjustPlan`.
- Consumes: `useAdjustPlan().openAdjustPlan`.

- [ ] **Step 1: Write the failing scenario tests**

Create `src/components/upgradeModalFlow.test.ts` with literal expectations:

```ts
import { describe, expect, test } from 'vitest';
import { resolveUpgradeScenario } from './upgradeModalFlow';

describe('resolveUpgradeScenario', () => {
  test.each([
    ['free', 'free_to_starter'],
    ['starter', 'starter_to_growth'],
    ['growth', 'growth_to_business'],
    ['business', 'growth_to_business'],
  ] as const)('maps %s to %s', (plan, expected) => {
    expect(resolveUpgradeScenario(plan)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/upgradeModalFlow.test.ts
```

Expected: FAIL because `upgradeModalFlow.ts` does not exist.

- [ ] **Step 3: Implement the scenario resolver and context**

Create `upgradeModalFlow.ts`:

```ts
import type { PlanKey } from '../../shared/planCatalog';
import type { UpgradeScenario } from './UpgradeModal';

export function resolveUpgradeScenario(plan: PlanKey): UpgradeScenario {
  if (plan === 'free') return 'free_to_starter';
  if (plan === 'starter') return 'starter_to_growth';
  return 'growth_to_business';
}
```

Create `upgradeModalContext.ts`:

```ts
import { createContext, useContext } from 'react';
import type { UpgradeScenario } from './UpgradeModal';

export type UpgradeModalContextValue = {
  openUpgradeModal: (scenario?: UpgradeScenario) => void;
  closeUpgradeModal: () => void;
};

export const UpgradeModalContext =
  createContext<UpgradeModalContextValue | undefined>(undefined);

export function useUpgradeModal() {
  const context = useContext(UpgradeModalContext);
  if (!context) {
    throw new Error('useUpgradeModal must be used within UpgradeModalProvider');
  }
  return context;
}
```

- [ ] **Step 4: Run the resolver test and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/upgradeModalFlow.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add the provider and teaser-to-picker transition**

Implement `UpgradeModalProvider` with:

```tsx
const [open, setOpen] = useState(false);
const [scenario, setScenario] =
  useState<UpgradeScenario>('free_to_starter');

const openUpgradeModal = useCallback(
  (requestedScenario?: UpgradeScenario) => {
    if (requestedScenario) {
      setScenario(requestedScenario);
      setOpen(true);
      return;
    }
    if (!planAndUsage) {
      toast.error('Your plan is not available yet.');
      return;
    }
    setScenario(resolveUpgradeScenario(planAndUsage.plan as PlanKey));
    setOpen(true);
  },
  [planAndUsage],
);

const continueToAdjustPlan = useCallback(() => {
  setOpen(false);
  openAdjustPlan();
}, [openAdjustPlan]);
```

Render one controlled shadcn `Dialog` with `DialogContent`, an accessible `DialogTitle`, and `UpgradeCard scenario={scenario} onUpgrade={continueToAdjustPlan}`. `Dialog` closure updates only the teaser state.

Update `UpgradeCard`:

```tsx
export function UpgradeCard({
  scenario = 'free_to_starter',
  title,
  description,
  onUpgrade,
}: {
  scenario?: UpgradeScenario;
  title?: string;
  description?: string;
  onUpgrade?: () => void;
}) {
  const { openAdjustPlan, isAdjustPlanLoading } = useAdjustPlan();
  const handleUpgrade = onUpgrade ?? openAdjustPlan;
```

Use `handleUpgrade` for the existing button. Keep the inline `PlanFeatureGate` behavior unchanged because it supplies no override.

- [ ] **Step 6: Mount the provider once**

Nest the provider inside `AdjustPlanProvider`:

```tsx
<AdjustPlanProvider>
  <UpgradeModalProvider>
    <PostHogIdentifier />
    <ScrollToTop />
    <Outlet />
    <Toaster />
  </UpgradeModalProvider>
</AdjustPlanProvider>
```

- [ ] **Step 7: Run focused tests and commit**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/upgradeModalFlow.test.ts
```

Expected: PASS.

Commit only the shared modal files:

```bash
git add src/components/upgradeModalContext.ts src/components/upgradeModalFlow.ts src/components/upgradeModalFlow.test.ts src/components/UpgradeModalProvider.tsx src/components/UpgradeModal.tsx src/router/AppRouteComponents.tsx
git commit -m "Add shared gated-feature upgrade modal"
```

### Task 2: Team creation and member gates

**Files:**
- Modify: `src/lib/teamCreationGate.ts`
- Modify: `src/lib/teamCreationGate.test.ts`
- Modify: `src/components/CreateTeamDialog.tsx`
- Modify: `src/components/CreateTeamDialog.test.ts`
- Modify: `src/components/TeamSwitcher.tsx`
- Modify: `src/components/TeamsAccountSubmenu.tsx`
- Modify: `src/components/teams/TeamsTableSection.tsx`
- Modify: `src/pages/CreateTeamPage.tsx`

**Interfaces:**
- Consumes: `useUpgradeModal().openUpgradeModal`.
- Preserves: `resolveTeamCreationGate(result): 'loading' | 'allowed' | 'upgrade' | 'blocked'`.
- Changes: the final callback parameter of `handleCreateTeamGate` represents `openUpgradeModal`, not `openAdjustPlan`.

- [ ] **Step 1: Change the existing dialog regression expectation and verify RED**

Update `CreateTeamDialog.test.ts` so the upgrade branch expects `openUpgradeModal()` before the form opens and rejects `openAdjustPlan()` inside `handleOpenChange`.

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/CreateTeamDialog.test.ts src/lib/teamCreationGate.test.ts
```

Expected: FAIL because the current upgrade branches call `openAdjustPlan`.

- [ ] **Step 2: Route all team-creation gates through UpgradeModal**

Change the shared handler parameter and branch:

```ts
export function handleCreateTeamGate(
  canCreateOrgTeam: CanCreateOrgTeamResult,
  onAllowed: () => void,
  navigate: NavigateFunction,
  planPath = DEFAULT_PLAN_PATH,
  openUpgradeModal?: () => void,
) {
  const decision = resolveTeamCreationGate(canCreateOrgTeam);

  if (decision === 'loading') return;
  if (decision === 'allowed') {
    onAllowed();
    return;
  }
  if (decision === 'upgrade') {
    if (openUpgradeModal) {
      openUpgradeModal();
    } else {
      showTeamCreationUpgradeToast(navigate, planPath);
    }
    return;
  }
  toast.message(canCreateOrgTeam.reason ?? 'You cannot create a team right now.');
}
```

Use `useUpgradeModal` in `CreateTeamDialog`, `TeamSwitcher`, `TeamsAccountSubmenu`, `TeamsTableSection`, and `CreateTeamPage`. Replace only plan-upgrade branches; preserve blocked messages, allowed navigation, and submit-time checks.

- [ ] **Step 3: Route member-limit branches through UpgradeModal**

In `TeamSwitcher` and `TeamsAccountSubmenu`, replace `openAdjustPlan()` only inside `canInviteMembers.requiresPlanUpgrade` branches with `openUpgradeModal()`. Leave explicit plan actions elsewhere unchanged.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/CreateTeamDialog.test.ts src/lib/teamCreationGate.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the team gates**

```bash
git add src/lib/teamCreationGate.ts src/lib/teamCreationGate.test.ts src/components/CreateTeamDialog.tsx src/components/CreateTeamDialog.test.ts src/components/TeamSwitcher.tsx src/components/TeamsAccountSubmenu.tsx src/components/teams/TeamsTableSection.tsx src/pages/CreateTeamPage.tsx
git commit -m "Route team limits through upgrade teaser"
```

### Task 3: Agent, channel, and paid-feature gates

**Files:**
- Modify: `src/pages/WorkspacePage.tsx`
- Modify: `src/pages/ChannelsPage.tsx`
- Modify: `src/components/channels/WebWidgetSettingsPanel.tsx`

**Interfaces:**
- Consumes: `useUpgradeModal().openUpgradeModal`.
- Preserves: explicit Upgrade and Adjust Plan actions elsewhere through `useAdjustPlan`.

- [ ] **Step 1: Add a failing limit-routing regression**

Add `src/components/upgradeGateRouting.test.ts` that reads the named feature-gate callbacks and asserts the intended routing boundary:

```ts
expect(workspaceSource).toContain('openUpgradeModal();');
expect(channelsSource).toContain('onLimitReached={openUpgradeModal}');
expect(widgetSource).toContain('onRequestUpgrade={openUpgradeModal}');
```

The test names the concrete regression: entitlement-rejected interactions must not bypass the teaser.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/upgradeGateRouting.test.ts
```

Expected: FAIL because all three paths currently call `openAdjustPlan`.

- [ ] **Step 3: Change only entitlement-rejected interactions**

- In `AgentsIndex.handleNewAgent`, call `openUpgradeModal()` when `canCreateAgent.allowed` is false.
- In `ChannelsPage`, pass `openUpgradeModal` to `AvailableChannelCard.onLimitReached`.
- In `WebWidgetSettingsPanel`, call `openUpgradeModal()` when hiding branding is unavailable and pass it to `WebWidgetBrandingSection.onRequestUpgrade`.
- Remove `useAdjustPlan` imports from these files only when no explicit billing action remains.

- [ ] **Step 4: Run the routing regression and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/upgradeGateRouting.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the feature gates**

```bash
git add src/components/upgradeGateRouting.test.ts src/pages/WorkspacePage.tsx src/pages/ChannelsPage.tsx src/components/channels/WebWidgetSettingsPanel.tsx
git commit -m "Route paid feature gates through upgrade teaser"
```

### Task 4: Clickable locked models

**Files:**
- Create: `src/components/modelPickerSelection.ts`
- Create: `src/components/modelPickerSelection.test.ts`
- Modify: `src/components/ModelPicker.tsx`

**Interfaces:**
- Produces: `resolveModelPickerAction(accessible: boolean | undefined): 'select' | 'upgrade'`.
- Consumes: `useUpgradeModal().openUpgradeModal`.
- Preserves: `ModelPickerProps` public API and accessible-model selection.

- [ ] **Step 1: Write the failing action tests**

Create:

```ts
import { describe, expect, test } from 'vitest';
import { resolveModelPickerAction } from './modelPickerSelection';

describe('resolveModelPickerAction', () => {
  test('selects an accessible model', () => {
    expect(resolveModelPickerAction(true)).toBe('select');
  });

  test('selects a model whose access is unspecified', () => {
    expect(resolveModelPickerAction(undefined)).toBe('select');
  });

  test('opens upgrade for a locked model', () => {
    expect(resolveModelPickerAction(false)).toBe('upgrade');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/modelPickerSelection.test.ts
```

Expected: FAIL because `modelPickerSelection.ts` does not exist.

- [ ] **Step 3: Implement the pure action**

```ts
export type ModelPickerAction = 'select' | 'upgrade';

export function resolveModelPickerAction(
  accessible: boolean | undefined,
): ModelPickerAction {
  return accessible === false ? 'upgrade' : 'select';
}
```

- [ ] **Step 4: Make locked rows interactive but non-selectable**

Add `onUpgrade: () => void` to `ModelPickerItemProps`. Do not pass the native `disabled` prop for locked rows because the installed Command item applies `pointer-events-none`. Use `aria-disabled={option.accessible === false}` and preserve the lock icon and muted treatment.

Branch in the item callback:

```ts
if (resolveModelPickerAction(option.accessible) === 'upgrade') {
  onUpgrade();
  return;
}
onSelect(option.value);
```

In `ModelPicker`, obtain `openUpgradeModal` and provide a callback that closes the model selector before opening the teaser:

```ts
const handleUpgrade = useCallback(() => {
  setOpen(false);
  openUpgradeModal();
}, [openUpgradeModal]);
```

Pass `handleUpgrade` to every `ModelPickerItem`. Accessible models continue through `handleSelect`.

- [ ] **Step 5: Run the action tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/modelPickerSelection.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit locked-model routing**

```bash
git add src/components/modelPickerSelection.ts src/components/modelPickerSelection.test.ts src/components/ModelPicker.tsx
git commit -m "Prompt upgrade for locked models"
```

### Task 5: Integrated verification and handoff

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Verifies: gated feature → UpgradeModal → Adjust Plan.
- Verifies: explicit Upgrade or Adjust Plan → Adjust Plan.

- [ ] **Step 1: Run all focused tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/upgradeModalFlow.test.ts src/lib/teamCreationGate.test.ts src/components/CreateTeamDialog.test.ts src/components/upgradeGateRouting.test.ts src/components/modelPickerSelection.test.ts src/components/billing/adjustPlanFlow.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 2: Run the production build**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected: TypeScript and Vite production build pass.

- [ ] **Step 3: Audit the routing boundary**

Run:

```bash
rg -n "openAdjustPlan\\(|openUpgradeModal\\(" src --glob '*.ts' --glob '*.tsx'
```

Confirm:

- Explicit Upgrade, Adjust Plan, UpgradeCard, and plan-management entry points use `openAdjustPlan`.
- Team, agent, member, channel, branding, and locked-model gates use `openUpgradeModal`.
- UpgradeModal closes before it calls `openAdjustPlan`.

- [ ] **Step 4: Update continuity**

Record the verified customer-facing behavior, focused test result, build result, branch, and the fact that the change is unreleased and unpushed. Do not update the public changelog because production availability is unconfirmed.
