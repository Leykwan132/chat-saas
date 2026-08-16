# Service Video Call Location Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Video call as a manual service location while keeping Google Meet a separately feature-gated, automatic integration.

**Architecture:** Preserve stored `remote` as the existing Google Meet mode so no historical service migration is needed. Add `video_call` through the frontend form type and Convex validators; all automatic Meet creation and Google health checks continue to match only `remote`.

**Tech Stack:** React, TypeScript, Tailwind, Convex, Vitest, convex-test.

## Global Constraints

- Existing `remote` services remain Google Meet services.
- `video_call` never creates or stores a meeting link.
- Google Meet remains hidden unless the Google Calendar feature flag is enabled and disabled until the user connects Google Calendar.
- Keep code files below 300 lines and add no code comments.
- Run Node commands with `source ~/.nvm/nvm.sh && nvm use 22`.

---

### Task 1: Add the Video call form state and service validator

**Files:**
- Modify: `src/lib/serviceForm.ts:9-186`
- Modify: `src/lib/serviceForm.test.ts:54-83`
- Modify: `convex/schema.ts:1499`
- Modify: `convex/appointmentBooking/services.ts:129`
- Test: `convex/appointmentBookingAvailability.test.ts:37-67`

**Interfaces:**
- Produces `ServiceLocationMode = 'remote' | 'video_call' | 'in_person'`.
- Persists `locationMode: 'video_call'` through `api.appointmentBooking.services.updateService`.
- Keeps `locationMode: 'remote'` as the sole Google Calendar health-gated mode.

- [ ] **Step 1: Write failing form and availability tests**

```ts
expect(serviceToForm({ ...service, locationMode: 'video_call', location: 'old-link' }, ['owner-id']))
  .toMatchObject({ locationMode: 'video_call', location: '' });
expect(buildServiceMutationArgs({ ...DEFAULT_SERVICE_FORM, locationMode: 'video_call' }).locationMode)
  .toBe('video_call');
expect(videoCallReasons).not.toContain('google_calendar_unhealthy');
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/serviceForm.test.ts convex/appointmentBookingAvailability.test.ts`

Expected: the form test rejects `video_call` and the Convex test cannot supply it as a valid service location.

- [ ] **Step 3: Implement the new mode in form and backend validators**

```ts
export type ServiceLocationMode = 'remote' | 'video_call' | 'in_person';

locationMode: v.optional(v.union(
  v.literal('remote'),
  v.literal('video_call'),
  v.literal('in_person'),
)),
```

Use `service.locationMode === 'in_person' ? service.location ?? '' : ''` when mapping storage to the form. Do not alter the existing `locationMode === 'remote'` conference and Google-health conditions.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/serviceForm.test.ts convex/appointmentBookingAvailability.test.ts`

Expected: PASS; Video call saves as `video_call` and does not include `google_calendar_unhealthy`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/serviceForm.ts src/lib/serviceForm.test.ts convex/schema.ts convex/appointmentBooking/services.ts convex/appointmentBookingAvailability.test.ts
git commit -m "Add manual video call service location"
```

### Task 2: Expose Video call in the service location control

**Files:**
- Modify: `src/components/services/ServiceLocationField.tsx:1-102`
- Modify: `src/components/services/serviceFormShared.test.tsx:50-68`

**Interfaces:**
- `ServiceLocationField` selects `video_call` without Google Calendar access.
- The selected label is `Video call` with a video icon.
- A selected Video call displays `Create and share a meeting link with your customer.`

- [ ] **Step 1: Write the failing UI test**

```tsx
expect(markup).toContain('Video call');
expect(source).toContain("chooseLocation('video_call')");
expect(source).toContain('Create and share a meeting link with your customer.');
```

- [ ] **Step 2: Run the UI test and verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/services/serviceFormShared.test.tsx`

Expected: FAIL because the source has no Video call option.

- [ ] **Step 3: Implement the standalone option and help text**

```tsx
<DropdownMenuItem onSelect={() => chooseLocation('video_call')}>
  <Video />
  Video call
</DropdownMenuItem>

{form.locationMode === 'video_call' ? (
  <p className="text-sm text-muted-foreground">
    Create and share a meeting link with your customer.
  </p>
) : null}
```

Use `GoogleMeetIcon` only for `remote`, `Video` only for `video_call`, and `MapPin` for `in_person`. Keep the existing Google Meet feature-flag and connection hover card unchanged.

- [ ] **Step 4: Run the UI test and verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/services/serviceFormShared.test.tsx`

Expected: PASS; Video call is always present and Google Meet remains feature-gated.

- [ ] **Step 5: Commit**

```bash
git add src/components/services/ServiceLocationField.tsx src/components/services/serviceFormShared.test.tsx
git commit -m "Show video call service location"
```

### Task 3: Verify, deploy, and document the completed behavior

**Files:**
- Modify: `CONTINUITY.md`
- Generated: `convex/_generated/api.d.ts` if Convex code generation changes it

**Interfaces:**
- Google Meet remains the only automatic conference provider.
- Video call remains available without the Google Calendar rollout flag or connection.

- [ ] **Step 1: Run the feature verification suite**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/serviceForm.test.ts src/components/services/serviceFormShared.test.tsx convex/appointmentBookingAvailability.test.ts convex/appointmentBooking/fields.test.ts && bunx tsc --noEmit -p convex/tsconfig.json && bunx tsc --noEmit && git diff --check`

Expected: all focused tests and TypeScript checks pass with no whitespace errors.

- [ ] **Step 2: Deploy to the connected development environment**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx convex dev --once`

Expected: Convex functions deploy successfully.

- [ ] **Step 3: Update continuity**

Record that Video call is manual, Google Meet remains feature-gated and automatic, and no migration was needed because `remote` preserves Google Meet semantics.

- [ ] **Step 4: Commit and push**

```bash
git add CONTINUITY.md convex/_generated/api.d.ts
git commit -m "Verify video call service location"
git push origin cursor/google-calendar-booking-sync-10b0
```

## Self-Review

- Spec coverage: Task 1 persists `video_call` and protects Google-only health behavior; Task 2 exposes all three choices and required copy; Task 3 verifies deployment and records the decision.
- Placeholder scan: no placeholder instructions or unresolved decisions remain.
- Type consistency: the frontend and Convex validator use `video_call`; existing `remote` is retained as Google Meet throughout.
