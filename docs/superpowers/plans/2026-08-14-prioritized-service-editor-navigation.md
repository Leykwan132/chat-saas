# Prioritized Service Editor Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make booking assignment the first focused section of the service editor, keep bulk teammate inclusion exclusive to service creation, and remove booking-status metric tiles from service editing.

**Architecture:** The edit form owns a small active-section state and renders one of its existing field groups beside persistent responsive navigation. The reusable assignment field gets an explicit `showIncludeAll` capability so the create wizard can opt in while the editor stays focused on individual assignment controls. The service detail page stops requesting and rendering booking-status metrics entirely.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, Convex React hooks.

## Global Constraints

- Use Node.js v22 for all scripts: `source ~/.nvm/nvm.sh && nvm use 22`.
- Preserve all form values while switching editor sections; no section change may discard unsaved edits.
- Keep `Booking assignment`, `Your service`, `Timing & availability`, and `Data to collect` in that exact navigation priority order.
- Show `Include all teammates` only in the create-service wizard.
- Do not change service mutation payloads, validation, saving, deleting, service status, or booking-assignment behavior.
- Do not stage or alter unrelated mixed-worktree changes, including `pricing-knowledge-base-updated.md`.
- Do not add a release changelog entry until this customer-facing work is confirmed deployed.

---

### Task 1: Remove booking-status metrics from the service detail page

**Files:**
- Modify: `src/pages/ServicePage.tsx:1-337`
- Modify: `src/pages/ServicePage.test.tsx:1-71`

**Interfaces:**
- Consumes: `api.appointmentBooking.services.getOverview` for the existing editable service data.
- Produces: An edit page that loads without `api.appointmentBooking.services.getServiceMetrics` and renders no booking-status metric cards.

- [ ] **Step 1: Write the failing page test**

  Extend the current static page render assertion with the labels that the existing metric cards output:

  ```ts
  expect(markup).not.toContain('>CONFIRMING</span>');
  expect(markup).not.toContain('>BOOKED</span>');
  expect(markup).not.toContain('>COMPLETED</span>');
  expect(markup).not.toContain('>CANCELLED</span>');
  expect(markup).not.toContain('>NO-SHOW</span>');
  ```

- [ ] **Step 2: Run the focused test and verify it fails**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ServicePage.test.tsx
  ```

  Expected: FAIL because the edit page still renders the metric-card labels.

- [ ] **Step 3: Remove the metric query, render path, and skeleton slots**

  In `ServicePage.tsx`:

  ```ts
  const overview = useQuery(
    api.appointmentBooking.services.getOverview,
    typedAgentId && canRead ? { agentId: typedAgentId } : 'skip',
  );
  ```

  Keep the overview query above, then delete the `serviceMetrics` `useQuery`, the two status imports, the `serviceMetrics === undefined` loading requirement, the conditional metric grid, and `ServiceMetricCard`. Remove the three-card skeleton grid from `EditServiceSkeleton`, leaving the editor skeleton directly after the header skeleton.

- [ ] **Step 4: Run the focused test and verify it passes**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ServicePage.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 5: Commit the isolated page change**

  ```bash
  git add src/pages/ServicePage.tsx src/pages/ServicePage.test.tsx
  git commit -m "feat: simplify service editor overview"
  ```

### Task 2: Add focused, prioritized navigation to the edit form

**Files:**
- Modify: `src/components/ServiceForm.tsx:1-63`
- Create: `src/components/ServiceForm.test.tsx`

**Interfaces:**
- Consumes: `ServiceSectionHeading`, `ServiceAssignmentFields`, `ServiceDetailsFields`, `ServiceTimingFields`, and `ServiceDataCollectionFields` from `serviceFormShared`.
- Produces: `ServiceForm` with local `activeSection` state using the union `'assignment' | 'details' | 'timing' | 'data'`; the default is `'assignment'`.

- [ ] **Step 1: Write the failing focused form test**

  Create a static-render test that supplies `DEFAULT_SERVICE_FORM`, a no-op `setForm`, two teammates, and `canManage={true}`. Assert all four navigation labels occur in the approved order, the assignment button is selected, and only assignment controls appear initially:

  ```ts
  expect(markup.indexOf('Booking assignment')).toBeLessThan(markup.indexOf('Your service'));
  expect(markup.indexOf('Your service')).toBeLessThan(markup.indexOf('Timing &amp; availability'));
  expect(markup.indexOf('Timing &amp; availability')).toBeLessThan(markup.indexOf('Data to collect'));
  expect(markup).toContain('aria-pressed="true"');
  expect(markup).toContain('Service teammates');
  expect(markup).not.toContain('Service name');
  ```

- [ ] **Step 2: Run the focused form test and verify it fails**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ServiceForm.test.tsx
  ```

  Expected: FAIL because the current editor renders details first and has no section-navigation buttons.

- [ ] **Step 3: Implement responsive section navigation**

  Replace the stacked sections and separators in `ServiceForm.tsx` with a `useState<ServiceFormSection>('assignment')` editor. Define the sections in this exact order:

  ```ts
  const SERVICE_FORM_SECTIONS = [
    { id: 'assignment', copy: SERVICE_SECTION_COPY.assignment },
    { id: 'details', copy: SERVICE_SECTION_COPY.details },
    { id: 'timing', copy: SERVICE_SECTION_COPY.timing },
    { id: 'data', copy: SERVICE_SECTION_COPY.data },
  ] as const;
  ```

  Render a `nav` that wraps horizontally on narrow screens and becomes a sticky, left-hand column at `md` widths. Each section uses a `button` with `aria-pressed={activeSection === section.id}` and a rounded muted background only for the selected section. Render exactly one corresponding heading and field component in the right column. Pass `showIncludeAll={false}` to the assignment component.

- [ ] **Step 4: Run the focused form test and verify it passes**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ServiceForm.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 5: Commit the isolated editor-navigation change**

  ```bash
  git add src/components/ServiceForm.tsx src/components/ServiceForm.test.tsx
  git commit -m "feat: prioritize service booking assignment"
  ```

### Task 3: Restrict bulk teammate inclusion to service creation

**Files:**
- Modify: `src/components/services/serviceFormShared.tsx:671-759`
- Modify: `src/components/services/serviceFormShared.test.tsx:1-27`
- Modify: `src/components/services/CreateServiceWizard.tsx:377-381`

**Interfaces:**
- Consumes: `showIncludeAll?: boolean` from the reusable `ServiceAssignmentFields` props.
- Produces: An assignment field that shows the bulk selection action only when `showIncludeAll` is `true`; `CreateServiceWizard` supplies `showIncludeAll`.

- [ ] **Step 1: Write the failing bulk-action scope test**

  Render `ServiceAssignmentFields` twice with the same fixture: once without `showIncludeAll` and once with `showIncludeAll`. Assert the default edit-oriented render omits the button and the create-oriented render includes it:

  ```ts
  expect(editMarkup).not.toContain('Include all teammates');
  expect(createMarkup).toContain('Include all teammates');
  ```

- [ ] **Step 2: Run the focused assignment test and verify it fails**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/services/serviceFormShared.test.tsx
  ```

  Expected: FAIL because the current component shows the button in both renders.

- [ ] **Step 3: Gate the action with an explicit prop and opt in from creation**

  Add `showIncludeAll = false` to the `ServiceAssignmentFields` props and render the existing outline button only when that value is true:

  ```tsx
  {showIncludeAll ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={() => setForm((previous) => includeAllServiceTeammates(previous, teamUserOptions))}
    >
      Include all teammates
    </Button>
  ) : null}
  ```

  Add `showIncludeAll` to the create wizard's `ServiceAssignmentFields` invocation. Keep every switch, assignment method, specific-teammate selector, and validation path unchanged.

- [ ] **Step 4: Run the focused assignment test and verify it passes**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/services/serviceFormShared.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 5: Commit the isolated creation-only action change**

  ```bash
  git add src/components/services/serviceFormShared.tsx src/components/services/serviceFormShared.test.tsx src/components/services/CreateServiceWizard.tsx
  git commit -m "feat: limit bulk teammate selection to service creation"
  ```

### Task 4: Verify the integrated editor behavior

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: Completed Tasks 1-3.
- Produces: Evidence that the service editor compiles, the focused behavior is covered, and the mixed worktree has no whitespace errors.

- [ ] **Step 1: Run the focused feature suite**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ServicePage.test.tsx src/components/ServiceForm.test.tsx src/components/services/serviceFormShared.test.tsx
  ```

  Expected: PASS for all focused service-editor tests.

- [ ] **Step 2: Run static validation**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit && git diff --check
  ```

  Expected: TypeScript exits 0 and `git diff --check` emits no output.

- [ ] **Step 3: Update the continuity ledger with verified outcomes**

  Record the user-visible editor behavior, the create-only bulk action, the no-metrics page behavior, and the exact verification results. Keep the ledger within its existing size limits and do not add a release changelog entry because deployment is unconfirmed.

- [ ] **Step 4: Commit the verification receipt**

  ```bash
  git add CONTINUITY.md
  git commit -m "docs: record service editor verification"
  ```

## Self-Review

- Spec coverage: Task 1 removes every booking-status metric tile and its network request. Task 2 implements the left-side responsive section navigation with booking assignment first and one focused section at a time. Task 3 makes bulk teammate inclusion create-only. Task 4 verifies the integrated behavior and records the result.
- Placeholder scan: no placeholders or deferred implementation steps remain.
- Type consistency: `ServiceFormSection` is local to `ServiceForm`; `showIncludeAll?: boolean` is the only new cross-component prop and is consumed by both the form and create wizard.
