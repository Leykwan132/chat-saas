# Create Service Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the full-screen service wizard with a workspace-plan-aware two-step dialog that creates personal services in one action and team services after teammate selection.

**Architecture:** ServicesPage owns dialog visibility and uses `?create=1` for route-based entry. Focused dialog components render info, assignment cards, and teammate selection; a pure model defines modes and plan entitlement. Details and timing are extracted from the oversized shared form module for reuse by both the dialog and service detail editor.

**Tech Stack:** React, React Router, Convex React, shadcn Dialog and Accordion, lucide-react, Vitest, TypeScript, Tailwind CSS.

## Global Constraints

- Every script uses `source ~/.nvm/nvm.sh && nvm use 22`.
- Every code file is at most 300 lines; split modules by responsibility.
- Use no code comments unless an unavoidable workaround requires one.
- Team eligibility uses only the active workspace plan returned by `api.plans.getPlanAndUsage`.
- Preserve the Google Meet connection guard and use the approved hosted Meet image.
- Save the four default booking fields without exposing a booking-form setup step.
- Do not update the release changelog because this is unshipped work.

---

### Task 1: Model personal defaults and workspace-plan eligibility

**Files:**
- Create: `src/components/services/createServiceDialogModel.ts`
- Test: `src/components/services/createServiceDialogModel.test.ts`

**Interfaces:** Exports `CreateServiceAssignmentMode = 'self' | 'team'`, `getCreateServiceAssignmentDefaults(currentWorkosUserId)`, `canCreateTeamService(plan)`, and `getCreateServicePrimaryAction(mode)`.

- [x] **Step 1: Write the failing test**

```ts
expect(getCreateServiceAssignmentDefaults('user-ley')).toEqual({
  assignedWorkosUserIds: ['user-ley'],
  assignmentStrategy: 'balanced',
  specificWorkosUserId: '',
});
expect(canCreateTeamService('free')).toBe(false);
expect(canCreateTeamService('starter')).toBe(true);
expect(getCreateServicePrimaryAction('self')).toBe('Create');
expect(getCreateServicePrimaryAction('team')).toBe('Continue');
```

- [x] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/services/createServiceDialogModel.test.ts`

Expected: FAIL because the model module is absent.

- [x] **Step 3: Implement the pure model**

```ts
export function canCreateTeamService(plan: PlanKey | undefined) {
  return plan !== 'free' && plan !== undefined;
}

export function getCreateServiceAssignmentDefaults(currentWorkosUserId: string) {
  return {
    assignedWorkosUserIds: [currentWorkosUserId],
    assignmentStrategy: 'balanced' as const,
    specificWorkosUserId: '',
  };
}
```

An unavailable workspace plan must not be treated as paid.

- [x] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/services/createServiceDialogModel.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/services/createServiceDialogModel.ts src/components/services/createServiceDialogModel.test.ts && git commit -m "Add service creation entitlement model"
```

### Task 2: Extract detail fields and group Advanced timing

**Files:**
- Create: `src/components/services/ServiceDetailsFields.tsx`
- Create: `src/components/services/ServiceTimingFields.tsx`
- Create: `src/components/services/serviceFormControls.tsx`
- Create: `src/components/services/ServiceAssignmentFields.tsx`
- Create: `src/components/services/ServiceDataCollectionFields.tsx`
- Modify: `src/components/services/serviceFormShared.tsx`
- Modify: `src/components/ServiceForm.tsx`
- Test: `src/components/services/serviceFormShared.test.tsx`
- Create: `src/components/services/ServiceTimingFields.test.tsx`

**Interfaces:** `ServiceDetailsFields({ form, setForm, disabled })` renders Name, Description, Location, then conditional Address. `ServiceTimingFields({ form, setForm, disabled })` renders Duration and a collapsed Advanced accordion holding Gap and Preferred times. `ServiceAssignmentFields({ form, setForm, teamUserOptions, disabled, showIncludeAll })` stays the teammate-selection interface. `ServiceDataCollectionFields({ form, setForm, disabled })` keeps booking-form editing. `WizardNumberField` accepts `inputSuffix?: string`.

- [x] **Step 1: Write the failing tests**

```ts
expect(detailsMarkup.indexOf('>Name<')).toBeLessThan(detailsMarkup.indexOf('>Description<'));
expect(detailsMarkup.indexOf('>Description<')).toBeLessThan(detailsMarkup.indexOf('>Location<'));
expect(timingMarkup).toContain('>Minutes<');
expect(timingMarkup).toContain('>Advanced<');
expect(timingMarkup).toContain('>Gap<');
expect(timingMarkup).toContain('Preferred times');
```

- [x] **Step 2: Run tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/services/serviceFormShared.test.tsx src/components/services/ServiceTimingFields.test.tsx`

Expected: FAIL because Description follows Location and advanced timing is exposed.

- [x] **Step 3: Implement the extraction**

Move `WizardNumberField`, `WizardRadioOptionGroup`, `WizardSelectField`, `SelectFieldOptionsEditor`, `WizardSelectOption`, and option constants to `serviceFormControls.tsx`. Move the existing teammate switch list and assignment-method controls to `ServiceAssignmentFields.tsx`. Move the existing add-field dialog, suggestions, and field editor to `ServiceDataCollectionFields.tsx`. Put Name/Description/Location in `ServiceDetailsFields.tsx` and timing in `ServiceTimingFields.tsx`. Use `inputSuffix="Minutes"` for Duration and the existing Accordion primitives for a closed Advanced panel with Gap and `PreferredTimesEditor`. Convert `serviceFormShared.tsx` into re-exports only, then update `ServiceForm.tsx` and tests to import the focused components directly. This preserves the edit Booking team and Booking form sections while making every code file at most 300 lines.

- [x] **Step 4: Run tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/services/serviceFormShared.test.tsx src/components/services/ServiceTimingFields.test.tsx src/components/ServiceForm.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/services src/components/ServiceForm.tsx && git commit -m "Group advanced service timing settings"
```

### Task 3: Build assignment cards and upgrade overlay

**Files:**
- Create: `src/components/services/CreateServiceAssignmentCards.tsx`
- Test: `src/components/services/CreateServiceAssignmentCards.test.tsx`

**Interfaces:** Consumes `mode`, `teamEnabled`, `onModeChange`, and `onUpgrade`; produces accessible `For myself` and `For team` radio cards.

- [x] **Step 1: Write the failing test**

```tsx
render(<CreateServiceAssignmentCards mode="self" teamEnabled={false} onModeChange={onModeChange} onUpgrade={onUpgrade} />);
expect(screen.getByRole('radio', { name: /for myself/i })).toBeChecked();
await user.click(screen.getByRole('radio', { name: /for team/i }));
expect(onUpgrade).toHaveBeenCalledOnce();
expect(onModeChange).not.toHaveBeenCalled();
```

Assert that the locked Team card contains a centered Upgrade control and the darker hover/focus overlay.

- [x] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/services/CreateServiceAssignmentCards.test.tsx`

Expected: FAIL because the component is absent.

- [x] **Step 3: Implement the cards**

Use `RadioGroup`. Each card contains a foreground `UserRound` or `UsersRound` icon tile with two offset bordered tiles behind it. A locked Team card stays focusable; its `group-hover` and `group-focus-within` overlay darkens slightly and reveals centered Upgrade. Card and overlay both call `onUpgrade` without changing selection. An eligible workspace selects team normally.

- [x] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/services/CreateServiceAssignmentCards.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/services/CreateServiceAssignmentCards.tsx src/components/services/CreateServiceAssignmentCards.test.tsx && git commit -m "Add plan-aware service assignment cards"
```

### Task 4: Create dialog steps and mutation orchestration

**Files:**
- Create: `src/components/services/CreateServiceInfoStep.tsx`
- Create: `src/components/services/CreateServiceTeamStep.tsx`
- Create: `src/components/services/CreateServiceDialog.tsx`
- Test: `src/components/services/CreateServiceDialog.test.tsx`

**Interfaces:** `CreateServiceDialog({ agentId, teamUserOptions, currentWorkosUserId, workspacePlan, open, onOpenChange })` consumes `createService`, `updateService`, `useUpgradeModal`, and Tasks 1–3.

- [x] **Step 1: Write the failing tests**

```tsx
renderDialog({ currentWorkosUserId: 'user-ley', workspacePlan: 'starter' });
await user.type(screen.getByLabelText('Name'), 'Consultation');
await user.click(screen.getByRole('button', { name: 'Create' }));
expect(createService).toHaveBeenCalledWith({ agentId: 'agent-1', name: 'Consultation' });
expect(updateService).toHaveBeenCalledWith(expect.objectContaining({
  assignedWorkosUserIds: ['user-ley'],
  fields: expect.arrayContaining([
    expect.objectContaining({ label: 'Booking Date' }),
    expect.objectContaining({ label: 'Booking Time' }),
    expect.objectContaining({ label: 'Customer Name' }),
    expect.objectContaining({ label: 'Phone Number' }),
  ]),
}));
```

Add tests for Close discarding a reopened draft, Team showing Continue, no teammate blocking Create, surfaced mutation error, and navigation to `/dashboard/agent-1/services/service-1`.

- [x] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/services/CreateServiceDialog.test.tsx`

Expected: FAIL because the dialog is absent.

- [x] **Step 3: Implement the dialog**

Reset to `DEFAULT_SERVICE_FORM` plus personal defaults on each closed-to-open transition. Step 1 renders details, Duration, and cards, requiring a trimmed Name. Self-mode Create calls `createService`, then `updateService`, then closes and navigates to its detail page. Team-mode Continue opens teammate selection; its Create calls `validateServiceAssignment` then the same mutations. Close is text-only and immediately discards. Do not retain progress or success screens.

- [x] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/services/CreateServiceDialog.test.tsx src/components/services/CreateServiceAssignmentCards.test.tsx src/components/services/createServiceDialogModel.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/services/CreateServiceInfoStep.tsx src/components/services/CreateServiceTeamStep.tsx src/components/services/CreateServiceDialog.tsx src/components/services/CreateServiceDialog.test.tsx && git commit -m "Add two-step service creation dialog"
```

### Task 5: Integrate entry points, routes, and Meet branding

**Files:**
- Modify: `src/pages/ServicesPage.tsx`, `src/pages/ServicePage.tsx`, `src/main.tsx`, `src/components/booking/CreateBookingDialog.tsx`
- Modify: `src/components/services/ServiceLocationField.tsx`, `src/components/calendar/googleCalendarBranding.ts`
- Delete: `src/components/services/CreateServiceWizard.tsx`
- Modify tests: `src/pages/ServicesPage.test.tsx`, `src/pages/ServicePage.test.tsx`, `src/components/services/serviceFormShared.test.tsx`

**Interfaces:** ServicesPage passes `currentUser.workosUserId` and `planAndUsage?.plan` to the dialog. `/services/new` redirects to `/services?create=1`. The query opens the dialog and is cleared when it closes. `GOOGLE_MEET_ICON_SRC` is exported next to Calendar branding.

- [ ] **Step 1: Write the failing tests**

```ts
expect(servicesSource).toContain('CreateServiceDialog');
expect(serviceRouteMarkup).toContain('/dashboard/agent-1/services?create=1');
expect(locationSource).toContain('GOOGLE_MEET_ICON_SRC');
expect(locationSource).not.toContain('<Video');
```

Also assert the query opens the dialog and props use workspace-plan/current-user query data rather than auth-user data.

- [ ] **Step 2: Run tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/pages/ServicesPage.test.tsx src/pages/ServicePage.test.tsx src/components/services/serviceFormShared.test.tsx`

Expected: FAIL because entry points still use the full-screen wizard and Meet uses `Video`.

- [ ] **Step 3: Implement integration**

Host one dialog in ServicesPage. Header, empty card, and booking-dialog external link use `?create=1`. Use `useSearchParams` to open and clear it on discard or success. Redirect the `/services/new` branch to that query URL while leaving normal service editing unchanged. Render the hosted Meet image at 16px in selected and menu states. Delete the retired wizard and unused imports.

- [ ] **Step 4: Run tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/pages/ServicesPage.test.tsx src/pages/ServicePage.test.tsx src/components/services/serviceFormShared.test.tsx src/components/services/CreateServiceDialog.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src/pages src/components/services src/components/calendar/googleCalendarBranding.ts src/components/booking/CreateBookingDialog.tsx src/main.tsx && git commit -m "Open service creation in a dialog"
```

### Task 6: Verify and document results

**Files:**
- Modify: `CONTINUITY.md`

- [ ] **Step 1: Run focused verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/services/createServiceDialogModel.test.ts src/components/services/CreateServiceAssignmentCards.test.tsx src/components/services/CreateServiceDialog.test.tsx src/components/services/ServiceTimingFields.test.tsx src/components/services/serviceFormShared.test.tsx src/components/ServiceForm.test.tsx src/pages/ServicesPage.test.tsx src/pages/ServicePage.test.tsx && bunx tsc --noEmit && git diff --check`

Expected: focused tests pass, TypeScript has no errors, and diff check is clean.

- [ ] **Step 2: Run the full suite**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bun run test`

Expected: document known Google Calendar failures separately; never claim the full suite passes unless it does.

- [ ] **Step 3: Record verification and commit**

Update `CONTINUITY.md` with commits, focused verification, and full-suite blockers. Do not edit the changelog. Then run:

```bash
git add CONTINUITY.md && git commit -m "Record service dialog verification"
```
