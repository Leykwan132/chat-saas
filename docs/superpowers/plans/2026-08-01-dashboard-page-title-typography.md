# Dashboard Page Title Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply KiloBot's Gilda Display title font at normal weight to authenticated application page titles and use 24px between described headers and their first content item.

**Architecture:** Keep the existing heading hierarchy and heterogeneous page-header markup. Centralize the common typography in `PageTitleBlock`, apply the same two utilities directly to custom page titles, and protect the authenticated-route inventory with focused source/render contracts instead of a risky global `h1` selector.

**Tech Stack:** React, TypeScript, Tailwind CSS, React Router, Vitest, ESLint

## Global Constraints

- Use Node v22 for every test and lint command.
- Apply only under authenticated `/workspace` and `/dashboard/:agentId` application shells.
- Exclude public/auth pages, onboarding and creation wizards, dialogs and sheets, card and section headings, sidebar labels, empty states, and error-state headings.
- Preserve every title's current size, line height, tracking, color, truncation, badges, actions, and heading element.
- In-scope titles must contain `font-title font-normal` and must not retain `font-semibold` or `font-bold`.
- Described page headers must have 24px between the complete header and the first content item; keep title-to-description spacing unchanged.
- Do not add descriptions or alter internal card, table, tab, form, dialog, or sidebar spacing.
- Do not expand legacy files above 300 lines beyond replacing existing title or outer-gap class tokens.
- Preserve the unrelated working-tree change in `convex/_generated/api.d.ts`.

---

### Task 1: Shared page-title typography

**Files:**

- Modify: `src/components/PageTitleBlock.tsx`
- Create: `src/components/PageTitleBlock.test.tsx`

**Interfaces:**

- Consumes: Existing `PageTitleBlockProps` with `title: string` and `description: string`.
- Produces: The unchanged `PageTitleBlock` API with a branded, normal-weight `h1`.

- [ ] **Step 1: Write the failing render contract**

Create a static-render test that renders `PageTitleBlock` and asserts the `h1` contains `font-title` and `font-normal`, contains neither `font-semibold` nor `font-bold`, and preserves the title and description text.

```tsx
const markup = renderToStaticMarkup(
  <PageTitleBlock title="Services" description="Bookable services." />,
);
expect(markup).toContain('font-title');
expect(markup).toContain('font-normal');
expect(markup).not.toContain('font-semibold');
expect(markup).not.toContain('font-bold');
expect(markup).toContain('Services');
expect(markup).toContain('Bookable services.');
```

- [ ] **Step 2: Run the test to verify it fails**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/PageTitleBlock.test.tsx`.

Expected: FAIL because the current title uses `font-semibold` and lacks `font-title font-normal`.

- [ ] **Step 3: Apply the shared typography**

Change only the `h1` class in `PageTitleBlock`.

```tsx
<h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">
```

- [ ] **Step 4: Verify and commit the shared primitive**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/PageTitleBlock.test.tsx && bunx eslint src/components/PageTitleBlock.tsx src/components/PageTitleBlock.test.tsx`.

Expected: the focused test passes and ESLint reports no findings.

Commit only the two Task 1 files with message `Style shared dashboard page titles`.

### Task 2: Described authenticated pages and 24px content spacing

**Files:**

- Create: `src/pages/DashboardDescribedPageHeaders.test.ts`
- Modify: `src/pages/ServicesPage.tsx`
- Modify: `src/pages/ChannelsPage.tsx`
- Modify: `src/pages/AgentOverviewPage.tsx`
- Modify: `src/pages/AvatarPage.tsx`
- Modify: `src/pages/ChannelWhatsAppTemplatesPage.tsx`
- Modify: `src/pages/WorkspaceUsagePage.tsx`
- Modify: `src/pages/ReferralsPage.tsx`

**Interfaces:**

- Consumes: `PageTitleBlock` from Task 1 and existing custom described headers.
- Produces: Branded custom titles and a 24px `gap-6`/`space-y-6` boundary after every described header in this task.

- [ ] **Step 1: Write the failing described-page contracts**

Create a source-contract table for the seven files. Assert Services and Channels use `flex w-full flex-col gap-6`; Agent Overview and Avatar retain their existing `gap-6`; Channel WhatsApp Templates changes its outer container to `gap-6`; Workspace Usage removes the extra header `mb-4` while retaining `space-y-6`; Referrals changes its outer container to `gap-6`. Assert every custom in-scope title contains `font-title` and `font-normal` without a heavy font utility.

```ts
expect(servicesSource).toContain('flex w-full flex-col gap-6');
expect(channelsSource).toContain('flex w-full flex-col gap-6');
expect(channelTemplatesSource).toContain('max-w-3xl flex-col gap-6');
expect(workspaceUsageSource).not.toContain('<div className="mb-4">');
expect(referralsSource).toContain('animate-fade-in flex-col gap-6 pt-4');
```

- [ ] **Step 2: Run the described-page test to verify it fails**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/DashboardDescribedPageHeaders.test.ts`.

Expected: FAIL on the current heavy custom titles and 32px outer gaps.

- [ ] **Step 3: Apply the described-header changes**

Replace only the relevant title and outer-layout utilities. Custom page titles use this pattern while preserving their existing size and other utilities:

```tsx
<h1 className="font-title text-3xl font-normal tracking-tight">
```

Use `gap-6` for the described page-to-content boundary. Remove Workspace Usage's redundant `mb-4` header margin so `space-y-6` is the only boundary.

- [ ] **Step 4: Verify and commit described pages**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/PageTitleBlock.test.tsx src/pages/DashboardDescribedPageHeaders.test.ts`.

Run scoped ESLint on the eight Task 2 source/test files. Expected: no change-related findings; record pre-existing Calendar-independent findings without modifying unrelated logic.

Commit only the Task 2 files with message `Style described dashboard page headers`.

### Task 3: Authenticated workspace and dashboard index titles

**Files:**

- Create: `src/pages/DashboardIndexPageTitles.test.ts`
- Modify: `src/pages/WorkspacePage.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/InvitationsPage.tsx`
- Modify: `src/pages/ChatsPage.tsx`
- Modify: `src/pages/QuickRepliesPage.tsx`
- Modify: `src/pages/CustomersPage.tsx`
- Modify: `src/pages/FollowUpPage.tsx`
- Modify: `src/pages/BroadcastPage.tsx`
- Modify: `src/pages/TemplatesPage.tsx`
- Modify: `src/pages/LeadAssignmentPage.tsx`
- Modify: `src/components/analytics/AnalyticsUi.tsx`

**Interfaces:**

- Consumes: Existing top-level page headings for authenticated list/configuration routes.
- Produces: The same headings, copy, sizes, hierarchy, and layouts with `font-title font-normal` replacing heavy weight.

- [ ] **Step 1: Write the failing index-page inventory contract**

Create a table of the eleven source files and their visible page-title marker (`Personal/team name`, `Settings`, `Invitations`, `Inbox`, `Quick Replies`, `Customers`, `Follow-ups`, `Broadcast`, `Message templates`, `Lead Assignment`, and `AnalyticsSectionHeader`). For each marker, assert the surrounding heading class contains `font-title` and `font-normal`, with neither `font-semibold` nor `font-bold`. Assert Settings section `h2` headings and Analytics access-denied/block headings are not included in the inventory.

```ts
function titleClassBeforeMarker(source: string, marker: string) {
  const markerIndex = source.indexOf(marker);
  expect(markerIndex).toBeGreaterThan(-1);
  const prefix = source.slice(Math.max(0, markerIndex - 500), markerIndex);
  const classMatches = [...prefix.matchAll(/className="([^"]+)"/g)];
  return classMatches.at(-1)?.[1] ?? '';
}

const titleClassPattern = /font-title[^"']*font-normal|font-normal[^"']*font-title/;
expect(titleClassBeforeMarker(workspaceSource, "activeTeam.type === 'personal'")).toMatch(titleClassPattern);
expect(titleClassBeforeMarker(settingsSource, '>Settings</h1>')).toMatch(titleClassPattern);
expect(titleClassBeforeMarker(chatsSource, '>\n          Inbox\n')).toMatch(titleClassPattern);
```

- [ ] **Step 2: Run the index-page inventory to verify it fails**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/DashboardIndexPageTitles.test.ts`.

Expected: FAIL because the listed page titles still use semibold weight without `font-title`.

- [ ] **Step 3: Replace only the title typography utilities**

For each inventoried title, preserve its element, copy, size, tracking, color, margin, and line-height utilities. Replace `font-semibold`/`font-bold` with `font-title font-normal`. In `AnalyticsUi`, update only `AnalyticsSectionHeader`'s page-level `h2`; leave `AccessDenied` and `AnalyticsBlock` headings unchanged.

- [ ] **Step 4: Verify and commit index pages**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/DashboardIndexPageTitles.test.ts`.

Run scoped ESLint on the Task 3 files. Expected: no change-related findings; do not fix unrelated legacy findings in oversized pages.

Commit only the Task 3 files with message `Style authenticated dashboard titles`.

### Task 4: Authenticated detail-page titles

**Files:**

- Create: `src/pages/DashboardDetailPageTitles.test.ts`
- Modify: `src/pages/CustomerDetailPage.tsx`
- Modify: `src/pages/FollowUpDetailPage.tsx`
- Modify: `src/pages/BroadcastDetailPage.tsx`
- Modify: `src/pages/TemplateDetailPage.tsx`
- Modify: `src/pages/ServicePage.tsx`
- Modify: `src/pages/ScheduleUserAvailabilityPage.tsx`
- Modify: `src/pages/ScheduleUserDetailPage.tsx`

**Interfaces:**

- Consumes: Existing customer, automation, template, service, and availability detail headers.
- Produces: Branded display titles with unchanged edit controls, back links, status controls, truncation, and descriptions.

- [ ] **Step 1: Write the failing detail-page inventory contract**

Create a source table for the seven detail pages. Assert each display title contains `font-title font-normal` and no heavy weight. For Follow-up detail, also assert the editable title input uses `font-title font-normal` so entering edit mode does not change typography. Assert Customer detail and teammate Availability detail change their described-header outer layouts from `gap-8` to `gap-6`; Broadcast detail already retains `gap-6`.

```ts
function titleClassBeforeMarker(source: string, marker: string) {
  const markerIndex = source.indexOf(marker);
  expect(markerIndex).toBeGreaterThan(-1);
  const prefix = source.slice(Math.max(0, markerIndex - 500), markerIndex);
  const classMatches = [...prefix.matchAll(/className="([^"]+)"/g)];
  return classMatches.at(-1)?.[1] ?? '';
}

const titleClassPattern = /font-title[^"']*font-normal|font-normal[^"']*font-title/;
expect(titleClassBeforeMarker(customerSource, "customer.name?.trim() || 'Unnamed Customer'")).toMatch(titleClassPattern);
expect(titleClassBeforeMarker(followUpSource, '{name}')).toMatch(titleClassPattern);
expect(followUpSource).toContain('max-w-2xl font-title text-3xl font-normal');
expect(titleClassBeforeMarker(serviceSource, "form.name.trim() || 'Edit service'")).toMatch(titleClassPattern);
expect(customerSource).toContain('flex w-full max-w-3xl flex-col gap-6');
expect(scheduleDetailSource).toContain('flex w-full max-w-3xl flex-col gap-6');
expect(broadcastDetailSource).toContain('flex w-full flex-col gap-6');
```

- [ ] **Step 2: Run the detail-page inventory to verify it fails**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/DashboardDetailPageTitles.test.ts`.

Expected: FAIL because detail headings and the inline title editor still use semibold weight.

- [ ] **Step 3: Apply detail-title typography**

Replace only title weight/family utilities, plus the two approved `gap-8` to `gap-6` described-header boundaries in Customer detail and teammate Availability detail. Preserve all other layout, description margins, action alignment, navigation, editable behavior, and responsive sizing. Do not change creation-wizard headings reached through shared route components.

- [ ] **Step 4: Verify and commit detail pages**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/DashboardDetailPageTitles.test.ts`.

Run scoped ESLint on the Task 4 files. Expected: no change-related findings; record existing findings without broad refactoring.

Commit only the Task 4 files with message `Style dashboard detail page titles`.

### Task 5: Route-aware coverage and final verification

**Files:**

- Create: `src/pages/DashboardPageTitleRouteCoverage.test.ts`
- Modify: `CONTINUITY.md`

**Interfaces:**

- Consumes: Authenticated route declarations from `src/main.tsx` and the completed title inventories from Tasks 1–4.
- Produces: A final coverage contract proving every eligible authenticated route is either covered by a title source or explicitly excluded by the approved scope.

- [ ] **Step 1: Write the final route-coverage contract**

Create literal route arrays for eligible shared-header, index, and detail pages, plus explicit exclusions for redirects, Calendar's sidebar-only heading, Workflow's canvas toolbar, creation/onboarding routes, and error states. Assert the union matches the authenticated route declarations that render visible pages and that every eligible source appears in one of the focused title test inventories.

```ts
function routePathsWithinShell(source: string, shellPath: string) {
  const shellStart = source.indexOf(`<Route path="${shellPath}"`);
  expect(shellStart).toBeGreaterThan(-1);
  const shellEnd = source.indexOf('</Route>', shellStart);
  expect(shellEnd).toBeGreaterThan(shellStart);
  return [...source.slice(shellStart, shellEnd).matchAll(/<Route path="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => path !== shellPath);
}

const dashboardRoutePaths = routePathsWithinShell(mainSource, '/dashboard/:agentId');
const workspaceRoutePaths = routePathsWithinShell(mainSource, '/workspace');
const dashboardExplicitExclusions = [
  'chats',
  'agent/:threadId?',
  'playground/:threadId?',
  'knowledge-base',
  'avatar/create',
  'follow-ups/new',
  'broadcast/new',
  'templates/new',
  'calendar',
  'services/new',
  'workflow',
  'analytics',
  'account',
];
const workspaceExplicitExclusions = ['account'];
const coveredDashboardRoutes = [
  'inbox', 'quick-replies', 'avatar', 'overview', 'knowledge-base/:type',
  'channels', 'channels/:channelId/templates', 'customers', 'customers/:customerId',
  'follow-ups', 'follow-ups/:ruleId', 'broadcast', 'broadcast/:scheduleId',
  'templates', 'templates/:templateName', 'availability',
  'availability/:workosUserId/edit', 'availability/:workosUserId',
  'services/:serviceId/edit', 'services/:serviceId', 'services',
  'lead-assignment', 'agent-setup', 'analytics/:section', 'settings',
];
const coveredWorkspaceRoutes = ['settings', 'invitations', 'usage', 'referrals'];
expect(dashboardRoutePaths.filter((path) => !dashboardExplicitExclusions.includes(path)))
  .toEqual(coveredDashboardRoutes);
expect(workspaceRoutePaths.filter((path) => !workspaceExplicitExclusions.includes(path)))
  .toEqual(coveredWorkspaceRoutes);
```

- [ ] **Step 2: Run the route contract and correct inventory gaps**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/DashboardPageTitleRouteCoverage.test.ts`.

Expected: FAIL only if an eligible authenticated route was missed; add the missing source to the appropriate inventory and apply the already-approved title typography before continuing.

- [ ] **Step 3: Run focused verification**

Run all five new test files plus `src/pages/pageHeaderChrome.test.ts` under Node v22.

Run scoped ESLint over all touched files. Record pre-existing findings separately and require zero change-related findings.

Run `git diff --check` and verify `git status --short` lists the unrelated `convex/_generated/api.d.ts` change unstaged.

- [ ] **Step 4: Record and commit completion**

Update `CONTINUITY.md` with the implemented typography, 24px described-header spacing, focused test totals, scoped lint outcome, route-coverage result, and unreleased status. Do not add a changelog entry.

Commit the final route test and ledger with message `Verify dashboard page title coverage`.
