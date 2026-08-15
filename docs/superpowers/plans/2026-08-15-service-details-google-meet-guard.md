# Service Details and Google Meet Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate basic service setup into one Service details page and allow Google Meet only after the current user connects Google Calendar.

**Architecture:** The edit form reduces its navigation to Service details, Booking team, and Booking form. A client-only Location field owns the two-option dropdown, Google Calendar status, early-access flag, unavailable Google Meet guidance, and connection action. Existing `remote` and `in_person` values, service persistence, and booking behavior remain unchanged.

**Tech Stack:** React, TypeScript, Radix dropdown/hover-card primitives, lucide-react, Convex React hooks, PostHog, Vitest.

## Global Constraints

- Use Node v22 for every verification command.
- Service details contains name, description, duration, and Location; Booking team and Booking form remain separate.
- Location offers only Google Meet (`remote`) and In person (`in_person`); In person reveals Address (optional).
- A disconnected eligible user cannot select Google Meet. Its unavailable dropdown entry supports hover and keyboard focus, explains the Calendar requirement, and offers the existing connection action.
- A user outside `enable_google_calendar_connect` sees Google Meet as unavailable without a connection action.
- Do not change backend service values, Google Meet booking creation, or the existing PostHog rollout.
- Keep code files below 300 lines, add no code comments, and do not add a release changelog entry until production availability is confirmed.

---

### Task 1: Build the guarded Location dropdown

**Files:**

- Create: `src/components/services/ServiceLocationField.tsx`
- Create: `src/components/services/ServiceLocationField.test.tsx`
- Modify: `src/components/services/serviceFormShared.tsx:1-445`
- Modify: `src/components/services/serviceFormShared.test.tsx`

**Interfaces:**

- Produces: `ServiceLocationField`, accepting `form`, `setForm`, and `disabled` with the same types used by `ServiceDetailsFields`.
- Consumes: `useGoogleCalendarConnection()`, `useEnableGoogleCalendarConnect()`, `DropdownMenu`, `HoverCard`, and `Button`.
- Preserves: `ServiceForm.locationMode` values `remote` and `in_person`; selecting In person retains the existing address input behavior.

- [ ] **Step 1: Write failing guarded-location UI tests**

Create tests that mock an eligible disconnected Calendar status and assert the rendered Location field contains Google Meet, In person, `aria-disabled`, the exact copy `Google Meet requires you to connect your Google Calendar.`, and `Connect Google Calendar`. Mock an eligible connected status and assert Google Meet does not render as unavailable. Add assertions that In person displays `Address (optional)`.

```tsx
vi.mock('@/components/calendar/useGoogleCalendarConnection', () => ({
  useGoogleCalendarConnection: () => ({
    status: { state: 'not_connected' },
    connectGoogleCalendar: vi.fn(),
  }),
}));
vi.mock('@/lib/posthogFeatureFlags', () => ({
  useEnableGoogleCalendarConnect: () => true,
}));

expect(markup).toContain('Google Meet requires you to connect your Google Calendar.');
expect(markup).toContain('aria-disabled="true"');
expect(markup).toContain('Address (optional)');
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/services/ServiceLocationField.test.tsx src/components/services/serviceFormShared.test.tsx`

Expected: FAIL because the Location control is still a remote/in-person radio group and has no Google Calendar connection guard.

- [ ] **Step 3: Write the guarded field implementation**

Add `ServiceLocationField` using a `DropdownMenu` trigger labelled Location. Map UI selections to existing form values:

```tsx
function chooseLocation(mode: ServiceForm['locationMode']) {
  setForm((previous) => ({
    ...previous,
    locationMode: mode,
    location: mode === 'remote' ? '' : previous.location,
  }));
}
```

Render In person as a selectable menu item. Render Google Meet as selectable only when `isProductFeatureEnabled(useEnableGoogleCalendarConnect())` and `status?.state === 'connected'`. Otherwise render a focusable `aria-disabled="true"` hover-card trigger inside the menu. Its card shows the exact connection-required copy. For an eligible user, its button calls `connectGoogleCalendar`; for an ineligible user, omit the button and use `Google Meet is not available yet.`

Move the existing location controls out of `ServiceDetailsFields` and render `<ServiceLocationField form={form} setForm={setForm} disabled={disabled} />` in their place. Keep the Address input conditional on `form.locationMode === 'in_person'`, but change its visible label to `Address (optional)`.

- [ ] **Step 4: Run the guarded-location tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/services/ServiceLocationField.test.tsx src/components/services/serviceFormShared.test.tsx`

Expected: PASS with Google Meet connection guidance, connected selection, In person selection, and optional-address coverage.

- [ ] **Step 5: Commit the guarded dropdown**

```bash
git add src/components/services/ServiceLocationField.tsx src/components/services/ServiceLocationField.test.tsx src/components/services/serviceFormShared.tsx src/components/services/serviceFormShared.test.tsx
git commit -m "Guard Google Meet service locations"
```

### Task 2: Consolidate the edit form and center service-card activation controls

**Files:**

- Modify: `src/components/ServiceForm.tsx:1-89`
- Create: `src/components/ServiceForm.test.tsx`
- Modify: `src/pages/ServicesPage.tsx:208-262`
- Modify: `src/pages/ServicesPage.test.tsx`

**Interfaces:**

- Consumes: `ServiceDetailsFields` and `ServiceTimingFields` from the shared service form module.
- Produces: exactly three edit navigation sections: `details`, `assignment`, and `data`.
- Preserves: `ServiceForm` props, unsaved-state handling in `ServicePage`, and service-card toggle behavior.

- [ ] **Step 1: Write failing layout and alignment tests**

Create a ServiceForm source/markup test that requires Service details, Booking team, and Booking form, and verifies `ServiceDetailsFields` and `ServiceTimingFields` render together when `activeSection === 'details'`. Update the Services page markup test to require `items-center` on the wrapper containing the Active/Inactive label and Switch.

```tsx
expect(source).toContain("{ id: 'details'");
expect(source).not.toContain("{ id: 'timing'");
expect(source).toContain('<ServiceDetailsFields');
expect(source).toContain('<ServiceTimingFields');
expect(markup).toContain('flex shrink-0 items-center gap-1.5');
```

- [ ] **Step 2: Run the layout tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ServiceForm.test.tsx src/pages/ServicesPage.test.tsx`

Expected: FAIL because Details and Appointment duration are separate edit sections and the service-card controls use `items-start`.

- [ ] **Step 3: Implement the compact edit layout and alignment**

Update `SERVICE_FORM_SECTIONS` to omit the timing section. In the details branch, render both fields in one vertical stack:

```tsx
{activeSection === 'details' ? (
  <div className="flex flex-col gap-8">
    <ServiceDetailsFields form={form} setForm={setForm} disabled={disabled} />
    <ServiceTimingFields form={form} setForm={setForm} disabled={disabled} />
  </div>
) : null}
```

Keep Assignment and Data branches unchanged. In `ServiceCard`, change the activation wrapper from `items-start` to `items-center`; do not alter click prevention or the toggle's scale/color classes.

- [ ] **Step 4: Run the compact-layout tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ServiceForm.test.tsx src/pages/ServicesPage.test.tsx`

Expected: PASS with the three-section editor and vertically centered service-card status control.

- [ ] **Step 5: Commit the compact layout**

```bash
git add src/components/ServiceForm.tsx src/components/ServiceForm.test.tsx src/pages/ServicesPage.tsx src/pages/ServicesPage.test.tsx
git commit -m "Simplify service details layout"
```

### Task 3: Run focused regression verification

**Files:**

- Modify: `CONTINUITY.md`

**Interfaces:**

- Consumes: the location guard and edit layout from Tasks 1–2.
- Produces: a verified, documented UI-only change on the Google Calendar feature branch.

- [ ] **Step 1: Run all affected frontend checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run \
  src/components/services/ServiceLocationField.test.tsx \
  src/components/services/serviceFormShared.test.tsx \
  src/components/ServiceForm.test.tsx \
  src/pages/ServicesPage.test.tsx \
  src/lib/serviceForm.test.ts && \
  bunx tsc --noEmit && \
  git diff --check
```

Expected: PASS with all selected test files passing, TypeScript exiting zero, and no whitespace errors.

- [ ] **Step 2: Record unreleased customer-facing state**

Update `CONTINUITY.md` with the approved UI behavior and focused verification result. Do not add a changelog entry because the Google Calendar feature remains gated and production availability is unconfirmed.

- [ ] **Step 3: Commit verification record**

```bash
git add CONTINUITY.md
git commit -m "Record service location UI verification"
```
