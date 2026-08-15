# Workspace Switching Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the transient unavailable-workspace modal with a neutral switching state while changing workspaces from a dashboard route.

**Architecture:** `TeamSwitcher` exposes lifecycle callbacks around its existing switch mutation. `DashboardContent` records the lifecycle state and renders a full-screen loader before attempting stale-agent recovery, so only a real unavailable workspace reaches `WorkspaceUnavailable`.

**Tech Stack:** React 19, TypeScript, React Router, Convex React, Vitest, Tailwind CSS.

## Global Constraints

- Run every project command with `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- Display `Switching workspace...` during an active dashboard-originated switch.
- Keep the existing `/workspace` success navigation and switch failure toast.
- Preserve `WorkspaceUnavailable` for a genuinely unavailable workspace outside an active switch.
- Do not add comments or default fallbacks to production code.
- Keep all code files below 300 lines.

---

### Task 1: Preserve the switching state through dashboard handoff

**Files:**
- Modify: `src/components/TeamSwitcher.tsx:37-92`
- Modify: `src/layouts/DashboardLayout.tsx:119-180`
- Modify: `src/components/WorkspaceUnavailable.test.tsx`

**Interfaces:**
- Consumes: `TeamSwitcher` workspace selection handlers and the dashboard's existing `onTeamSwitch` success callback.
- Produces: optional `onTeamSwitchStart` and `onTeamSwitchFailed` callbacks plus a dashboard-only full-screen switching state.

- [x] **Step 1: Write the failing lifecycle regression test**

In `src/components/WorkspaceUnavailable.test.tsx`, add source assertions that document the transition priority:

```ts
test("shows a switching screen before stale-agent recovery", () => {
  expect(layoutSource).toContain("isSwitchingWorkspace");
  expect(layoutSource).toContain("Switching workspace...");
  expect(layoutSource.indexOf("isSwitchingWorkspace")).toBeLessThan(
    layoutSource.indexOf("if (agent === null)"),
  );
});

test("notifies the dashboard when a workspace switch begins or fails", () => {
  expect(teamSwitcherSource).toContain("onTeamSwitchStart");
  expect(teamSwitcherSource).toContain("onTeamSwitchFailed");
});
```

Read `TeamSwitcher.tsx` as `teamSwitcherSource` beside the existing component and layout source fixtures.

- [x] **Step 2: Run the focused test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WorkspaceUnavailable.test.tsx`

Expected: FAIL because the switch lifecycle callbacks and dashboard switching state do not yet exist.

- [x] **Step 3: Add explicit switch lifecycle callbacks**

Extend `TeamSwitcherProps`:

```ts
type TeamSwitcherProps = {
  settingsPath?: string;
  onTeamSwitch?: () => void;
  onTeamSwitchStart?: () => void;
  onTeamSwitchFailed?: () => void;
};
```

Invoke `onTeamSwitchStart?.()` immediately after setting `switchingTeamId` in both personal and organizational handlers. In each catch block, invoke `onTeamSwitchFailed?.()` before clearing the local switching id. Keep `onTeamSwitch?.()` only after a successful `await switchTeam(...)`.

- [x] **Step 4: Render the dashboard switching state before stale-agent recovery**

In `DashboardContent`, add:

```tsx
const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false);
```

Pass the lifecycle callbacks through `DashboardHeader` to `TeamSwitcher`:

```tsx
onTeamSwitchStart={() => setIsSwitchingWorkspace(true)}
onTeamSwitchFailed={() => setIsSwitchingWorkspace(false)}
```

After the existing `agent === undefined` loading branch and before `if (agent === null)`, render:

```tsx
if (isSwitchingWorkspace) {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center gap-4 bg-background">
      <Spinner className="size-8 text-muted-foreground" />
      <p className="text-sm font-medium text-muted-foreground">Switching workspace...</p>
    </div>
  );
}
```

Keep the existing `WorkspaceUnavailable` branch unchanged after this guard.

- [x] **Step 5: Run the focused test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WorkspaceUnavailable.test.tsx`

Expected: PASS; the dashboard guards stale-agent recovery while switching and the switcher provides both lifecycle hooks.

- [x] **Step 6: Run final verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WorkspaceUnavailable.test.tsx src/pages/SchedulePage.test.tsx && bunx tsc --noEmit && git diff --check`

Expected: all focused suites, TypeScript, and whitespace-diff checks exit 0.

- [ ] **Step 7: Update continuity and commit**

Update `CONTINUITY.md` with the verified state and commit:

```bash
git add src/components/TeamSwitcher.tsx src/components/WorkspaceUnavailable.test.tsx src/layouts/DashboardLayout.tsx CONTINUITY.md docs/superpowers/plans/2026-08-14-workspace-switching-transition.md
git commit -m "Show workspace switching state"
```
