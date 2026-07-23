# Avatar Feature Flag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate Avatar navigation, authenticated dashboard routes, and the public embed behind the PostHog flag `enable_avatar_feature`.

**Architecture:** Extend the existing centralized tri-state PostHog flag module and pass its resolved value into the pure sidebar navigation builder. Route all Avatar entry points through one focused route module that waits for flag resolution, redirects disabled dashboard access, and renders a shared unavailable presentation for the disabled public embed.

**Tech Stack:** React 19, TypeScript, React Router, PostHog React, Vitest, Bun, Vite

## Global Constraints

- The exact PostHog flag key is `enable_avatar_feature`.
- Only an explicitly resolved `true` enables Avatar.
- Unresolved routes render a centered spinner instead of redirecting.
- Disabled dashboard Avatar routes redirect to `/dashboard/:agentId/inbox` with replacement navigation.
- The disabled public embed renders `Avatar unavailable` and does not redirect.
- Convex functions, permissions, public-key validation, and session-capacity checks remain unchanged.
- Node.js v22 must be selected in every script or test command.
- No code file may exceed 300 lines.
- Do not add comments unless the code cannot be made self-explanatory.

---

### Task 1: Centralize the Avatar Flag and Gate Sidebar Navigation

**Files:**
- Modify: `src/lib/posthogFeatureFlags.ts`
- Modify: `src/lib/posthogFeatureFlags.test.ts`
- Modify: `src/components/app-sidebar-nav.ts`
- Modify: `src/components/app-sidebar.tsx`
- Modify: `src/components/AppSidebarFeatureFlag.test.ts`
- Modify: `src/components/AppSidebarAvatar.test.ts`

**Interfaces:**
- Consumes: `useFeatureFlagEnabled(key): boolean | undefined`, `isProductFeatureEnabled(state): state is true`, and `getNavItems(agentId, options)`.
- Produces: `POSTHOG_FEATURE_FLAGS.enableAvatarFeature`, `useEnableAvatarFeature(): boolean | undefined`, and `NavFeatureOptions.enableAvatarFeature: boolean`.

- [ ] **Step 1: Write failing centralized-flag and navigation tests**

Update the expected flag object in `src/lib/posthogFeatureFlags.test.ts`:

```ts
expect(POSTHOG_FEATURE_FLAGS).toEqual({
  showTokenUsage: 'show-token-usage',
  showSavedReplies: 'show-saved-replies',
  enableAvatarFeature: 'enable_avatar_feature',
});
```

Replace `src/components/AppSidebarFeatureFlag.test.ts` with:

```ts
import { describe, expect, test } from 'vitest';
import { getNavItems } from './app-sidebar-nav';

describe('sidebar feature flags', () => {
  test('includes Quick Replies only when enabled', () => {
    const enabled = getNavItems('agent-id', {
      showSavedReplies: true,
      enableAvatarFeature: false,
    });
    const disabled = getNavItems('agent-id', {
      showSavedReplies: false,
      enableAvatarFeature: false,
    });

    expect(enabled.tools.map((item) => item.label)).toContain('Quick Replies');
    expect(disabled.tools.map((item) => item.label)).not.toContain('Quick Replies');
  });

  test('includes Avatar only when enabled', () => {
    const enabled = getNavItems('agent-id', {
      showSavedReplies: false,
      enableAvatarFeature: true,
    });
    const disabled = getNavItems('agent-id', {
      showSavedReplies: false,
      enableAvatarFeature: false,
    });

    expect(enabled.tools.map((item) => item.label)).toContain('Avatar');
    expect(disabled.tools.map((item) => item.label)).not.toContain('Avatar');
  });
});
```

Update the Avatar-enabled call in `src/components/AppSidebarAvatar.test.ts`:

```ts
const tools = getNavItems('agent-id', {
  showSavedReplies: true,
  enableAvatarFeature: true,
}).tools;
```

Add a source contract to `src/components/AppSidebarAvatar.test.ts`:

```ts
it('resolves the Avatar flag before building navigation', () => {
  const source = readFileSync(new URL('./app-sidebar.tsx', import.meta.url), 'utf8');

  expect(source).toContain('useEnableAvatarFeature()');
  expect(source).toContain(
    'enableAvatarFeature: isProductFeatureEnabled(avatarFeatureState)',
  );
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/posthogFeatureFlags.test.ts src/components/AppSidebarFeatureFlag.test.ts src/components/AppSidebarAvatar.test.ts
```

Expected: FAIL because the centralized Avatar flag and navigation option do not exist.

- [ ] **Step 3: Add the centralized PostHog flag**

Extend `POSTHOG_FEATURE_FLAGS` in `src/lib/posthogFeatureFlags.ts`:

```ts
export const POSTHOG_FEATURE_FLAGS = {
  showTokenUsage: 'show-token-usage',
  showSavedReplies: 'show-saved-replies',
  enableAvatarFeature: 'enable_avatar_feature',
} as const;
```

Add the hook:

```ts
export function useEnableAvatarFeature(): ProductFeatureFlagState {
  return useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.enableAvatarFeature);
}
```

- [ ] **Step 4: Make Avatar navigation conditional**

Extend the options in `src/components/app-sidebar-nav.ts`:

```ts
export type NavFeatureOptions = {
  showSavedReplies: boolean;
  enableAvatarFeature: boolean;
};
```

Destructure both options:

```ts
export function getNavItems(
  agentId: string,
  { showSavedReplies, enableAvatarFeature }: NavFeatureOptions,
) {
```

Replace the unconditional Avatar item in `tools` with:

```ts
...(enableAvatarFeature
  ? [{
      to: `/dashboard/${agentId}/avatar`,
      icon: ScanFace,
      label: 'Avatar',
      badgeLabel: 'Beta',
      requiredPermission: Permission.CHANNELS_READ,
    }]
  : []),
```

In `src/components/app-sidebar.tsx`, import and resolve the hook:

```ts
import {
  isProductFeatureEnabled,
  useEnableAvatarFeature,
  useShowSavedReplies,
} from '@/lib/posthogFeatureFlags';
```

```ts
const savedRepliesState = useShowSavedReplies();
const avatarFeatureState = useEnableAvatarFeature();
const navItems = getNavItems(agent._id, {
  showSavedReplies: isProductFeatureEnabled(savedRepliesState),
  enableAvatarFeature: isProductFeatureEnabled(avatarFeatureState),
});
```

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/posthogFeatureFlags.test.ts src/components/AppSidebarFeatureFlag.test.ts src/components/AppSidebarAvatar.test.ts
```

Expected: All focused tests pass.

- [ ] **Step 6: Run scoped verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/lib/posthogFeatureFlags.ts src/lib/posthogFeatureFlags.test.ts src/components/app-sidebar-nav.ts src/components/app-sidebar.tsx src/components/AppSidebarFeatureFlag.test.ts src/components/AppSidebarAvatar.test.ts
git diff --check
wc -l src/lib/posthogFeatureFlags.ts src/components/app-sidebar-nav.ts src/components/app-sidebar.tsx
```

Expected: Exit 0 and every code file is at or below 300 lines.

- [ ] **Step 7: Commit the sidebar gate**

```bash
git add src/lib/posthogFeatureFlags.ts src/lib/posthogFeatureFlags.test.ts src/components/app-sidebar-nav.ts src/components/app-sidebar.tsx src/components/AppSidebarFeatureFlag.test.ts src/components/AppSidebarAvatar.test.ts
git commit -m "Gate Avatar navigation by feature flag"
```

---

### Task 2: Gate Dashboard and Public Avatar Routes

**Files:**
- Create: `src/components/avatar/AvatarUnavailableState.tsx`
- Create: `src/router/AvatarFeatureRoutes.tsx`
- Create: `src/router/AvatarFeatureRoutes.test.ts`
- Modify: `src/pages/AvatarEmbedPage.tsx`
- Modify: `src/pages/AvatarEmbedPage.test.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `useEnableAvatarFeature(): boolean | undefined`, `isProductFeatureEnabled(state): state is true`, `AvatarPage`, `AvatarCreatePage`, and `AvatarEmbedPage`.
- Produces: `AvatarOverviewFeatureRoute`, `AvatarCreateFeatureRoute`, `AvatarEmbedFeatureRoute`, and `AvatarUnavailableState`.

- [ ] **Step 1: Write the failing route-gate contract**

Create `src/router/AvatarFeatureRoutes.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(
  new URL('./AvatarFeatureRoutes.tsx', import.meta.url),
  'utf8',
);
const mainSource = readFileSync(new URL('../main.tsx', import.meta.url), 'utf8');

describe('Avatar feature routes', () => {
  it('waits for the tri-state flag before rendering or redirecting', () => {
    expect(routeSource).toContain('avatarFeatureState === undefined');
    expect(routeSource).toContain('useEnableAvatarFeature()');
    expect(routeSource).toContain('isProductFeatureEnabled(avatarFeatureState)');
    expect(routeSource).toContain('Spinner');
  });

  it('redirects disabled dashboard routes to Inbox', () => {
    expect(routeSource).toContain('to={`/dashboard/${agentId}/inbox`}');
    expect(routeSource).toContain('replace');
    expect(routeSource).toContain('<AvatarPage />');
    expect(routeSource).toContain('<AvatarCreatePage />');
  });

  it('renders unavailable instead of redirecting a disabled public embed', () => {
    expect(routeSource).toContain('<AvatarUnavailableState />');
    expect(routeSource).toContain('<AvatarEmbedPage />');
  });

  it('routes every Avatar entry point through the feature gate', () => {
    expect(mainSource).toContain(
      'path="/avatar/embed/:publicKey" element={<AvatarEmbedFeatureRoute />}',
    );
    expect(mainSource).toContain(
      'path="avatar" element={<AvatarOverviewFeatureRoute />}',
    );
    expect(mainSource).toContain(
      'path="avatar/create" element={<AvatarCreateFeatureRoute />}',
    );
    expect(mainSource).not.toContain('element={<AvatarPage />}');
    expect(mainSource).not.toContain('element={<AvatarCreatePage />}');
    expect(mainSource).not.toContain('element={<AvatarEmbedPage />}');
  });
});
```

Add these shared-unavailable assertions to `src/pages/AvatarEmbedPage.test.ts`:

```ts
const unavailableSource = readFileSync(
  new URL('../components/avatar/AvatarUnavailableState.tsx', import.meta.url),
  'utf8',
);
```

```ts
it('shares the unavailable presentation with the public feature gate', () => {
  expect(source).toContain('<AvatarUnavailableState />');
  expect(unavailableSource).toContain('Avatar unavailable');
  expect(unavailableSource).toContain(
    'This Avatar embed is disabled or no longer exists.',
  );
});
```

- [ ] **Step 2: Run the route tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/router/AvatarFeatureRoutes.test.ts src/pages/AvatarEmbedPage.test.ts
```

Expected: FAIL because the route-gate and shared unavailable modules do not exist.

- [ ] **Step 3: Extract the public unavailable presentation**

Create `src/components/avatar/AvatarUnavailableState.tsx`:

```tsx
import { ScanFace } from 'lucide-react';

export function AvatarUnavailableState() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-zinc-950 p-6 text-center text-white">
      <div>
        <ScanFace className="mx-auto mb-3 size-10" />
        <h1 className="text-xl font-semibold">Avatar unavailable</h1>
        <p className="mt-2 text-sm text-zinc-300">
          This Avatar embed is disabled or no longer exists.
        </p>
      </div>
    </main>
  );
}
```

In `src/pages/AvatarEmbedPage.tsx`, remove `ScanFace` from the Lucide import,
import `AvatarUnavailableState`, and replace the `config === null` JSX:

```tsx
if (config === null) return <AvatarUnavailableState />;
```

- [ ] **Step 4: Implement focused route gates**

Create `src/router/AvatarFeatureRoutes.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router';
import { AvatarUnavailableState } from '@/components/avatar/AvatarUnavailableState';
import { Spinner } from '@/components/ui/spinner';
import {
  isProductFeatureEnabled,
  useEnableAvatarFeature,
} from '@/lib/posthogFeatureFlags';
import AvatarCreatePage from '@/pages/AvatarCreatePage';
import AvatarEmbedPage from '@/pages/AvatarEmbedPage';
import AvatarPage from '@/pages/AvatarPage';

function AvatarFlagLoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}

function AvatarDashboardFeatureRoute({ children }: { children: ReactNode }) {
  const { agentId } = useParams();
  const avatarFeatureState = useEnableAvatarFeature();

  if (avatarFeatureState === undefined) return <AvatarFlagLoadingState />;
  if (!isProductFeatureEnabled(avatarFeatureState)) {
    return <Navigate to={`/dashboard/${agentId}/inbox`} replace />;
  }
  return children;
}

export function AvatarOverviewFeatureRoute() {
  return (
    <AvatarDashboardFeatureRoute>
      <AvatarPage />
    </AvatarDashboardFeatureRoute>
  );
}

export function AvatarCreateFeatureRoute() {
  return (
    <AvatarDashboardFeatureRoute>
      <AvatarCreatePage />
    </AvatarDashboardFeatureRoute>
  );
}

export function AvatarEmbedFeatureRoute() {
  const avatarFeatureState = useEnableAvatarFeature();

  if (avatarFeatureState === undefined) return <AvatarFlagLoadingState />;
  if (!isProductFeatureEnabled(avatarFeatureState)) {
    return <AvatarUnavailableState />;
  }
  return <AvatarEmbedPage />;
}
```

- [ ] **Step 5: Route all Avatar entry points through the gates**

Remove direct Avatar page imports from `src/main.tsx`:

```ts
import AvatarPage from './pages/AvatarPage.tsx'
import AvatarCreatePage from './pages/AvatarCreatePage.tsx'
import AvatarEmbedPage from './pages/AvatarEmbedPage.tsx'
```

Add:

```ts
import {
  AvatarCreateFeatureRoute,
  AvatarEmbedFeatureRoute,
  AvatarOverviewFeatureRoute,
} from '@/router/AvatarFeatureRoutes'
```

Replace the three routes:

```tsx
<Route path="/avatar/embed/:publicKey" element={<AvatarEmbedFeatureRoute />} />
```

```tsx
<Route path="avatar" element={<AvatarOverviewFeatureRoute />} />
<Route path="avatar/create" element={<AvatarCreateFeatureRoute />} />
```

- [ ] **Step 6: Run the route tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/router/AvatarFeatureRoutes.test.ts src/pages/AvatarEmbedPage.test.ts
```

Expected: All focused tests pass.

- [ ] **Step 7: Run complete feature-flag and Avatar regression verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/posthogFeatureFlags.test.ts src/components/AppSidebarFeatureFlag.test.ts src/components/AppSidebarAvatar.test.ts src/router/AvatarFeatureRoutes.test.ts convex/avatar*.test.ts src/lib/avatarEmbed.test.ts src/pages/AvatarPage.test.ts src/pages/AvatarEmbedPage.test.ts src/components/avatar/*.test.ts
```

Expected: All focused feature-flag and Avatar tests pass.

- [ ] **Step 8: Run lint, build, route scans, and line checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/lib/posthogFeatureFlags.ts src/lib/posthogFeatureFlags.test.ts src/components/app-sidebar-nav.ts src/components/app-sidebar.tsx src/components/AppSidebarFeatureFlag.test.ts src/components/AppSidebarAvatar.test.ts src/components/avatar/AvatarUnavailableState.tsx src/router/AvatarFeatureRoutes.tsx src/router/AvatarFeatureRoutes.test.ts src/pages/AvatarEmbedPage.tsx src/pages/AvatarEmbedPage.test.ts src/main.tsx
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
git diff --check
! rg -n 'element=\\{<Avatar(Page|CreatePage|EmbedPage) />\\}' src/main.tsx
wc -l src/lib/posthogFeatureFlags.ts src/components/app-sidebar-nav.ts src/components/app-sidebar.tsx src/components/avatar/AvatarUnavailableState.tsx src/router/AvatarFeatureRoutes.tsx src/pages/AvatarEmbedPage.tsx src/main.tsx
```

Expected: Exit 0, no direct Avatar page route remains, and every code file is at or below 300 lines.

- [ ] **Step 9: Commit the route gates**

```bash
git add src/components/avatar/AvatarUnavailableState.tsx src/router/AvatarFeatureRoutes.tsx src/router/AvatarFeatureRoutes.test.ts src/pages/AvatarEmbedPage.tsx src/pages/AvatarEmbedPage.test.ts src/main.tsx
git commit -m "Gate Avatar routes by feature flag"
```
