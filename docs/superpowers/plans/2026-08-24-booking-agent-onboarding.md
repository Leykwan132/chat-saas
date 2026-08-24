# Booking Agent Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users configure weekday availability and optionally create a self-assigned appointment-booking service while creating a Book a Service agent.

**Architecture:** Extend the React wizard with booking-only availability and service steps while retaining one atomic Convex creation mutation. Extract defaults, initial service creation, and initial booking-node setup into small helpers so schedule, service, and workflow behavior remain independently testable.

**Tech Stack:** React 19, TypeScript, shadcn UI, Vitest, Convex, convex-test.

**Spec:** docs/superpowers/specs/2026-08-24-booking-agent-onboarding-design.md

## Global Constraints

- Use Node.js 22 for every test, build, code-generation, and script command.
- Read convex/_generated/ai/guidelines.md before modifying Convex code.
- Code files stay below 300 lines and contain no comments unless unavoidable.
- Reuse WeeklyAvailabilityEditor; do not build a second availability table.
- All newly provisioned schedules default to Monday–Friday, 9:00am–5:00pm.
- Support creation retains Identity → Goal → Create Agent.
- Service skip creates the agent and selected availability directly, without a service or booking action.
- This is unreleased customer-facing work: record it in CONTINUITY.md, not the production changelog.

---

### Task 1: Centralize schedule defaults and preserve creator-only services

**Files:**
- Create: shared/availabilityDefaults.ts
- Modify: src/lib/scheduleUtils.ts
- Modify: src/lib/scheduleShiftDrafts.ts
- Modify: convex/leadRouting/schedules.ts
- Modify: convex/appointmentBooking/serviceAssignments.ts
- Test: src/lib/scheduleShiftDrafts.test.ts
- Test: convex/workosWebhookAvailability.test.ts

**Interfaces:**
- Produce DEFAULT_AVAILABILITY_SHIFTS: five shift objects for dayOfWeek 1 through 5, 540 through 1020 minutes.
- Produce isServiceAutoAssignableToNewMembers({ autoAssignNewMembers?: boolean }): boolean.
- Consume these defaults in schedule drafts and ensureUserScheduleForAgent.

- [ ] **Step 1: Write failing default and invitation tests**

    expect(createStandardShiftDrafts().map(({ dayOfWeek }) => dayOfWeek)).toEqual([1, 2, 3, 4, 5]);

    expect(await shiftsForNewlyInvitedMember(t, agentId)).toEqual([
      { dayOfWeek: 1, startMinutes: 540, endMinutes: 1020 },
      { dayOfWeek: 2, startMinutes: 540, endMinutes: 1020 },
      { dayOfWeek: 3, startMinutes: 540, endMinutes: 1020 },
      { dayOfWeek: 4, startMinutes: 540, endMinutes: 1020 },
      { dayOfWeek: 5, startMinutes: 540, endMinutes: 1020 },
    ]);

- [ ] **Step 2: Verify the tests fail**

Run: source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/scheduleShiftDrafts.test.ts convex/workosWebhookAvailability.test.ts

Expected: FAIL because all seven days are currently defaults and explicit service assignments grow when a member joins.

- [ ] **Step 3: Implement defaults and opt-out assignment**

    export const DEFAULT_AVAILABILITY_SHIFTS = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      startMinutes: 9 * 60,
      endMinutes: 17 * 60,
    }));

    export function isServiceAutoAssignableToNewMembers(service: {
      autoAssignNewMembers?: boolean;
    }) {
      return service.autoAssignNewMembers !== false;
    }

Use the shared default in browser draft creation and backend schedule provisioning. Interpret missing legacy autoAssignNewMembers as true, and skip only explicit false services while appending newly invited team members.

- [ ] **Step 4: Verify the tests pass**

Run: source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/scheduleShiftDrafts.test.ts convex/workosWebhookAvailability.test.ts

Expected: PASS.

- [ ] **Step 5: Commit**

    git add shared/availabilityDefaults.ts src/lib/scheduleUtils.ts src/lib/scheduleShiftDrafts.ts convex/leadRouting/schedules.ts convex/appointmentBooking/serviceAssignments.ts src/lib/scheduleShiftDrafts.test.ts convex/workosWebhookAvailability.test.ts
    git commit -m "Default availability to weekday business hours"

### Task 2: Atomically create optional booking resources

**Files:**
- Create: convex/agentBookingOnboarding.ts
- Create: convex/appointmentBooking/initialService.ts
- Create: convex/workflowInitialBookingAction.ts
- Modify: convex/agents.ts
- Modify: convex/schema.ts
- Modify: convex/leadRouting/schedules.ts
- Test: convex/agentCreation.test.ts

**Interfaces:**
- Produce applyAgentBookingOnboarding(ctx, { agent, creatorWorkosUserId, availability, service }).
- availability is { timezone: string; shifts: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }> }.
- service is optional { name: string; durationMinutes: number; appointmentBookingEnabled: boolean }.
- Extend agents.create with optional bookingOnboarding while preserving its Id<'agents'> result.

- [ ] **Step 1: Write failing atomic creation tests**

    const agentId = await authed.mutation(api.agents.create, {
      name: "Booking Assistant",
      businessName: "Glow Studio",
      businessDescription: "Beauty appointments",
      goal: "bookService",
      bookingOnboarding: {
        availability: { timezone: "Asia/Kuala_Lumpur", shifts: weekdayShifts },
        service: {
          name: "Consultation",
          durationMinutes: 45,
          appointmentBookingEnabled: true,
        },
      },
    });

    expect(service.assignedWorkosUserIds).toEqual(["booking-agent-owner"]);
    expect(service.autoAssignNewMembers).toBe(false);
    expect(bookAppointmentNode?.allowedAppointmentServiceIds).toEqual([service._id]);
    expect(bookAppointmentNode?.isReady).toBe(true);

Add a second case without service and assert selected shifts exist but no service or Book appointment node. Add a rejection case for bookingOnboarding on support.

- [ ] **Step 2: Verify failure**

Run: source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/agentCreation.test.ts

Expected: FAIL because agents.create does not yet accept bookingOnboarding.

- [ ] **Step 3: Implement transactional helpers**

    await applyAgentBookingOnboarding(ctx, {
      agent,
      creatorWorkosUserId: userId,
      availability: args.bookingOnboarding?.availability,
      service: args.bookingOnboarding?.service,
    });

Ensure the creator schedule, replace its default shifts with selected shifts, create an active service assigned to [creatorWorkosUserId] with autoAssignNewMembers false, and add a Book appointment node only when the switch is true. Attach the default booking condition to the start edge, limit allowedAppointmentServiceIds to the new service, then refresh workflow node readiness. Generic service creation continues to default autoAssignNewMembers to true.

- [ ] **Step 4: Verify pass**

Run: source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/agentCreation.test.ts convex/workosWebhookAvailability.test.ts

Expected: PASS.

- [ ] **Step 5: Commit**

    git add convex/agentBookingOnboarding.ts convex/appointmentBooking/initialService.ts convex/workflowInitialBookingAction.ts convex/agents.ts convex/schema.ts convex/leadRouting/schedules.ts convex/agentCreation.test.ts
    git commit -m "Add booking setup to agent creation"

### Task 3: Add booking-specific wizard steps

**Files:**
- Create: src/components/create-agent/CreateAgentAvailabilityStep.tsx
- Create: src/components/create-agent/CreateAgentServiceStep.tsx
- Modify: src/components/create-agent/CreateAgentWizard.tsx
- Modify: src/components/create-agent/CreateAgentGoalStep.tsx
- Modify: src/components/create-agent/CreateAgentVisualPanel.tsx
- Modify: src/components/create-agent/createAgentWizardModel.ts
- Test: src/components/create-agent/CreateAgentSteps.test.tsx
- Test: src/components/create-agent/createAgentWizardModel.test.ts

**Interfaces:**
- CreateAgentAvailabilityStep consumes weekly shift drafts, timezone, and navigation callbacks.
- CreateAgentServiceStep consumes service name, duration, booking toggle, Create Agent, Skip for now, and Back callbacks.
- BookingOnboardingDraft is consumed by buildCreateAgentRequest.

- [ ] **Step 1: Write failing render and model tests**

    expect(markup).toContain("Set your availability");
    expect(markup).toContain("Create a service");
    expect(markup).toContain("Enable appointment booking");
    expect(markup).toContain("Skip for now");
    expect(markup).toContain("Create Agent");

    expect(buildCreateAgentRequest({
      ...baseInput,
      goal: "bookService",
      bookingOnboarding,
    })).toMatchObject({
      bookingOnboarding: {
        availability: { shifts: weekdayShifts },
        service: { appointmentBookingEnabled: true },
      },
    });

Test Goal → Availability → Service, both Back transitions, support Goal → Creating, and service Skip for now passing selected availability but no service.

- [ ] **Step 2: Verify failure**

Run: source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/create-agent/CreateAgentSteps.test.tsx src/components/create-agent/createAgentWizardModel.test.ts

Expected: FAIL because the wizard has only identity and goal steps.

- [ ] **Step 3: Implement the UI branch**

    {status.step === "availability" ? (
      <CreateAgentAvailabilityStep
        shiftDrafts={shiftDrafts}
        timezone={timezone}
        onContinue={() => dispatch({ type: "showService" })}
        onBack={() => dispatch({ type: "showGoal" })}
      />
    ) : null}

Reuse WeeklyAvailabilityEditor with weekday defaults. Show Create Agent as the service-submit label, keep Enable appointment booking on by default, require a non-empty service name for that action, and make Skip for now submit availability without a service. Preserve direct support creation and extend the terminal panel for availability and service stages.

- [ ] **Step 4: Verify pass**

Run: source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/create-agent/CreateAgentSteps.test.tsx src/components/create-agent/createAgentWizardModel.test.ts src/components/create-agent/createAgentSubmission.test.ts

Expected: PASS.

- [ ] **Step 5: Commit**

    git add src/components/create-agent/CreateAgentAvailabilityStep.tsx src/components/create-agent/CreateAgentServiceStep.tsx src/components/create-agent/CreateAgentWizard.tsx src/components/create-agent/CreateAgentGoalStep.tsx src/components/create-agent/CreateAgentVisualPanel.tsx src/components/create-agent/createAgentWizardModel.ts src/components/create-agent/CreateAgentSteps.test.tsx src/components/create-agent/createAgentWizardModel.test.ts
    git commit -m "Guide booking agents through setup"

### Task 4: Verify and record the unreleased change

**Files:**
- Modify: CONTINUITY.md
- Test: convex/agentCreation.test.ts
- Test: convex/workosWebhookAvailability.test.ts
- Test: src/lib/scheduleShiftDrafts.test.ts
- Test: src/components/create-agent/CreateAgentSteps.test.tsx
- Test: src/components/create-agent/createAgentWizardModel.test.ts

**Interfaces:**
- Consume the API and wizard interfaces from Tasks 1 through 3.
- Produce a verification receipt in CONTINUITY.md; do not publish a changelog entry.

- [ ] **Step 1: Run focused regression coverage**

Run: source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/agentCreation.test.ts convex/workosWebhookAvailability.test.ts src/lib/scheduleShiftDrafts.test.ts src/components/create-agent/CreateAgentSteps.test.tsx src/components/create-agent/createAgentWizardModel.test.ts src/components/create-agent/createAgentSubmission.test.ts

Expected: PASS.

- [ ] **Step 2: Run production checks**

Run: source ~/.nvm/nvm.sh && nvm use 22 && bun run lint && bun run build

Expected: PASS. Run wc -l on every changed code file; each must be at or below 300 lines.

- [ ] **Step 3: Update continuity and inspect the final diff**

    - 2026-08-24 [TOOL] Booking-agent onboarding focused creation, invitation, schedule, and wizard tests pass; lint/build and code-file line caps pass. The customer-facing changelog remains deferred until production availability is confirmed.

Run: git diff --check && git status --short

Expected: no whitespace errors and only intended files changed.

- [ ] **Step 4: Commit verification metadata**

    git add CONTINUITY.md
    git commit -m "Record booking onboarding verification"

