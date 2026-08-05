# Telegram Notifications Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Telegram recipient management from Agent Setup into one Telegram-only Notifications page under Tools.

**Architecture:** Keep `TelegramNotificationsPanel` as the reusable recipient-management component and place it in a new page with the standard compact dashboard title. Register the page in the existing dashboard router and add the sidebar item directly before Broadcast, then remove the duplicate Agent Setup render.

**Tech Stack:** React 19, React Router, Lucide, shadcn UI, Convex React hooks, Vitest, Bun, Node.js 22.

## Global Constraints

- Run every script in the same shell as `source ~/.nvm/nvm.sh && nvm use 22`; Node.js 22 is mandatory.
- Keep every code file below 300 lines and use self-explanatory code without explanatory comments.
- Reuse existing Telegram subscription APIs and `TelegramNotificationsPanel`; do not alter Convex code, schema, notification delivery, or environment values.
- Render Notifications under Tools directly above Broadcast and protect it with `Permission.AGENTS_MANAGE`.
- State that Telegram is the only currently supported notification channel.
- Remove the Agent Setup duplicate so Notifications is the sole management surface.
- Do not deploy, push, register a webhook, or update the production changelog.

---

### Task 1: Add a route-level regression for the Notifications page

**Files:**
- Modify: `src/pages/DashboardPageTitleRouteCoverage.test.ts`
- Modify: `src/pages/pageHeaderChrome.test.ts`
- Modify: `src/pages/DashboardIndexPageTitles.test.ts`
- Modify: `src/main.tsx`
- Create: `src/pages/NotificationsPage.tsx`

**Interfaces:**
- Produces `NotificationsPage`, a dashboard page addressed by `notifications`.
- Renders `PageTitleBlock` with `title="Notifications"` and `description="Telegram is currently the only supported notification channel."`.

- [x] **Step 1: Write the failing page contracts**

Add `notifications` to the covered dashboard routes and `NotificationsPage.tsx` to the title coverage. Add a compact-header assertion that verifies the page uses `PageTitleBlock` with the exact Telegram-only description.

- [x] **Step 2: Run the focused page contracts and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/DashboardPageTitleRouteCoverage.test.ts src/pages/pageHeaderChrome.test.ts src/pages/DashboardIndexPageTitles.test.ts
```

Expected: FAIL because the Notifications route and page do not exist.

- [x] **Step 3: Implement the page and route**

Create `NotificationsPage.tsx` using `useParams`, `PageTitleBlock`, and `TelegramNotificationsPanel`. Use the standard page container `flex w-full flex-col gap-8`. Import and register it in `src/main.tsx` as `<Route path="notifications" element={<NotificationsPage />} />`.

- [x] **Step 4: Run the focused page contracts and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/DashboardPageTitleRouteCoverage.test.ts src/pages/pageHeaderChrome.test.ts src/pages/DashboardIndexPageTitles.test.ts
```

Expected: PASS.

### Task 2: Place Notifications in Tools and remove the duplicate control

**Files:**
- Modify: `src/components/app-sidebar-nav.ts`
- Modify: `src/components/AppSidebarAvatar.test.ts`
- Modify: `src/components/agent-setup/AgentSetupPanels.tsx`

**Interfaces:**
- `getNavItems(agentId, flags).tools` includes `{ to: "/dashboard/<agentId>/notifications", label: "Notifications", requiredPermission: Permission.AGENTS_MANAGE }` immediately before Broadcast.
- `AgentSetupPanels` no longer imports or renders `TelegramNotificationsPanel`.

- [x] **Step 1: Write the failing navigation contract**

Add a test that observes Notifications immediately precedes Broadcast in `getNavItems(...).tools`, has the Notifications label, and requires `agents:manage`.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/AppSidebarAvatar.test.ts
```

Expected: FAIL because Notifications is absent from Tools.

- [x] **Step 3: Implement the navigation move**

Import `Bell` in `app-sidebar-nav.ts` and add the Notifications item before Broadcast. Remove the `TelegramNotificationsPanel` import and render from `AgentSetupPanels.tsx`.

- [x] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/AppSidebarAvatar.test.ts src/pages/DashboardPageTitleRouteCoverage.test.ts src/pages/pageHeaderChrome.test.ts src/pages/DashboardIndexPageTitles.test.ts
```

Expected: PASS.

### Task 3: Verify the integrated dashboard change

**Files:**
- Modify: `CONTINUITY.md`

- [x] **Step 1: Run final relevant verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/AppSidebarAvatar.test.ts src/pages/DashboardPageTitleRouteCoverage.test.ts src/pages/pageHeaderChrome.test.ts src/pages/DashboardIndexPageTitles.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
git diff --check
```

Expected: focused tests pass, production build succeeds, and whitespace check is clean.

- [x] **Step 2: Record the local outcome**

Add a concise dated entry to `CONTINUITY.md` recording the dedicated Telegram-only Notifications page, the navigation location, and local verification results. Do not add a changelog entry because production release remains unconfirmed.

The full Vitest suite is currently red outside this page move: ten Docs files have suite/configuration failures. The Telegram subscription tests explicitly set `NOTIFICATION_BOT_USERNAME=notifications_kilobot` and pass. The focused page tests and production build pass, but this plan remains uncommitted until the repository-wide gate is resolved or explicitly waived.

- [ ] **Step 3: Commit the scoped feature**

```bash
git add src/main.tsx src/pages/NotificationsPage.tsx src/components/app-sidebar-nav.ts src/components/agent-setup/AgentSetupPanels.tsx src/components/AppSidebarAvatar.test.ts src/pages/DashboardPageTitleRouteCoverage.test.ts src/pages/pageHeaderChrome.test.ts src/pages/DashboardIndexPageTitles.test.ts docs/superpowers/specs/2026-08-05-telegram-notifications-page-design.md docs/superpowers/plans/2026-08-05-telegram-notifications-page.md CONTINUITY.md
git commit -m "Move Telegram notifications to Tools"
```
