# Booking Node Services Design

## Goal

Let workflow builders see and immediately control the services a Book appointment node can offer, together with the teammates assigned to each service.

## Node Experience

- Standard Book appointment nodes show a Services section beneath their existing summary.
- Each row shows only the service name, an assigned-teammate count, and an on/off switch. Service descriptions do not render in the node.
- The count uses `1 teammate available` or `{n} teammates available` and its hover tooltip lists those teammates by name.
- In this context, “available” means a current teammate assigned to that service. The node does not claim a date-specific free slot because a booking time has not been selected yet.
- Only active, unarchived services appear. The empty state says that no active services are available.
- Compact and preview nodes remain unchanged.

## Direct Editing

- A switch controls whether its service is allowed by that individual Book appointment node.
- Switching saves immediately through the existing booking-service workflow mutation.
- While a save is in flight, the affected direct controls are disabled. Mutation failures restore the subscribed state and show an error toast.
- The service controls stop canvas pointer and click propagation, so a user can toggle a service without dragging or selecting the node.
- The node inspector no longer renders a second service selector or sends service IDs on Apply. It continues to edit the node title and condition without overwriting direct changes.

## Data

- The existing authorized booking-services query provides the names of every teammate assigned to each service.
- Legacy services without explicit teammate assignments treat every current teammate as assigned, matching booking behavior during the assignment migration.
- The node receives its allowed service IDs, workflow node ID, and agent ID so it can render the current selection and persist each switch independently.

## Verification

- Add query coverage for assigned teammate names and legacy all-teammate behavior.
- Add node and flow-model coverage for direct booking-service rows, tooltip content, selection state, and direct mutation wiring.
- Run focused tests, TypeScript validation, `git diff --check`, and the full test suite with Node v22.
