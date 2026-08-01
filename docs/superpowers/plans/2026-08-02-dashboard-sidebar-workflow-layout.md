# Dashboard Sidebar and Workflow Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Calendar's booking action below the month calendar, place a single Workflow title above the canvas tools, and tighten and enlarge the expanded sidebar brand.

**Architecture:** Extract the Calendar sidebar and expanded app-sidebar brand into focused presentational components so their rendered hierarchy can be tested without mounting query-heavy pages. Keep Workflow's existing public component API, but consolidate its two floating panels into one ordered stack and mirror that structure in the loading skeleton.

**Tech Stack:** React 19, TypeScript 6, Tailwind CSS 4, shadcn UI, React Flow, Vitest 1.6, React DOM server rendering, Bun, Node.js 22.

## Global Constraints

- Use Node.js 22 for every script and test command.
- Preserve all existing Calendar actions, permission gates, month selection, filters, and horizontal insets.
- Render exactly one visible `Workflow` title above the canvas tool row using `font-title text-3xl font-normal tracking-tight text-foreground`.
- Keep the Workflow tool and navigation surfaces, actions, disabled states, and view behavior unchanged.
- Keep the expanded sidebar logo at `size-[1.35rem]`, set the wordmark to `text-[16px]`, and set the icon gap to `gap-[0.45rem]`.
- Do not change the collapsed sidebar brand behavior.
- Add no dependencies and do not modify `convex/_generated/api.d.ts`.
- Keep every new or structurally changed component below 300 lines.
- Treat the changes as unreleased: update `CONTINUITY.md`, but do not add a public changelog entry.

---

### Task 1: Calendar Sidebar Order

**Files:**
- Create: `src/components/calendar/CalendarSidebar.tsx`
- Create: `src/components/calendar/CalendarSidebar.test.tsx`
- Modify: `src/pages/CalendarPage.tsx:690-748,1128-1174`
- Modify: `src/pages/CalendarSidebarPadding.test.ts`

**Interfaces:**
- Consumes: the existing `Calendar`, `Button`, `SidebarPageTitleRow`, shared sidebar navigation classes, selected date/month state, filter counts, and callbacks from `CalendarPage`.
- Produces: `CalendarSidebar(props: CalendarSidebarProps): React.ReactElement`, where the props contain `selectedDate`, `visibleMonth`, `canManageCalendar`, `assignedToMeOnly`, `hasCurrentUser`, optional `{ all?: number; assigned?: number }` counts, and callbacks for month change, booking creation, and both filters.

- [ ] **Step 1: Write the failing rendered-order tests**

Create `CalendarSidebar.test.tsx` with a shared render helper and these assertions:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CalendarSidebar } from './CalendarSidebar';

function renderCalendarSidebar(canManageCalendar = true) {
  return renderToStaticMarkup(
    <CalendarSidebar
      assignedToMeOnly={false}
      canManageCalendar={canManageCalendar}
      eventFilterCounts={{ all: 2, assigned: 1 }}
      hasCurrentUser
      selectedDate={new Date(2026, 7, 2)}
      visibleMonth={new Date(2026, 7, 1)}
      onAssignedToMe={() => undefined}
      onChangeMonth={() => undefined}
      onCreateBooking={() => undefined}
      onShowAllEvents={() => undefined}
    />,
  );
}

describe('CalendarSidebar', () => {
  it('renders the month calendar before New Booking and View', () => {
    const markup = renderCalendarSidebar();
    expect(markup.indexOf('data-calendar-sidebar-section="month"')).toBeLessThan(
      markup.indexOf('New Booking'),
    );
    expect(markup.indexOf('New Booking')).toBeLessThan(markup.indexOf('>View<'));
  });

  it('keeps New Booking hidden without Calendar management permission', () => {
    expect(renderCalendarSidebar(false)).not.toContain('New Booking');
  });
});
```

The production change caught is moving the action above the month or accidentally dropping its permission gate.

- [ ] **Step 2: Run the Calendar test to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarSidebar.test.tsx --reporter=dot
```

Expected: FAIL because `CalendarSidebar` does not exist.

- [ ] **Step 3: Extract and reorder the Calendar sidebar**

Move `CalendarSidebarFilterRow` and `CalendarSidebarFilterSection` from `CalendarPage.tsx` into the new component. Render the title first, then the month wrapper, then the permission-gated booking action, then the View section:

```tsx
<aside className={cn(inboxColumnClassName, 'border-r border-border')}>
  <SidebarPageTitleRow title="Calendar" />
  <div className={cn(inboxColumnScrollClassName, 'no-scrollbar px-[0.45rem] py-[0.675rem]')}>
    <div className="flex justify-center pb-[0.675rem]" data-calendar-sidebar-section="month">
      <Calendar
        mode="single"
        selected={selectedDate}
        month={visibleMonth}
        onMonthChange={onChangeMonth}
        className="rounded-xl border border-border bg-card p-2"
      />
    </div>
    {canManageCalendar ? (
      <div className="px-4 pb-3">
        <Button type="button" size="lg" className="h-11 w-full gap-2 px-5 py-3" onClick={onCreateBooking}>
          <Plus data-icon="inline-start" />
          New Booking
        </Button>
      </div>
    ) : null}
    <CalendarSidebarFilterSection title="View">
      <CalendarSidebarFilterRow
        label="All events"
        icon={<CalendarIcon className="text-muted-foreground" />}
        isActive={!assignedToMeOnly}
        count={eventFilterCounts?.all}
        onClick={onShowAllEvents}
      />
      <CalendarSidebarFilterRow
        label="Assigned to me"
        icon={<User className="text-muted-foreground" />}
        isActive={assignedToMeOnly}
        count={eventFilterCounts?.assigned}
        onClick={onAssignedToMe}
        disabled={!hasCurrentUser}
      />
    </CalendarSidebarFilterSection>
  </div>
</aside>
```

Replace the original Calendar sidebar markup with:

```tsx
<CalendarSidebar
  assignedToMeOnly={assignedToMeOnly}
  canManageCalendar={canManageCalendar}
  eventFilterCounts={eventFilterCounts}
  hasCurrentUser={currentUser !== null && currentUser !== undefined}
  selectedDate={selectedDate}
  visibleMonth={visibleMonth}
  onAssignedToMe={() => setAssignedToMeOnly(true)}
  onChangeMonth={handleChangeMonth}
  onCreateBooking={() => setCreateBookingOpen(true)}
  onShowAllEvents={() => setAssignedToMeOnly(false)}
/>
```

Point the existing padding source contract at `CalendarSidebar.tsx` so it continues to protect `px-4`, `pb-3`, and the button dimensions.

- [ ] **Step 4: Run Calendar tests to verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarSidebar.test.tsx src/pages/CalendarSidebarPadding.test.ts src/components/booking/CreateBookingDialog.test.ts --reporter=dot
```

Expected: PASS with the rendered hierarchy and existing booking-dialog contract intact.

- [ ] **Step 5: Commit the Calendar task**

```bash
git add src/components/calendar/CalendarSidebar.tsx src/components/calendar/CalendarSidebar.test.tsx src/pages/CalendarPage.tsx src/pages/CalendarSidebarPadding.test.ts
git commit -m "Move booking action below calendar"
```

---

### Task 2: Workflow Title Hierarchy

**Files:**
- Create: `src/components/workflow/WorkflowToolbarHierarchy.test.tsx`
- Modify: `src/components/workflow/WorkflowToolbar.tsx:49-155`
- Modify: `src/components/workflow/WorkflowPageSkeleton.tsx:55-87`
- Modify: `src/components/workflow/WorkflowPageSkeleton.test.tsx`

**Interfaces:**
- Consumes: the existing `WorkflowToolbarProps`, React Flow `Panel` and zoom/fit methods, workflow view options, and existing tool callbacks.
- Produces: the same `WorkflowToolbar(props)` interface and behavior, with one top-left `Panel` containing an ordered title, tool surface, and navigation surface.

- [ ] **Step 1: Write the failing rendered toolbar and skeleton tests**

In `WorkflowToolbarHierarchy.test.tsx`, render the real toolbar inside `ReactFlowProvider` and assert one heading appears before the Zoom in control, while no navigation-card heading remains:

```tsx
const markup = renderToStaticMarkup(
  <ReactFlowProvider>
    <WorkflowToolbar
      activeView="messageHandling"
      layoutOrientation="horizontal"
      onArrange={() => undefined}
      onCleanup={() => undefined}
      onTemplateApply={() => undefined}
      onViewChange={() => undefined}
    />
  </ReactFlowProvider>,
);

expect(markup.match(/<h1[^>]*>Workflow<\/h1>/g)).toHaveLength(1);
expect(markup.indexOf('>Workflow</h1>')).toBeLessThan(markup.indexOf('Zoom in'));
expect(markup).not.toMatch(/<h2[^>]*>Workflow<\/h2>/);
expect(markup).toContain('font-title text-3xl font-normal tracking-tight text-foreground');
```

Update `WorkflowPageSkeleton.test.tsx` to render `WorkflowPageSkeleton` with `renderToStaticMarkup`, then assert `data-workflow-skeleton-navigation="page-title"` appears before `canvas-tools`, which appears before `workflow-tabs`.

The production changes caught are putting the title inside or below the tools, retaining the duplicate card title, or leaving the loading hierarchy stale.

- [ ] **Step 2: Run Workflow tests to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowToolbarHierarchy.test.tsx src/components/workflow/WorkflowPageSkeleton.test.tsx --reporter=dot
```

Expected: FAIL because the live title is still in the navigation card and the skeleton has no page-title marker.

- [ ] **Step 3: Consolidate the Workflow controls into one ordered stack**

Replace the two top-left panels with one panel:

```tsx
<Panel position="top-left" className="nodrag nopan m-4">
  <div className="flex flex-col items-start gap-3">
    <h1 className="font-title text-3xl font-normal tracking-tight text-foreground">
      Workflow
    </h1>
    <div className="flex items-center gap-1 rounded-lg border border-border bg-background/95 p-1 backdrop-blur">
      <Button type="button" variant="ghost" size="icon-sm" onClick={() => zoomIn()}>
        <ZoomIn data-icon="inline-start" />
        <span className="sr-only">Zoom in</span>
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" onClick={() => zoomOut()}>
        <ZoomOut data-icon="inline-start" />
        <span className="sr-only">Zoom out</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => fitView({ padding: 0.25, duration: 240 })}
      >
        <Maximize2 data-icon="inline-start" />
        <span className="sr-only">Fit view</span>
      </Button>
      <div className="mx-1 h-8 w-px bg-border" />
      {showCleanup ? (
        <Button type="button" variant="ghost" size="sm" disabled={cleanupDisabled} onClick={onCleanup}>
          <WandSparkles data-icon="inline-start" />
          Cleanup
        </Button>
      ) : null}
      {showTemplates ? (
        <WorkflowTemplateHoverCard disabled={templatesDisabled} onPreview={onTemplateApply} />
      ) : null}
      <Button type="button" variant="ghost" size="sm" disabled={arrangeDisabled} onClick={onArrange}>
        <ArrangeIcon data-icon="inline-start" className={cn(arrangeLoading && 'animate-spin')} />
        {arrangeLabel}
      </Button>
    </div>
    <div className="flex w-48 flex-col gap-2 rounded-lg border border-border bg-background/95 p-2 backdrop-blur">
      <nav role="tablist" aria-label="Workflow sections" className="flex flex-col gap-1">
        {workflowCanvasViewOptions.map((option) => {
          const isActive = option.id === activeView;
          return (
            <Button
              key={option.id}
              type="button"
              role="tab"
              variant="ghost"
              size="sm"
              aria-selected={isActive}
              className={cn(
                'w-full justify-start gap-3 rounded-md px-3',
                isActive && 'bg-secondary font-semibold text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground',
              )}
              onClick={() => onViewChange(option.id)}
            >
              <option.Icon data-icon="inline-start" />
              {option.label}
            </Button>
          );
        })}
      </nav>
    </div>
  </div>
</Panel>
```

Remove the navigation card's `h2` and the translated second `Panel`. Do not change tool callbacks, button labels, disabled expressions, or view-button mapping.

In `WorkflowPageSkeleton.tsx`, replace the separate tool and tab absolute blocks with one `absolute left-4 top-4` vertical stack. Add a title skeleton carrying `data-workflow-skeleton-navigation="page-title"`, followed by the unchanged tool and tab skeleton surfaces. Remove the obsolete `top-[72px]` transform.

- [ ] **Step 4: Run Workflow tests to verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowToolbarHierarchy.test.tsx src/components/workflow/WorkflowToolbar.test.ts src/components/workflow/WorkflowDraftToolbar.test.ts src/components/workflow/WorkflowPageSkeleton.test.tsx --reporter=dot
```

Expected: PASS with one title and all existing toolbar contracts unchanged.

- [ ] **Step 5: Commit the Workflow task**

```bash
git add src/components/workflow/WorkflowToolbar.tsx src/components/workflow/WorkflowToolbarHierarchy.test.tsx src/components/workflow/WorkflowPageSkeleton.tsx src/components/workflow/WorkflowPageSkeleton.test.tsx
git commit -m "Place Workflow title above canvas tools"
```

---

### Task 3: Expanded Sidebar Brand

**Files:**
- Create: `src/components/ExpandedAppSidebarHeader.tsx`
- Create: `src/components/ExpandedAppSidebarHeader.test.tsx`
- Modify: `src/components/app-sidebar.tsx:87-111`

**Interfaces:**
- Consumes: `toggleSidebar: () => void`, the existing `/icon.svg`, shadcn `SidebarHeader` and `Button`, and `PanelLeftClose`.
- Produces: `ExpandedAppSidebarHeader({ onCollapse }: { onCollapse: () => void }): React.ReactElement` for the expanded-only app-sidebar header.

- [ ] **Step 1: Write the failing rendered brand test**

Create `ExpandedAppSidebarHeader.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { ExpandedAppSidebarHeader } from './ExpandedAppSidebarHeader';

test('renders the larger Kilobot wordmark closer to the unchanged logo', () => {
  const markup = renderToStaticMarkup(
    <ExpandedAppSidebarHeader onCollapse={() => undefined} />,
  );
  expect(markup).toContain('gap-[0.45rem]');
  expect(markup).toContain('size-[1.35rem]');
  expect(markup).toContain('text-[16px]');
  expect(markup).toContain('Kilobot');
  expect(markup).toContain('Collapse Sidebar');
});
```

The production changes caught are widening the brand gap, shrinking the wordmark, changing the logo size, or losing the collapse action's accessible name.

- [ ] **Step 2: Run the brand test to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ExpandedAppSidebarHeader.test.tsx --reporter=dot
```

Expected: FAIL because `ExpandedAppSidebarHeader` does not exist.

- [ ] **Step 3: Extract and apply the expanded brand proportions**

Create the component using the existing expanded `SidebarHeader`, brand link, logo, and collapse button. Apply these exact classes:

```tsx
<a href="/workspace" className="flex items-center gap-[0.45rem]">
  <img src="/icon.svg" className="size-[1.35rem] dark:invert" alt="" />
  <span className="font-title text-[16px] font-semibold tracking-normal">Kilobot</span>
</a>
```

Replace only the expanded branch in `AppSidebar` with `<ExpandedAppSidebarHeader onCollapse={toggleSidebar} />`. Leave the collapsed branch byte-for-byte unchanged.

- [ ] **Step 4: Run sidebar tests to verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ExpandedAppSidebarHeader.test.tsx src/components/AppSidebarAvatar.test.ts src/components/AppSidebarFeatureFlag.test.ts --reporter=dot
```

Expected: PASS with the new brand dimensions and existing sidebar navigation behavior intact.

- [ ] **Step 5: Commit the sidebar task**

```bash
git add src/components/ExpandedAppSidebarHeader.tsx src/components/ExpandedAppSidebarHeader.test.tsx src/components/app-sidebar.tsx
git commit -m "Refine expanded sidebar brand"
```

---

### Task 4: Final Verification and Continuity

**Files:**
- Modify: `CONTINUITY.md`
- Verify only: `kilobot-docs/docs/releases/changelog.mdx`

**Interfaces:**
- Consumes: the three independently green task commits and the repository's documented test baseline.
- Produces: a concise dated verification receipt without publishing an unconfirmed release note.

- [ ] **Step 1: Run the focused regression suite**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run \
  src/components/calendar/CalendarSidebar.test.tsx \
  src/pages/CalendarSidebarPadding.test.ts \
  src/components/booking/CreateBookingDialog.test.ts \
  src/components/workflow/WorkflowToolbarHierarchy.test.tsx \
  src/components/workflow/WorkflowToolbar.test.ts \
  src/components/workflow/WorkflowDraftToolbar.test.ts \
  src/components/workflow/WorkflowPageSkeleton.test.tsx \
  src/components/ExpandedAppSidebarHeader.test.tsx \
  src/components/AppSidebarAvatar.test.ts \
  src/components/AppSidebarFeatureFlag.test.ts \
  --reporter=dot
```

Expected: PASS with no warnings attributable to these components.

- [ ] **Step 2: Run scoped lint and structural checks**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint \
  src/components/calendar/CalendarSidebar.tsx \
  src/components/calendar/CalendarSidebar.test.tsx \
  src/pages/CalendarPage.tsx \
  src/pages/CalendarSidebarPadding.test.ts \
  src/components/workflow/WorkflowToolbar.tsx \
  src/components/workflow/WorkflowToolbarHierarchy.test.tsx \
  src/components/workflow/WorkflowPageSkeleton.tsx \
  src/components/workflow/WorkflowPageSkeleton.test.tsx \
  src/components/ExpandedAppSidebarHeader.tsx \
  src/components/ExpandedAppSidebarHeader.test.tsx \
  src/components/app-sidebar.tsx
wc -l src/components/calendar/CalendarSidebar.tsx src/components/workflow/WorkflowToolbar.tsx src/components/workflow/WorkflowPageSkeleton.tsx src/components/ExpandedAppSidebarHeader.tsx src/components/app-sidebar.tsx
git diff --check
```

Expected: zero new lint findings, every listed component below 300 lines, and no whitespace errors. If `CalendarPage.tsx` reports only its documented pre-existing hook findings, record them without broadening this layout task.

- [ ] **Step 3: Run the repository-wide suite and classify failures**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --reporter=json --outputFile=/private/tmp/dashboard-layout-vitest.json
```

Read the JSON summary with Node.js 22. Expected baseline: the focused files remain green; unrelated failures may remain in `convex/doubleSave.test.ts`, `src/router/ReferralFeatureRoute.test.ts`, `src/components/knowledge-base/KnowledgeBaseNavigation.test.ts`, and the established Docs suite detection.

- [ ] **Step 4: Record the verified customer-facing outcome**

Update the newest `CONTINUITY.md` snapshot entry with the implemented order, exact Workflow/sidebar typography, focused test count, lint/line/whitespace results, and the fresh repository-wide baseline. Do not edit the public changelog because production availability is unconfirmed.

- [ ] **Step 5: Commit the verification receipt**

```bash
git add CONTINUITY.md
git commit -m "Record dashboard layout verification"
```
