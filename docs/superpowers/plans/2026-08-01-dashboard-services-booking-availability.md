# Dashboard Services and Booking Availability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove dashboard content-header dividers, replace the Services sections with line tabs, and add an immediately actionable weekly teammate-availability roster to the Book appointment workflow modal.

**Architecture:** Keep the three UI changes independent: a source-contract-backed header cleanup, a local shadcn Tabs composition on Services, and a dedicated workflow availability component backed by existing team/schedule queries and mutations. The workflow form owns only aggregate Apply eligibility; the new component owns roster display, navigation, pending mutations, and error isolation. A pure formatter converts weekly shifts into compact grouped labels.

**Tech Stack:** React 19, TypeScript, React Router, Convex React hooks, shadcn/Radix UI, Tailwind CSS, Lucide, Sonner, Vitest, Node.js v22.

## Global Constraints

- Run every script and test under Node v22 with `source ~/.nvm/nvm.sh && nvm use 22` in the same command.
- Reuse `src/components/ui/tabs.tsx`; do not modify or reinstall it.
- Do not add dependencies, code comments, or code files longer than 300 lines.
- Preserve fixed navigation borders and borders inside cards, tables, dialogs, forms, tabs, and other content sections.
- Reuse `api.users.getUsers`, `api.leadRouting.schedules.listForAgent`, `api.leadRouting.schedules.addUser`, and `api.leadRouting.schedules.updateUser`; no Convex backend change is required.
- Preserve unrelated dirty-worktree changes, especially `convex/_generated/api.d.ts`.
- These changes are unreleased until production availability is confirmed; update `CONTINUITY.md`, not the release changelog.

---

### Task 1: Compact Weekly Availability Model

**Files:**
- Create: `src/components/workflow/workflowBookingAvailabilityModel.ts`
- Test: `src/components/workflow/workflowBookingAvailabilityModel.test.ts`

**Interfaces:**
- Consumes: `ScheduleShift` and `resolveScheduleTimezone` from `src/lib/scheduleUtils.ts`, and `formatTimeZoneDisplayLabel` from `src/lib/calendarTimeUtils.ts`.
- Produces: `formatWorkflowWeeklyAvailability(shifts, timezone): { lines: string[]; timezoneLabel: string }`, `hasAcceptingLeadMember(entries): boolean`, and roster display types used by Task 2.

- [ ] **Step 1: Write the failing formatter and eligibility tests**

```ts
test('groups consecutive weekdays with identical hours', () => {
  expect(formatWorkflowWeeklyAvailability(weekdayShifts, 'Asia/Kuala_Lumpur').lines)
    .toEqual(['Mon–Fri · 9:00 AM–5:00 PM']);
});

test('keeps split schedules compact', () => {
  expect(formatWorkflowWeeklyAvailability(splitShifts, 'Asia/Kuala_Lumpur').lines)
    .toEqual(['Mon–Tue · 9:00 AM–12:00 PM, 1:00 PM–5:00 PM', 'Sat · 10:00 AM–2:00 PM']);
});

test('does not invent default hours', () => {
  expect(formatWorkflowWeeklyAvailability([], undefined).lines).toEqual(['No hours set']);
});

test('eligibility depends only on accepting leads', () => {
  expect(hasAcceptingLeadMember([{ schedule: { enabled: false } }])).toBe(false);
  expect(hasAcceptingLeadMember([{ schedule: { enabled: true } }])).toBe(true);
});
```

- [ ] **Step 2: Run the model test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowBookingAvailabilityModel.test.ts`

Expected: FAIL because the model module does not exist.

- [ ] **Step 3: Implement the formatter and display types**

```ts
export function formatWorkflowWeeklyAvailability(
  shifts: ScheduleShift[],
  timezone: string | undefined,
) {
  const timezoneLabel = formatTimeZoneDisplayLabel(resolveScheduleTimezone(timezone));
  if (shifts.length === 0) return { lines: ['No hours set'], timezoneLabel };
  return { lines: groupConsecutiveDaysByHours(shifts), timezoneLabel };
}

export function hasAcceptingLeadMember(
  entries: Array<{ schedule: { enabled: boolean } }>,
) {
  return entries.some(({ schedule }) => schedule.enabled);
}
```

Implement `groupConsecutiveDaysByHours` locally using `Sun` through `Sat`, sorted periods, en dashes, and ` · `. Do not call `shiftsForDisplay`, because empty persisted hours must stay empty. Export `WorkflowAvailabilityRosterEntry` and `WorkflowAvailabilityTeammate` using existing Convex `Doc` types.

- [ ] **Step 4: Run the model test and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowBookingAvailabilityModel.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the model**

```bash
git add src/components/workflow/workflowBookingAvailabilityModel.ts src/components/workflow/workflowBookingAvailabilityModel.test.ts
git commit -m "Add compact workflow availability summaries"
```

---

### Task 2: Workflow Availability Roster

**Files:**
- Create: `src/components/workflow/WorkflowBookingAvailabilitySection.tsx`
- Test: `src/components/workflow/WorkflowBookingAvailabilitySection.test.tsx`

**Interfaces:**
- Consumes: Task 1 exports, `memberLabel`, React Router `Link`, existing Convex queries/mutations, `Switch`, `Skeleton`, `toast`, and `Id<'agents'>`.
- Produces: `WorkflowBookingAvailabilitySection({ agentId, onEligibilityChange }): JSX.Element` and a presentational `WorkflowBookingAvailabilityList` for isolated rendering tests.

- [ ] **Step 1: Write the failing rendered roster contract**

```tsx
const markup = renderToStaticMarkup(
  <MemoryRouter>
    <WorkflowBookingAvailabilityList
      agentId={'agent-1' as Id<'agents'>}
      teammates={[alex, jamie]}
      roster={[alexSchedule, jamieSchedule]}
      pendingUserIds={new Set()}
      onToggle={vi.fn()}
    />
  </MemoryRouter>,
);

expect(markup).toContain('Alex Tan');
expect(markup).toContain('Mon–Fri · 9:00 AM–5:00 PM');
expect(markup).toContain('(GMT+8:00) Kuala Lumpur');
expect(markup).toContain('Accepting leads');
expect(markup).toContain('/dashboard/agent-1/availability/user-alex');
expect(markup).toContain('max-h-64');
```

Add source assertions for `event.stopPropagation()`, a per-user pending set, both `addUser` and `updateUser`, the empty/error copy, and the zero-enabled warning.

- [ ] **Step 2: Run the roster test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowBookingAvailabilitySection.test.tsx`

Expected: FAIL because the section does not exist.

- [ ] **Step 3: Implement querying, sorting, and compact rows**

The section must query all organization teammates and schedules for `agentId`, sort enabled teammates first and then by `memberLabel`, and call `onEligibilityChange(hasAcceptingLeadMember(roster))` after loading. Render a `max-h-64 overflow-y-auto` bordered list, three compact skeleton rows while loading, and `No teammates are available for appointment booking.` when empty.

Each row must show the teammate name, every compact weekly line, timezone label, `Accepting leads`, and the switch. Use an absolute row `Link` to `/dashboard/${agentId}/availability/${encodeURIComponent(workosUserId)}` and keep the switch at `relative z-10`. A teammate without a schedule shows `No hours set` and an unchecked switch.

- [ ] **Step 4: Implement immediate switch mutations**

```ts
async function updateAcceptingLeads(teammate: WorkflowAvailabilityTeammate, enabled: boolean) {
  markPending(teammate.workosUserId);
  const toastId = toast.loading(enabled ? 'Turning on availability…' : 'Turning off availability…');
  try {
    const scheduleId = rosterByUserId.get(teammate.workosUserId)?.schedule._id
      ?? await addUser({ agentId, workosUserId: teammate.workosUserId });
    await updateUser({ userScheduleId: scheduleId, enabled });
    toast.success(enabled ? 'Availability turned on' : 'Availability turned off', { id: toastId });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Update failed', { id: toastId });
  } finally {
    clearPending(teammate.workosUserId);
  }
}
```

Disable only the mutated teammate’s switch. Stop switch click propagation so it never follows the row link. Availability mutations must not change workflow draft state.

- [ ] **Step 5: Add local query error isolation**

Wrap the query-owning child in a small error boundary in the same file. Its mounted fallback calls `onEligibilityChange(false)` and renders `Availability is temporarily unavailable.` This keeps the workflow fields and prior selections mounted.

- [ ] **Step 6: Run roster and model tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowBookingAvailabilitySection.test.tsx src/components/workflow/workflowBookingAvailabilityModel.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the roster**

```bash
git add src/components/workflow/WorkflowBookingAvailabilitySection.tsx src/components/workflow/WorkflowBookingAvailabilitySection.test.tsx
git commit -m "Add booking workflow availability roster"
```

---

### Task 3: Workflow Inspector Apply Eligibility

**Files:**
- Modify: `src/components/workflow/WorkflowInspectorForm.tsx`
- Modify: `src/components/workflow/WorkflowInspectorForm.test.ts`

**Interfaces:**
- Consumes: `WorkflowBookingAvailabilitySection` from Task 2.
- Produces: Book appointment Apply validation requiring `hasAcceptingLeadMember === true`; all other node kinds remain unchanged.

- [ ] **Step 1: Write the failing placement and validation regression**

```ts
test('book appointment requires an accepting teammate', () => {
  expect(source).toContain('<WorkflowBookingAvailabilitySection');
  expect(source.indexOf('<WorkflowBookingServicesSection')).toBeLessThan(
    source.indexOf('<WorkflowBookingAvailabilitySection'),
  );
  expect(source).toContain('hasAcceptingLeadMember !== true');
  expect(source).toContain('Turn on availability for at least one teammate to use appointment booking.');
});
```

- [ ] **Step 2: Run the inspector test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowInspectorForm.test.ts`

Expected: FAIL because no availability state is integrated.

- [ ] **Step 3: Add availability state below Services**

```tsx
const [hasAcceptingLeadMember, setHasAcceptingLeadMember] = useState<boolean>();

<WorkflowBookingAvailabilitySection
  agentId={agentId}
  onEligibilityChange={setHasAcceptingLeadMember}
/>
```

Render `Turn on availability for at least one teammate to use appointment booking.` only after state resolves to `false`, not during loading.

- [ ] **Step 4: Extend the Apply predicate**

```ts
const availabilityBlocksApply =
  isBookAppointmentAction && hasAcceptingLeadMember !== true;
const saveDisabled =
  isSaving || !name.trim() ||
  (saveRequiresDescription && !goal.trim()) ||
  !hasNodeChanges || availabilityBlocksApply;
```

Do not include availability mutations in `hasNodeChanges`; they save immediately and persist even if the modal closes.

- [ ] **Step 5: Run workflow availability tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowInspectorForm.test.ts src/components/workflow/WorkflowBookingAvailabilitySection.test.tsx src/components/workflow/workflowBookingAvailabilityModel.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the integration**

```bash
git add src/components/workflow/WorkflowInspectorForm.tsx src/components/workflow/WorkflowInspectorForm.test.ts
git commit -m "Require booking workflow availability"
```

---

### Task 4: Services Line Tabs

**Files:**
- Modify: `src/pages/ServicesPage.tsx`
- Modify: `src/pages/ServicesPage.test.tsx`

**Interfaces:**
- Consumes: `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent` from `@/components/ui/tabs`.
- Produces: uncontrolled `services` and `appointments` panels without URL state.

- [ ] **Step 1: Write the failing rendered tabs regression**

```ts
expect(markup).toContain('role="tablist"');
expect(markup).toContain('>Your Services</button>');
expect(markup).toContain('>Booked Appointments</button>');
expect(markup).toContain('data-state="active"');
expect(markup).not.toContain('<h2>Your Services</h2>');
expect(markup).not.toContain('<h2>Booked Appointments</h2>');
```

Add source assertions for `variant="line"`, `defaultValue="services"`, and both `TabsContent` values.

- [ ] **Step 2: Run the Services test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ServicesPage.test.tsx`

Expected: FAIL because both sections still render together.

- [ ] **Step 3: Compose the two tabs**

```tsx
<Tabs defaultValue="services" className="gap-6">
  <TabsList variant="line">
    <TabsTrigger value="services">Your Services</TabsTrigger>
    <TabsTrigger value="appointments">Booked Appointments</TabsTrigger>
  </TabsList>
  <TabsContent value="services">{servicesPanel}</TabsContent>
  <TabsContent value="appointments">{appointmentsPanel}</TabsContent>
</Tabs>
```

Move existing cards, empty states, and appointments unchanged. Preserve queries, mutations, permissions, active/inactive labels, and navigation.

- [ ] **Step 4: Run Services regressions and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ServicesPage.test.tsx src/pages/PageGuideSections.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the tabs**

Review the complete `ServicesPage.tsx` diff first because it already contains the requested uncommitted Active/Inactive label change.

```bash
git add src/pages/ServicesPage.tsx src/pages/ServicesPage.test.tsx
git commit -m "Add Services page tabs"
```

---

### Task 5: Dashboard Content-Header Divider Cleanup

**Files:**
- Create: `src/pages/DashboardContentHeaderSeparators.test.ts`
- Modify: `src/pages/ChannelsPage.tsx`, `src/pages/BroadcastPage.tsx`, `src/pages/BroadcastDetailPage.tsx`
- Modify: `src/pages/FollowUpPage.tsx`, `src/pages/FollowUpDetailPage.tsx`, `src/pages/QuickRepliesPage.tsx`
- Modify: `src/pages/ServicesPage.tsx`, `src/pages/ServicePage.tsx`, `src/pages/SettingsPage.tsx`
- Modify: `src/pages/LeadAssignmentPage.tsx`, `src/pages/TemplatesPage.tsx`, `src/pages/TemplateDetailPage.tsx`
- Modify: `src/pages/ChannelWhatsAppTemplatesPage.tsx`, `src/pages/CreateTemplatePage.tsx`
- Modify: `src/components/agent-setup/AgentSetupHeader.tsx`, `src/components/knowledge-base/KnowledgeBaseHeader.tsx`
- Modify: `src/components/templates/TemplateDetailPageSkeleton.tsx`

**Interfaces:**
- Consumes: existing page markup only.
- Produces: a source contract that distinguishes dashboard title headers from preserved navigation and internal borders.

- [ ] **Step 1: Write the failing content-header source contract**

```ts
for (const path of contentHeaderPaths) {
  test(`${path} has no dashboard title divider`, () => {
    const source = readFileSync(path, 'utf8');
    expect(source).not.toMatch(/(?:header|div) className="[^"]*border-b border-border pb-6/);
  });
}
```

List every file above explicitly. Add positive assertions for representative fixed app/onboarding headers and an internal dialog/table border so the test does not authorize broad separator removal.

- [ ] **Step 2: Run the header contract and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/DashboardContentHeaderSeparators.test.ts`

Expected: FAIL on current content-header classes.

- [ ] **Step 3: Remove only divider-owned classes**

Remove `border-b border-border` from each listed title/description header and matching skeleton. Remove `pb-6` only when it clears that divider. Preserve responsive layout, page gaps, actions, badges, back links, and internal borders. In `CreateTemplatePage.tsx`, retain `mb-6` unless surrounding page spacing already replaces it.

- [ ] **Step 4: Run affected page tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/DashboardContentHeaderSeparators.test.ts src/pages/ServicesPage.test.tsx src/pages/ServicePage.test.tsx src/pages/BroadcastPageStructure.test.ts src/pages/ChannelsPageLayout.test.ts src/pages/PageGuideSections.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the header cleanup**

Review the complete Channels, Broadcast, Service, and Services diffs before staging because they contain earlier requested UI changes that must be preserved.

```bash
git add src/pages/DashboardContentHeaderSeparators.test.ts src/pages/ChannelsPage.tsx src/pages/BroadcastPage.tsx src/pages/BroadcastDetailPage.tsx src/pages/FollowUpPage.tsx src/pages/FollowUpDetailPage.tsx src/pages/QuickRepliesPage.tsx src/pages/ServicesPage.tsx src/pages/ServicePage.tsx src/pages/SettingsPage.tsx src/pages/LeadAssignmentPage.tsx src/pages/TemplatesPage.tsx src/pages/TemplateDetailPage.tsx src/pages/ChannelWhatsAppTemplatesPage.tsx src/pages/CreateTemplatePage.tsx src/components/agent-setup/AgentSetupHeader.tsx src/components/knowledge-base/KnowledgeBaseHeader.tsx src/components/templates/TemplateDetailPageSkeleton.tsx
git commit -m "Remove dashboard content header dividers"
```

---

### Task 6: Integrated Verification and Continuity

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: verified local evidence and an unreleased continuity record.

- [ ] **Step 1: Run all focused tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowBookingAvailabilityModel.test.ts src/components/workflow/WorkflowBookingAvailabilitySection.test.tsx src/components/workflow/WorkflowInspectorForm.test.ts src/pages/ServicesPage.test.tsx src/pages/DashboardContentHeaderSeparators.test.ts src/pages/ServicePage.test.tsx src/pages/BroadcastPageStructure.test.ts src/pages/ChannelsPageLayout.test.ts src/pages/PageGuideSections.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 2: Run scoped lint and line counts**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/workflow/WorkflowBookingAvailabilitySection.tsx src/components/workflow/workflowBookingAvailabilityModel.ts src/components/workflow/WorkflowInspectorForm.tsx src/pages/ServicesPage.tsx
wc -l src/components/workflow/WorkflowBookingAvailabilitySection.tsx src/components/workflow/workflowBookingAvailabilityModel.ts src/components/workflow/WorkflowInspectorForm.tsx src/pages/ServicesPage.tsx
```

Expected: zero lint errors and every code file at or below 300 lines. Report existing unrelated warnings without changing them.

- [ ] **Step 3: Run the production build**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bun run build`

Expected: TypeScript and Vite pass; record existing environment or chunk warnings separately.

- [ ] **Step 4: Run the repository-wide baseline**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run`

Expected: no new failures. Compare failures with the stale baseline in `CONTINUITY.md` instead of changing unrelated tests.

- [ ] **Step 5: Verify scope and whitespace**

```bash
git diff --check
git status --short
git diff --stat
```

Expected: no whitespace errors; unrelated user changes remain intact.

- [ ] **Step 6: Update continuity**

Add dated `[CODE]` and `[TOOL]` entries with the visible result and exact verification outcomes. Keep all ledger sections within their caps. Do not edit `kilobot-docs/docs/releases/changelog.mdx` because production availability is unconfirmed.

- [ ] **Step 7: Commit verification documentation**

```bash
git add CONTINUITY.md
git commit -m "Document dashboard booking availability verification"
```
