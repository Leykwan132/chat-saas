# Book Appointment Service Empty State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let administrators create a service directly from a Book appointment workflow node when no active services exist.

**Architecture:** Keep the behavior in `WorkflowBookingNodeServices`, the shared rendering surface for node and inspector presentations. Its no-active-services branch will use the standard Empty primitives and an agent-scoped React Router link; loading and service-selection behavior remain unchanged.

**Tech Stack:** React 19, React Router 7, TypeScript, Tailwind CSS, Vitest, shadcn Empty and Button components.

## Global Constraints

- Run all scripts with Node v22.
- Keep the existing workflow service query, service filtering, and selection mutation unchanged.
- Render the same empty-state behavior in node and inspector presentations.
- Link to `/dashboard/${agentId}/services/new` with the label `Create service`.
- Do not add backend, availability, or manual-booking changes.

---

### Task 1: Shared workflow booking-service empty state

**Files:**
- Modify: `src/components/workflow/WorkflowBookingNodeServices.test.tsx`
- Modify: `src/components/workflow/WorkflowBookingNodeServices.tsx`

**Interfaces:**
- Consumes: `WorkflowBookingNodeServices` props `agentId`, `nodeId`, `allowedServiceIds`, `disabled`, and `presentation`.
- Produces: An `Empty` UI branch whenever `services.filter((service) => service.isActive)` is empty, with a `Create service` link for `agentId`.

- [ ] **Step 1: Write the failing test**

Add a second test that changes the mocked `useQuery` result to an inactive service and renders the inspector presentation. Assert the rendered component exposes the Empty component slot, explains that no active services are available, and contains `href="/dashboard/agent/services/new"` on a `Create service` link.

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowBookingNodeServices.test.tsx`

Expected: FAIL because the current no-active-services branch is only a plain paragraph and has no creation link.

- [ ] **Step 3: Write minimal implementation**

Import `Link` from `react-router`, `BriefcaseBusiness` from `lucide-react`, `Button`, and `Empty` primitives. Replace the no-active-services paragraph with a compact shared Empty state:

```tsx
<Empty className="mt-2 rounded-xl border bg-muted/20 px-4 py-6">
  <EmptyHeader>
    <EmptyMedia variant="icon"><BriefcaseBusiness /></EmptyMedia>
    <EmptyTitle className="text-sm">No active services</EmptyTitle>
    <EmptyDescription className="text-xs">Create a service before this workflow can book appointments.</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button asChild size="sm"><Link to={`/dashboard/${agentId}/services/new`}>Create service</Link></Button>
  </EmptyContent>
</Empty>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowBookingNodeServices.test.tsx`

Expected: PASS with both the active-service and no-active-service tests green.

- [ ] **Step 5: Verify and commit**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run test
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
git diff --check
```

Commit the component, test, plan, and continuity updates:

```bash
git add src/components/workflow/WorkflowBookingNodeServices.tsx src/components/workflow/WorkflowBookingNodeServices.test.tsx docs/superpowers/plans/2026-08-15-book-appointment-service-empty-state.md CONTINUITY.md
git commit -m "Add booking service empty state"
```
