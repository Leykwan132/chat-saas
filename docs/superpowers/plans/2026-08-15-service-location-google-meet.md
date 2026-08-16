# Service Location and Google Meet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store an explicit Remote/In person service setting, apply physical locations to in-person bookings, and create one Google Meet link for each Google-backed remote booking.

**Architecture:** Appointment services own their location mode and optional address. The two booking preparation paths copy an in-person address to their newly created calendar event and request a conference only on remote Google create writes. The existing Google writer carries a deterministic conference request ID, asks the Calendar API for conference data, and relies on the current event mapper/finalizer to persist the returned Meet URL in the local event link.

**Tech Stack:** Convex schema/mutations/actions, React, TypeScript, Google Calendar API, Vitest.

## Global Constraints

- Use Node v22 for every verification command.
- Service location mode is exactly `remote` or `in_person`; existing unset services behave as in person.
- An in-person service has an optional physical address. A remote service clears and does not retain an address.
- Remote Google Meet creation is optional: it runs only when the assigned staff member has an active Google Calendar connection.
- Connected remote bookings remain fail-closed; a Google event or conference failure removes the pending local booking.
- Request conference data only for an initial remote booking create. Updates and standalone calendar events never request a new conference.
- Reuse the existing idempotent Google operation key for the Meet conference request ID.
- Keep code files below 300 lines, add no code comments, and do not add a release changelog entry until production availability is confirmed.

---

### Task 1: Add service location persistence and service-form controls

**Files:**

- Modify: `convex/schema.ts:1495-1518`
- Modify: `convex/appointmentBooking/services.ts:94-181`
- Modify: `src/lib/serviceForm.ts:9-162`
- Modify: `src/components/services/serviceFormShared.tsx:374-412`
- Test: `src/components/services/serviceFormShared.test.tsx`
- Test: `src/lib/serviceForm.test.ts`
- Create: `convex/appointmentBookingServices.test.ts`

**Interfaces:**

- Produces: optional service fields `locationMode?: "remote" | "in_person"` and `location?: string`.
- Produces: form fields `locationMode: "remote" | "in_person"` and `location: string`.
- Produces: `buildServiceMutationArgs(form)` fields matching `updateService`.
- Consumes: the existing service details section in both the edit form and creation wizard.

- [ ] **Step 1: Write failing form and persistence tests**

Add form-model assertions:

```ts
expect(DEFAULT_SERVICE_FORM).toMatchObject({
  locationMode: "in_person",
  location: "",
});

expect(serviceToForm({
  ...service,
  locationMode: "remote",
  location: "Old office",
}, teamUserIds)).toMatchObject({
  locationMode: "remote",
  location: "",
});

expect(buildServiceMutationArgs({
  ...DEFAULT_SERVICE_FORM,
  locationMode: "in_person",
  location: "Level 8, KL",
})).toMatchObject({
  locationMode: "in_person",
  location: "Level 8, KL",
});
```

In the rendered service-details source test, require `Meeting location`, both `Remote` and `In person` radio values, and an `Address` input that is rendered only for `locationMode === "in_person"`.

Add a Convex service mutation test: updating to `remote` clears an existing address; updating to `in_person` with whitespace trims it and stores `undefined` for an empty address.

- [ ] **Step 2: Verify the tests are red**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/serviceForm.test.ts src/components/services/serviceFormShared.test.tsx convex/appointmentBookingServices.test.ts`

Expected: FAIL because services and service forms have no location mode or address.

- [ ] **Step 3: Add schema and service mutation support**

Add the optional schema fields:

```ts
locationMode: v.optional(v.union(v.literal("remote"), v.literal("in_person"))),
location: v.optional(v.string()),
```

In `updateService`, accept the same optional validators. Compute the effective mode with:

```ts
const locationMode = args.locationMode ?? service.locationMode ?? "in_person";
```

Persist `locationMode` only when supplied. When the effective mode is remote, patch `location: undefined`; otherwise, if the address was supplied, store `args.location.trim() || undefined`. Existing records remain valid because both fields are optional.

- [ ] **Step 4: Add form mapping and UI**

In `src/lib/serviceForm.ts`, add a `ServiceLocationMode` union and the two fields to `ServiceForm`, `ServiceRow`, `DEFAULT_SERVICE_FORM`, `serviceToForm`, and `buildServiceMutationArgs`. For a remote stored service, map its location to an empty form value.

In `ServiceDetailsFields`, insert a `RadioGroup` labeled `Meeting location` before the description. It has Remote and In person options. Choosing Remote updates both fields:

```ts
setForm((prev) => ({ ...prev, locationMode: "remote", location: "" }));
```

Choosing In person updates only `locationMode`. Render the labeled Address `Input` only when `form.locationMode === "in_person"`.

- [ ] **Step 5: Run focused service verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/serviceForm.test.ts src/components/services/serviceFormShared.test.tsx convex/appointmentBookingServices.test.ts`

Expected: PASS for defaults, remote address clearing, in-person address persistence, and conditional service-form UI.

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts convex/appointmentBooking/services.ts src/lib/serviceForm.ts src/components/services/serviceFormShared.tsx src/lib/serviceForm.test.ts src/components/services/serviceFormShared.test.tsx convex/appointmentBookingServices.test.ts
git commit -m "Add service meeting locations"
```

### Task 2: Apply service locations and Meet intent to new bookings

**Files:**

- Modify: `convex/appointmentBooking/fields.ts:1-230`
- Modify: `convex/appointmentBooking/manualBookingCore.ts:20-93`
- Modify: `convex/googleCalendar/bookingPrepare.ts:104-200`
- Modify: `convex/googleCalendar/staffBookingPrepare.ts:82-145`
- Test: `convex/googleCalendarBookingSync.test.ts`
- Test: `convex/calendarManualBooking.test.ts`

**Interfaces:**

- Produces: `serviceBookingLocation(service): string | undefined`.
- Produces: `googleCalendarWriteInputFromEvent(event, options?)` use from Task 3, receiving a conference request only for remote create flows.
- Consumes: the complete service document in AI and staff preparation before calling the Google create writer.

- [ ] **Step 1: Write failing booking assertions**

Add a staff manual-booking test with `locationMode: "in_person"` and `location: "Level 8, KL"`; assert the created event contains that location.

Add a connected remote AI booking test using a service with `locationMode: "remote"`. Have its fake provider assert the request carries a conference request ID and return `hangoutLink: "https://meet.google.com/abc-defg-hij"`. Assert the finalized event has an empty physical location and its `link` equals the Meet URL.

Add a never-connected remote booking test. Assert it succeeds, has no event link, and never invokes the Google provider.

- [ ] **Step 2: Verify booking tests are red**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarBookingSync.test.ts convex/calendarManualBooking.test.ts`

Expected: FAIL because booking events do not derive service locations and Google input has no conference intent.

- [ ] **Step 3: Centralize service-to-event location**

Add this helper in `appointmentBooking/fields.ts`:

```ts
export function serviceBookingLocation(
  service: Pick<Doc<"appointmentServices">, "locationMode" | "location">,
) {
  return service.locationMode === "in_person"
    ? service.location?.trim() || undefined
    : undefined;
}
```

Use it when inserting the event in `createManualBookingRecords` and in the AI booking event insert in `bookingPrepare.ts`. Do not modify existing booking-update code; only new booking records receive this behavior.

- [ ] **Step 4: Pass remote conference intent only into create payloads**

Extend `googleCalendarWriteInputFromEvent` in Task 3 to accept `{ conferenceRequestId?: string }`. In both initial booking prepare paths, call it with the operation key only for remote services:

```ts
event: googleCalendarWriteInputFromEvent(event, {
  conferenceRequestId: service.locationMode === "remote" ? operationKey : undefined,
}),
```

Keep all update, delete, imported-event, and standalone manual-event calls unchanged so they have no conference request.

- [ ] **Step 5: Run focused booking verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarBookingSync.test.ts convex/calendarManualBooking.test.ts`

Expected: PASS for physical locations, connected remote Meet creation intent, and no-connection remote bookings.

- [ ] **Step 6: Commit**

```bash
git add convex/appointmentBooking/fields.ts convex/appointmentBooking/manualBookingCore.ts convex/googleCalendar/bookingPrepare.ts convex/googleCalendar/staffBookingPrepare.ts convex/googleCalendarBookingSync.test.ts convex/calendarManualBooking.test.ts
git commit -m "Apply service locations to bookings"
```

### Task 3: Request and persist Google Meet conference data

**Files:**

- Modify: `convex/googleCalendar/writeTypes.ts:8-35`
- Modify: `convex/googleCalendar/writeFingerprint.ts:35-70`
- Modify: `convex/googleCalendar/bookingPayload.ts:4-35`
- Modify: `convex/googleCalendar/writeProvider.ts:8-67`
- Modify: `convex/googleCalendar/eventMapping.ts:4-73,180-230`
- Modify: `convex/googleCalendar/writeCreateExecution.ts:22-230`
- Test: `convex/googleCalendarProvider.test.ts`
- Test: `convex/googleCalendar/writePayloadMatch.test.ts`
- Test: `convex/googleCalendarWrites.test.ts`

**Interfaces:**

- Produces: optional `conferenceRequestId?: string` on `GoogleCalendarWriteInput`.
- Produces: a create request to `calendars/primary/events?conferenceDataVersion=1` containing `conferenceData.createRequest` for conference-enabled inputs.
- Produces: the returned Meet URL in `MappedGoogleCalendarEvent.link`, which the existing writer finalizer stores in `calendarEvents.link`.

- [ ] **Step 1: Write failing provider and mapper tests**

Add a provider creation test:

```ts
await insertGoogleCalendarEvent({
  credential,
  externalEventId: "booking_1",
  operationKey: "booking:1:create",
  payloadFingerprint: "fingerprint",
  event: { ...event, conferenceRequestId: "booking:1:create" },
  fetchImplementation,
});
expect(request.url).toContain("conferenceDataVersion=1");
expect(request.body).toMatchObject({
  conferenceData: {
    createRequest: {
      requestId: "booking:1:create",
      conferenceSolutionKey: { type: "hangoutsMeet" },
    },
  },
});
```

Add a mapping test where only `conferenceData.entryPoints` has a video URI. Assert `mapGoogleEvent(...).link` uses that URI. Add a writer test that requests a conference but receives neither `hangoutLink` nor a video entry point; expect a failed Google operation and no local finalization.

- [ ] **Step 2: Verify the tests are red**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarProvider.test.ts convex/googleCalendar/writePayloadMatch.test.ts convex/googleCalendarWrites.test.ts`

Expected: FAIL because conference request fields, query parameters, and conference-link validation do not exist.

- [ ] **Step 3: Extend the normalized Google write input**

Add `conferenceRequestId?: string` to the validator and TypeScript type in `writeTypes.ts`. Include it in `normalizedEvent` in `writeFingerprint.ts` so an idempotent remote create has a stable distinct payload fingerprint.

In `bookingPayload.ts`, accept an optional options object and copy its request ID into the returned write input:

```ts
export function googleCalendarWriteInputFromEvent(
  event: Doc<"calendarEvents">,
  options?: { conferenceRequestId?: string },
): GoogleCalendarWriteInput {
  return { ...baseEvent, conferenceRequestId: options?.conferenceRequestId };
}
```

- [ ] **Step 4: Build conference-aware Google create requests**

In `writeProvider.ts`, add a helper that returns the normal event path or `calendars/primary/events?conferenceDataVersion=1` when `event.conferenceRequestId` exists. On enabled creates, add this exact payload:

```ts
conferenceData: {
  createRequest: {
    requestId: args.event.conferenceRequestId,
    conferenceSolutionKey: { type: "hangoutsMeet" },
  },
},
```

Keep PATCH calls and non-conference POST requests unchanged.

Extend `GoogleCalendarEvent` with optional conference entry points, and map the first `entryPointType === "video"` URI when `hangoutLink` is absent. In `writeCreateExecution.ts`, before finalization, reject a conference-enabled creation that maps to no link by returning the existing `failed` provider error result. Use this guard in normal create and recovery/reissue paths before invoking `finalizeEvent`.

- [ ] **Step 5: Run focused Google writer verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarProvider.test.ts convex/googleCalendar/writePayloadMatch.test.ts convex/googleCalendarWrites.test.ts convex/googleCalendarBookingSync.test.ts`

Expected: PASS for exact conference request data, Meet link mapping, failed missing-link conference creation, and normal non-conference writes.

- [ ] **Step 6: Commit**

```bash
git add convex/googleCalendar/writeTypes.ts convex/googleCalendar/writeFingerprint.ts convex/googleCalendar/bookingPayload.ts convex/googleCalendar/writeProvider.ts convex/googleCalendar/eventMapping.ts convex/googleCalendar/writeCreateExecution.ts convex/googleCalendarProvider.test.ts convex/googleCalendar/writePayloadMatch.test.ts convex/googleCalendarWrites.test.ts convex/googleCalendarBookingSync.test.ts
git commit -m "Create Google Meet links for remote bookings"
```

### Task 4: Generate and verify the completed feature

**Files:**

- Modify: `CONTINUITY.md`
- Modify: `docs/superpowers/plans/2026-08-15-service-location-google-meet.md`

**Interfaces:**

- Consumes: completed Tasks 1–3.
- Produces: generated Convex API types and a factual unreleased-feature verification record.

- [ ] **Step 1: Record completion without release publication**

Mark completed checkboxes. Update `CONTINUITY.md` with the service modes, optional Google Meet behavior, and focused verification outcomes. Preserve `UNCONFIRMED` production availability and do not update the release changelog.

- [ ] **Step 2: Generate Convex API types**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen`

Expected: PASS and regenerate schema-derived service fields.

- [ ] **Step 3: Run type, focused, and diff verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/serviceForm.test.ts src/components/services/serviceFormShared.test.tsx convex/appointmentBookingServices.test.ts convex/calendarManualBooking.test.ts convex/googleCalendarBookingSync.test.ts convex/googleCalendarProvider.test.ts convex/googleCalendar/writePayloadMatch.test.ts convex/googleCalendarWrites.test.ts
git diff --check
```

Expected: all commands PASS. If the full suite still reports the known unrelated Google Calendar projection or booking-sync failures, record them exactly rather than reporting a green suite.

- [ ] **Step 4: Commit verification records**

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-08-15-service-location-google-meet.md convex/_generated
git commit -m "Verify service location Google Meet"
```
