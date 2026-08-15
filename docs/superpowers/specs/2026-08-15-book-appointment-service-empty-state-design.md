# Book appointment service empty state

## Goal

Guide an agent administrator to create a service when a Book appointment workflow node has no active services to select.

## Design

`WorkflowBookingNodeServices` remains the single service-selection surface for both node and inspector presentations. When its loaded service list contains no active services, it renders the shared `Empty` component in place of the plain availability message.

The empty state contains a service icon, the title “No active services”, a concise explanation that a service is required before the workflow can book appointments, and a `Create service` button. The button links to `/dashboard/:agentId/services/new` for the current agent.

The existing loading state and active-service switches are unchanged. No backend, selection, availability, or manual-booking behavior changes.

## Verification

Extend the shared component test with an empty active-service result. Assert the reusable empty-state structure, user guidance, and agent-scoped creation link. Run the focused test, the project test suite, build, and diff check before opening the PR.
