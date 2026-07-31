# Server-Owned WhatsApp Embedded Signup

## Goal

Complete WhatsApp Embedded Signup from the OAuth authorization code without requiring the browser `WA_EMBEDDED_SIGNUP` finish payload. The frontend never receives a Meta access token and does not supply a WABA ID or phone-number ID to Convex.

Each agent may have one WhatsApp number. Meta Embedded Signup is expected to authorize one WABA and one phone number for this flow. The backend enforces that expectation and rejects ambiguous Meta responses instead of choosing an arbitrary asset.

## Selected approach

The OAuth-code callback is the only browser signal required to start completion. The frontend sends the short-lived authorization code and the active connection-attempt identifier to `completeSignup`. The configured Meta application is selected from server configuration. WABA and phone-number discovery, validation, subscription, token persistence, channel creation, and synchronization all happen in Convex.

Two alternatives are rejected:

- Continuing to require the browser finish event retains the failure that left the latest attempt in `started` even though OAuth succeeded.
- Treating the browser finish event as an asset source while adding a backend fallback creates two competing sources of truth and inconsistent retry behavior.

The finish event may remain temporarily as diagnostic telemetry for cancellation and Meta error messages, but it cannot gate completion or supply authoritative asset identifiers.

## Backend flow

`completeSignup` authenticates the caller and verifies that the supplied attempt belongs to that user and remains open. It then performs these operations:

1. Exchange the authorization code for a business access token using server-held Meta application credentials.
2. Inspect the token through Meta's token-debugging endpoint and extract the unique WABA target from the `whatsapp_business_management` granular scope.
3. Fetch that WABA's phone numbers and require exactly one result.
4. Persist the discovered WABA and phone-number IDs on the connection attempt.
5. Enforce existing workspace, agent, plan, phone ownership, and already-connected guards before creating or resetting a pending channel.
6. Subscribe the Meta application to the WABA.
7. Fetch display metadata, persist the access token only on the channel, and enqueue coexistence synchronization.
8. Return `{ status: "syncing" }` to the frontend.

The pending channel is created only after successful token exchange and unambiguous asset discovery. Failures before discovery mark the attempt as `error` without manufacturing a channel whose identifiers are unknown.

## Token boundary

The browser receives only the short-lived OAuth authorization code produced by `FB.login`. The business access token exists only inside the Convex action and the encrypted Convex channel record used by server-side Meta calls.

The access token, authorization code, application secret, and token-debug request URL are never written to logs. Backend diagnostics may record step names, counts, WABA IDs, phone-number IDs, Meta error codes, and the attempt ID. The action response contains no token, channel document, WABA ID, or phone-number ID.

## Validation and errors

Asset discovery fails explicitly when:

- the token lacks a `whatsapp_business_management` target;
- Meta exposes zero or more than one WABA target;
- the selected WABA exposes zero or more than one phone number;
- the attempt does not belong to the authenticated user or is no longer open;
- the agent or workspace already has a different active WhatsApp connection;
- the selected phone number is active in another workspace;
- token exchange, subscription, metadata retrieval, persistence, or sync enqueueing fails.

The attempt stores a concise user-safe error. Secrets and raw Meta responses are excluded. The frontend displays the existing connection error state and allows a new attempt after cancellation or resolution.

## Frontend behavior

`ConnectWhatsAppButton` calls `completeSignup` as soon as `FB.login` returns an authorization code and the connection attempt is available. It no longer stores WABA or phone-number IDs in refs, waits for a finish event, calls `recordSignupFinished`, or logs those browser-supplied identifiers.

The connection dialog continues to follow the reactive connection attempt and channel state. A successful action response means backend setup completed and synchronization started; it does not expose backend records to the browser.

## Verification

Focused tests cover:

- unique WABA extraction from token granular scopes;
- rejection of missing and multiple WABA targets;
- unique phone-number extraction and rejection of zero or multiple numbers;
- `completeSignup` accepting no browser-supplied asset IDs;
- token persistence occurring only in the backend channel write;
- the public response containing only `status: "syncing"`;
- no pending channel creation before asset discovery succeeds;
- attempt ownership and existing-connection guards;
- the frontend invoking completion after the OAuth code without waiting for `FINISH`;
- cancellation and Meta error events remaining visible without becoming asset sources.

Node 22 focused tests, TypeScript, the production build, generated Convex API consistency, and whitespace checks must pass. No deployment or production data change is part of this implementation.
