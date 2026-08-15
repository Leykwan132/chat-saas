# Approved UI Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ship the six approved service, availability, routing, and Calendar UI refinements without changing their underlying business behaviour.

**Architecture:** Keep each change at its existing UI boundary: validation in the service dialog, layout in event details, value conversion in a new schedule-time combobox, and copy/icon/hover refinements in their owning components. No API, route, permissions, or persisted-data contract changes are introduced.

**Tech Stack:** React, TypeScript, Tailwind CSS, Base UI Combobox, lucide-react, Vitest.

## Global Constraints

- Keep schedule data as minutes from midnight and retain 15-minute presets.
- Preserve existing routes, permission identifiers, server behaviour, and Calendar controls.
- Keep all code files below 300 lines and add no dependencies.
- Run commands with Node v22 using `source ~/.nvm/nvm.sh && nvm use 22`.

---

### Task 1: Create Service required-name feedback

**Files:**
- Modify: `src/components/services/CreateServiceDialog.tsx`
- Modify: `src/components/services/CreateServiceDialog.test.tsx`

**Interfaces:**
- Consumes: `saveService()` and the Name field in `CreateServiceInfoStep`.
- Produces: an enabled primary action that reports and focuses an empty Name before any mutation.

- [x] **Step 1: Write the failing regression assertion**

```tsx
expect(dialogSource).not.toContain('disabled={saving || !form.name.trim()}');
expect(dialogSource).toContain("setError('Service name is required.')");
```

- [x] **Step 2: Run the dialog test and verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/services/CreateServiceDialog.test.tsx`

Expected: FAIL because the action is currently disabled for an empty name.

- [x] **Step 3: Implement focused feedback**

```tsx
if (!name) {
  setError('Service name is required.');
  nameInputRef.current?.focus();
  return;
}
```

Pass `nameInputRef` to the Name input, remove the empty-name portion of the primary button’s disabled state, and clear this error when a non-empty name is entered.

- [x] **Step 4: Run the dialog test and verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/services/CreateServiceDialog.test.tsx`

Expected: PASS.

### Task 2: Calendar internal-detail headers

**Files:**
- Modify: `src/components/calendar/CalendarEventDetailsBody.tsx`
- Modify: `src/components/calendar/CalendarEventDetailsBody.test.tsx`

**Interfaces:**
- Consumes: `NotesBlock` and `SummaryBlock` event detail content.
- Produces: icon-and-label header rows above full-width neutral content surfaces.

- [x] **Step 1: Write the failing layout assertion**

```tsx
expect(markup.match(/flex items-center gap-3/g)).toHaveLength(2);
expect(markup.match(/flex flex-col gap-1.5/g)).toHaveLength(2);
```

- [x] **Step 2: Run the event-details test and verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarEventDetailsBody.test.tsx`

Expected: FAIL because both blocks currently place their content beside the icon.

- [x] **Step 3: Implement stacked headers and surfaces**

```tsx
<div className="flex flex-col gap-1.5">
  <div className="flex items-center gap-3">...</div>
  <div className="rounded-lg bg-muted px-4 py-3">...</div>
</div>
```

Apply the structure to Notes and Summary while retaining the outer responsive summary grid.

- [x] **Step 4: Run the event-details test and verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarEventDetailsBody.test.tsx`

Expected: PASS.

### Task 3: Editable weekly availability times

**Files:**
- Create: `src/components/ScheduleTimeCombobox.tsx`
- Create: `src/components/ScheduleTimeCombobox.test.tsx`
- Modify: `src/components/WeeklyAvailabilityEditor.tsx`
- Modify: `src/components/WeeklyAvailabilityEditor.test.tsx`

**Interfaces:**
- Consumes: `calendarTimeLabelToMinutes`, `formatMinutesCalLabel`, and existing schedule time options.
- Produces: `ScheduleTimeCombobox` that commits valid typed 12/24-hour input as minutes.

- [x] **Step 1: Write the failing time-combobox tests**

```tsx
expect(source).toContain('calendarTimeLabelToMinutes');
expect(source).toContain('onKeyDown');
expect(source).toContain('onBlur');
```

- [x] **Step 2: Run the new combobox test and verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ScheduleTimeCombobox.test.tsx`

Expected: FAIL because the component does not exist.

- [x] **Step 3: Implement compatible typed selection**

```tsx
const typedMinutes = calendarTimeLabelToMinutes(inputValue);
if (typedMinutes !== null && typedMinutes <= maxValue) onChange(typedMinutes);
```

Use shared Combobox primitives with structured option values, normalize valid blur/Enter input using `formatMinutesCalLabel`, retain the start/end constraint, use `text-base` for times and days, and keep shared Switch dimensions unchanged.

- [x] **Step 4: Run the availability tests and verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ScheduleTimeCombobox.test.tsx src/components/WeeklyAvailabilityEditor.test.tsx`

Expected: PASS.

### Task 4: Routing copy and icon semantics

**Files:**
- Modify: `src/components/app-sidebar-nav.ts`
- Modify: `src/pages/LeadAssignmentPage.tsx`
- Modify: `src/pages/DashboardIndexPageTitles.test.ts`
- Modify: `src/components/workflow/WorkflowEdge.tsx`
- Modify: `src/components/workflow/WorkflowEdge.test.tsx`

**Interfaces:**
- Consumes: the existing `lead-assignment` route and workflow condition label.
- Produces: Routing user copy, a `Split` navigation icon, and a `SignpostBig` workflow-condition icon.

- [x] **Step 1: Write failing copy and icon assertions**

```tsx
expect(navSource).toContain("icon: Split, label: 'Routing'");
expect(pageSource).toContain('Control how incoming leads are routed to your team.');
expect(edgeSource).toContain('SignpostBig');
```

- [x] **Step 2: Run the focused Routing and workflow tests and verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/DashboardIndexPageTitles.test.ts src/components/workflow/WorkflowEdge.test.tsx`

Expected: FAIL because the old label and `Split` workflow icon remain.

- [x] **Step 3: Implement the visible copy and icon swap**

```tsx
{ to: `/dashboard/${agentId}/lead-assignment`, icon: Split, label: 'Routing', requiredPermission: Permission.ROUTING_READ }
```

Keep the URL and permissions intact; render `Routing` plus the approved description in the page header; replace the WorkflowEdge condition icon import and element with `SignpostBig`.

- [x] **Step 4: Run focused Routing and workflow tests and verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/DashboardIndexPageTitles.test.ts src/components/workflow/WorkflowEdge.test.tsx`

Expected: PASS.

### Task 5: Google Calendar connection badge and header hover treatment

**Files:**
- Modify: `src/components/calendar/GoogleCalendarConnectionCard.tsx`
- Modify: `src/components/calendar/GoogleCalendarConnection.test.tsx`
- Modify: `src/pages/CalendarPage.tsx`

**Interfaces:**
- Consumes: the connected Google account control and Calendar timezone trigger.
- Produces: a single supplied-geometry green badge with a white tick and shared `hover:bg-muted` header feedback.

- [x] **Step 1: Write failing badge and hover assertions**

```tsx
expect(source).toContain('<path fill="currentColor"');
expect(source).toContain('stroke="white"');
expect(source).toContain('hover:bg-muted');
```

- [x] **Step 2: Run the Calendar connection test and verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/GoogleCalendarConnection.test.tsx`

Expected: FAIL because the card uses the old circle check and each hover class is unchanged.

- [x] **Step 3: Implement the supplied badge and subtle hover affordance**

```tsx
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path fill="currentColor" stroke="currentColor" d="..." />
  <path stroke="white" d="m9 12 2 2 4-4" />
</svg>
```

Remove the circle wrapper and `HiCheck`; retain `aria-label="Active"`. Change both Calendar-header controls from `hover:bg-input/50` to `hover:bg-muted` and add `transition-colors`.

- [x] **Step 4: Run focused Calendar verification and whitespace checks**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/GoogleCalendarConnection.test.tsx && git diff --check`

Expected: PASS with no whitespace errors.

### Task 6: Document and verify the completed refinement set

**Files:**
- Modify: `CONTINUITY.md`
- Modify: `docs/superpowers/plans/2026-08-16-approved-ui-refinements.md`

**Interfaces:**
- Consumes: the focused test suites from Tasks 1–5.
- Produces: an updated continuity decision and completed task markers.

- [x] **Step 1: Mark complete plan steps and record durable decisions**

Update the checkboxes for completed steps and add concise 2026-08-16 `[USER]` decision entries for the shipped UX choices.

- [x] **Step 2: Run all focused refinement suites**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/services/CreateServiceDialog.test.tsx src/components/calendar/CalendarEventDetailsBody.test.tsx src/components/ScheduleTimeCombobox.test.tsx src/components/WeeklyAvailabilityEditor.test.tsx src/pages/DashboardIndexPageTitles.test.ts src/components/workflow/WorkflowEdge.test.tsx src/components/calendar/GoogleCalendarConnection.test.tsx && git diff --check`

Expected: PASS with no whitespace errors.

- [x] **Step 3: Commit the completed refinements**

```bash
git add src/components/services/CreateServiceDialog.tsx src/components/services/CreateServiceDialog.test.tsx src/components/calendar/CalendarEventDetailsBody.tsx src/components/calendar/CalendarEventDetailsBody.test.tsx src/components/ScheduleTimeCombobox.tsx src/components/ScheduleTimeCombobox.test.tsx src/components/WeeklyAvailabilityEditor.tsx src/components/WeeklyAvailabilityEditor.test.tsx src/components/app-sidebar-nav.ts src/pages/LeadAssignmentPage.tsx src/pages/DashboardIndexPageTitles.test.ts src/components/workflow/WorkflowEdge.tsx src/components/workflow/WorkflowEdge.test.tsx src/components/calendar/GoogleCalendarConnectionCard.tsx src/components/calendar/GoogleCalendarConnection.test.tsx src/pages/CalendarPage.tsx CONTINUITY.md docs/superpowers/plans/2026-08-16-approved-ui-refinements.md docs/superpowers/plans/2026-08-16-weekly-availability-time-combobox.md
git commit -m "Refine service and calendar controls"
```
